import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Which voice says the child's words.
 *
 * A German family wrote in after 2.0: they had spelled every card phonetically
 * so a German voice would pronounce their child's names correctly, and the
 * update made every card read in English instead.
 *
 * The cause was a fix. Before 2.0 the Android plugin was handed `lang`, an
 * option it does not have, so it ignored the app entirely and fell back to the
 * device locale — German, on their phone. Passing the correct `language` key
 * made the app's own setting win, and the app's setting is the *interface*
 * language, which has no German.
 *
 * So speech must be settable apart from the interface. The interface exists in
 * four languages; the voices on a device do not stop there, and a family should
 * not have to wait for a translation to hear their child's name said properly.
 */

type SpeakArgs = { text: string; language?: string; rate?: number; pitch?: number };
const speak = vi.fn(async (_opts: SpeakArgs) => undefined);
const stop = vi.fn(async () => undefined);

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android', convertFileSrc: (p: string) => p },
}));
vi.mock('@capgo/capacitor-speech-synthesis', () => ({
  SpeechSynthesis: { speak: (opts: SpeakArgs) => speak(opts), stop: () => stop() },
}));

const loadVoice = async () => (await import('../services/voice')).voiceService;
const tagPassed = () => speak.mock.calls.at(-1)?.[0]?.language;

describe('the voice that speaks a card', () => {
  beforeEach(() => { vi.resetModules(); speak.mockClear(); stop.mockClear(); });

  it('follows the interface language when the parent has not chosen one', async () => {
    const voice = await loadVoice();
    await voice.speak({ text: 'apple', language: 'en' });
    expect(tagPassed()).toBe('en-US');
  });

  it('uses the parent’s chosen voice over the interface language', async () => {
    const voice = await loadVoice();
    // The interface is English; the family needs the words said in German.
    await voice.speak({ text: 'Mäuschen', language: 'en', voiceLang: 'de-DE' });
    expect(tagPassed(), 'the German family’s names were read in English').toBe('de-DE');
  });

  it('works for a language the interface does not have at all', async () => {
    const voice = await loadVoice();
    // Kazakh has no interface translation; a device voice is enough to speak it.
    await voice.speak({ text: 'су', language: 'ru', voiceLang: 'kk-KZ' });
    expect(tagPassed()).toBe('kk-KZ');
  });

  it('ignores an empty choice rather than passing a blank tag to the engine', async () => {
    const voice = await loadVoice();
    await voice.speak({ text: 'apple', language: 'fr', voiceLang: '   ' });
    expect(tagPassed()).toBe('fr-FR');
  });

  it('still honours the interface language for the other three', async () => {
    const voice = await loadVoice();
    for (const [lang, tag] of [['ru', 'ru-RU'], ['fr', 'fr-FR'], ['es', 'es-ES']] as const) {
      await voice.speak({ text: 'x', language: lang });
      expect(tagPassed()).toBe(tag);
    }
  });
});
