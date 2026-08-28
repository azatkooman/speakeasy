/**
 * Getting a backup file out of the app, and back in.
 *
 * The web case is simple: a Blob and a download. The native case is the one
 * that matters — a family replacing a tablet — and it needs a share sheet to
 * put the file somewhere off the device. That is @capacitor/share, which is not
 * in the project yet, so `saveTextFile` reports honestly that it cannot deliver
 * rather than writing the file to an app-private directory the parent has no
 * way to reach and calling it a success.
 */
import { Capacitor } from '@capacitor/core';

const isNative = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform
  ? Capacitor.isNativePlatform()
  : false;

export class TransferUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransferUnavailableError';
  }
}

/** True when this platform can actually hand a file to the person using it. */
export const canSaveFile = (): boolean => !isNative;

export const saveTextFile = async (filename: string, text: string, mime = 'application/json') => {
  if (isNative) {
    /*
     * Deliberately not writing to Directory.Documents: on Android that resolves
     * inside Android/data/<package>, which the file manager will not open on
     * Android 11 and later. A backup the parent cannot find is not a backup.
     */
    throw new TransferUnavailableError(
      'Saving a backup from the app needs the share sheet, which is not built into this version yet.',
    );
  }

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
};

/** Read a file the parent picked. Rejects a file too large to be one of ours. */
export const readTextFile = async (file: File, maxBytes = 128 * 1024 * 1024): Promise<string> => {
  if (file.size > maxBytes) {
    throw new TransferUnavailableError('That file is too large to be a SpeakEasy backup.');
  }
  return await file.text();
};
