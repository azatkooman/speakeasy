// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { act } from 'react';
import { render } from '@testing-library/react';
import { resetIndexedDB } from './setup-idb';
import { installMemoryStorage } from './memory-storage';

/**
 * Settings must never land on the wrong child.
 *
 * Persisting settings is debounced, because range controls fire on every pixel
 * of a drag. That debounce means a write can still be in flight when the carer
 * switches profile — and a switch is exactly when it must not fire blind.
 *
 * The bug these tests exist for: the profile-load paths called React's raw
 * state setter, so the ref the flush reads kept the previous child's values.
 * Switching profile mid-drag then wrote child A's voice speed, dwell time and
 * access method into child B's profile. On a shared tablet that silently
 * reconfigures a second child's communication device.
 */

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false, convertFileSrc: (p: string) => p },
}));
vi.mock('@capacitor/filesystem', () => ({
  Filesystem: { writeFile: vi.fn(), deleteFile: vi.fn(), readFile: vi.fn(), mkdir: vi.fn() },
  Directory: { Data: 'DATA' },
  Encoding: { UTF8: 'utf8' },
}));
vi.mock('@capacitor/haptics', () => ({ Haptics: { impact: vi.fn() }, ImpactStyle: { Heavy: 'H', Light: 'L' } }));
vi.mock('@capgo/capacitor-speech-synthesis', () => ({ SpeechSynthesis: { speak: vi.fn(), stop: vi.fn() } }));

const settingsOf = async (storage: any, id: string) =>
  (await storage.getAllProfiles()).find((p: any) => p.id === id)?.settings;

