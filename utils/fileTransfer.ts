/**
 * Getting a backup file out of the app, and back in.
 *
 * On the web this is a Blob and a download. On a device it is the system share
 * sheet, which is the only route that actually puts the file somewhere the
 * family still has after the tablet is gone — Drive, email to themselves, a
 * messaging app. Writing to Directory.Documents was considered and rejected: on
 * Android 11 and later that resolves inside Android/data/<package>, which the
 * file manager will not open, so the backup would exist and be unreachable.
 *
 * The file is staged in Directory.Cache because the share sheet only needs it
 * for as long as the receiving app takes to copy it, and the OS reclaims cache
 * on its own. Deleting it ourselves straight after sharing would race apps that
 * read the URI lazily.
 */
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const isNative = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform
  ? Capacitor.isNativePlatform()
  : false;

export class TransferUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransferUnavailableError';
  }
}

/** Raised when the person dismissed the share sheet. Not a failure. */
export class TransferCancelledError extends Error {
  constructor() {
    super('cancelled');
    this.name = 'TransferCancelledError';
  }
}

export const canSaveFile = (): boolean => true;

/**
 * Base64 for the UTF-8 bytes of `text`, which is what Filesystem.writeFile
 * wants. Exported because it is the one piece here that silently corrupts
 * everything if it is wrong: btoa() throws on any character above U+00FF, so a
 * board with Russian labels would fail outright, and a naive spread over a
 * multi-megabyte array overflows the call stack on a board full of photos.
 */
export const encodeUtf8Base64 = (text: string): string => {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  // Chunked: a single spread of a multi-megabyte array overflows the call stack.
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
};

const isCancellation = (e: unknown): boolean => {
  const m = (e instanceof Error ? e.message : String(e)).toLowerCase();
  return m.includes('cancel') || m.includes('abort') || m.includes('dismiss');
};

export const saveTextFile = async (filename: string, text: string, mime = 'application/json') => {
  if (!isNative) {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      // Give the browser a moment to start the download before revoking.
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    }
    return;
  }

  let uri: string;
  try {
    const written = await Filesystem.writeFile({
      path: filename,
      data: encodeUtf8Base64(text),
      directory: Directory.Cache,
      recursive: true,
    });
    uri = written.uri;
  } catch (e) {
    throw new TransferUnavailableError(
      `Could not prepare the backup file: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  try {
    await Share.share({
      title: filename,
      // `files` is what makes this an attachment rather than a link. Android
      // serves it through Capacitor's FileProvider.
      files: [uri],
      dialogTitle: filename,
    });
  } catch (e) {
    if (isCancellation(e)) throw new TransferCancelledError();
    throw new TransferUnavailableError(
      `Could not share the backup: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
};

/** Read a file the parent picked. Rejects a file too large to be one of ours. */
export const readTextFile = async (file: File, maxBytes = 128 * 1024 * 1024): Promise<string> => {
  if (file.size > maxBytes) {
    throw new TransferUnavailableError('That file is too large to be a SpeakEasy backup.');
  }
  return await file.text();
};