describe('settings writes follow the profile they belong to', () => {
  beforeEach(async () => { await resetIndexedDB(); vi.resetModules(); installMemoryStorage(); });

  /** Mount the provider and expose its context value for direct driving. */
  const mountApp = async () => {
    const ctx = await import('../contexts/SpeakEasyContext');
    const storage = await import('../services/storage');
    let api: any = null;
    const Probe = () => { api = ctx.useSpeakEasy(); return null; };
    await act(async () => {
      render(React.createElement(ctx.SpeakEasyProvider, null, React.createElement(Probe)));
    });
    return { get: () => api, storage, delay: ctx.SETTINGS_FLUSH_DELAY_MS };
  };

  it('does not write one child’s settings into another’s profile on switch', async () => {
    const { get, storage, delay } = await mountApp();

    await act(async () => { await get().createProfile('Ada', 6, 'blue'); });
    const ada = get().currentProfileId;
    await act(async () => { await get().createProfile('Bo', 9, 'pink'); });
    const bo = get().currentProfileId;

    // Back to Ada, then change something — leaving a write in the debounce.
    await act(async () => { await get().switchProfile(ada); });
    await act(async () => { get().setSettings((p: any) => ({ ...p, voiceRate: 0.5, dwellMs: 1234 })); });

    // Switch before the debounce elapses. This is the race.
    await act(async () => { await get().switchProfile(bo); });
    await act(async () => { await new Promise(r => setTimeout(r, delay * 3)); });

    const adaSettings = await settingsOf(storage, ada);
    const boSettings = await settingsOf(storage, bo);

    // Ada keeps what was set for her: the pending write was flushed to her on
    // the way out, rather than abandoned or misdirected.
    expect(adaSettings?.voiceRate).toBe(0.5);
    expect(adaSettings?.dwellMs).toBe(1234);

    // Bo is untouched.
    expect(boSettings?.voiceRate).not.toBe(0.5);
    expect(boSettings?.dwellMs).not.toBe(1234);
  });

  it('keeps the ref in step so a later change writes to the current child', async () => {
    const { get, storage, delay } = await mountApp();

    await act(async () => { await get().createProfile('Ada', 6, 'blue'); });
    const ada = get().currentProfileId;
    await act(async () => { await get().createProfile('Bo', 9, 'pink'); });
    const bo = get().currentProfileId;

    await act(async () => { await get().switchProfile(ada); });
    await act(async () => { await get().switchProfile(bo); });

    // A change made after switching must be written against Bo, using Bo's
    // settings as the base — not a stale snapshot of Ada's.
    await act(async () => { get().setSettings((p: any) => ({ ...p, voiceRate: 1.4 })); });
    await act(async () => { await new Promise(r => setTimeout(r, delay * 3)); });

    expect((await settingsOf(storage, bo))?.voiceRate).toBe(1.4);
    expect((await settingsOf(storage, ada))?.voiceRate).not.toBe(1.4);
  });

  it('does not recreate a profile that was deleted while a write was pending', async () => {
    const { get, storage, delay } = await mountApp();

    await act(async () => { await get().createProfile('Ada', 6, 'blue'); });
    const ada = get().currentProfileId;
    await act(async () => { await get().createProfile('Bo', 9, 'pink'); });

    await act(async () => { await get().switchProfile(ada); });
    await act(async () => { get().setSettings((p: any) => ({ ...p, voiceRate: 0.7 })); });

    // Delete Ada with her write still in the debounce. The flush calls
    // saveProfile, which is a put — so an uncancelled write would resurrect the
    // profile the carer just removed.
    await act(async () => { await get().removeProfile(ada); });
    await act(async () => { await new Promise(r => setTimeout(r, delay * 3)); });

    const ids = (await storage.getAllProfiles()).map((p: any) => p.id);
    expect(ids).not.toContain(ada);
  });

  /**
   * Creating a profile is a profile *switch* as much as switchProfile is: it
   * points the app at a different child and adopts that child's settings.
   * switchProfile flushes the pending write first, for the reason above.
   * createProfile did not, so a setting changed in the moment before adding a
   * sibling was overwritten in memory by the new child's defaults and never
   * reached the outgoing child's profile.
   *
   * A carer setting up a second child on a shared tablet is doing exactly this:
   * adjust something, then add the sibling.
   */
  it('does not lose the outgoing child’s setting when a profile is created mid-debounce', async () => {
    const { get, storage, delay } = await mountApp();

    await act(async () => { await get().createProfile('Ada', 6, 'blue'); });
    const ada = get().currentProfileId;

    // Nudge Ada's voice speed, leaving a write inside the debounce window...
    await act(async () => { get().setSettings((prev: any) => ({ ...prev, voiceRate: 1.4 })); });
    // ...then add a sibling before it has flushed.
    await act(async () => { await get().createProfile('Bo', 9, 'pink'); });
    const bo = get().currentProfileId;

    await act(async () => { await new Promise(r => setTimeout(r, delay * 3)); });

    expect(ada).not.toBe(bo);
    expect((await settingsOf(storage, ada))?.voiceRate, "Ada's change was dropped").toBe(1.4);
    expect((await settingsOf(storage, bo))?.voiceRate, "Ada's change leaked to Bo").toBe(0.9);
  });

  /**
   * Editing name/age/colour comes from a form that carries no settings, so it
   * reads them back off the stored record. A write still in the debounce makes
   * that record stale, and whichever save lands second wins — so either the
   * setting or the rename is lost.
   */
  it('keeps both the rename and a pending setting when a profile is edited mid-debounce', async () => {
    const { get, storage, delay } = await mountApp();

    await act(async () => { await get().createProfile('Ada', 6, 'blue'); });
    const ada = get().currentProfileId;

    await act(async () => { get().setSettings((prev: any) => ({ ...prev, voiceRate: 1.4 })); });
    await act(async () => {
      const p = (await storage.getAllProfiles()).find((x: any) => x.id === ada);
      await get().updateProfile({ ...p, name: 'Ada B' });
    });
    await act(async () => { await new Promise(r => setTimeout(r, delay * 3)); });

    const stored = (await storage.getAllProfiles()).find((p: any) => p.id === ada);
    expect(stored?.name, 'the rename was reverted').toBe('Ada B');
    expect(stored?.settings?.voiceRate, 'the pending setting was dropped').toBe(1.4);
  });
});
