/**
 * Resolves every starter-vocabulary word to an ARASAAC pictogram and bundles it.
 *
 * Run: node scripts/fetch-pictograms.mjs           # report only, writes nothing
 *      node scripts/fetch-pictograms.mjs --apply   # write the map and download
 *      node scripts/fetch-pictograms.mjs --only=park,water
 *      node scripts/fetch-pictograms.mjs --no-overrides   # re-check hand-picks
 *
 * Symbols are bundled rather than fetched at runtime because offline operation
 * is a hard requirement — a communication device that needs a network to draw a
 * word is not a communication device. ARASAAC pictograms are CC BY-NC-SA;
 * attribution lives in public/pictograms/ATTRIBUTION.txt.
 *
 * ── Why this searches four languages instead of one ───────────────────────────
 *
 * The park card shipped in 2.0 with ARASAAC 5379. Its English keyword is
 * exactly "park", so the search picked it and the keyword-overlap guard below
 * saw nothing wrong — the keyword genuinely matches. But the drawing is a car
 * reversing into a parking space. English is full of noun/verb homonyms and no
 * amount of keyword checking can see the difference, because the keyword is
 * correct; it is the *sense* that is wrong.
 *
 * Every card already carries four labels that name the same concept, and that
 * redundancy is the signal we were throwing away. Searching all four:
 *
 *   en "park"    -> 5379 24755 26296 30979 ...   (5379 first)
 *   ru "парк"    -> 2859 30609 38655 ...         (2859 first)
 *   fr "parc"    -> 2859 2434 6283 ...           (2859 first)
 *   es "parque"  -> 2859 36145 36077 ...         (2859 first)
 *
 * 5379 appears in one language. 2859 leads three. Note also that 2859 never
 * appears in the English results at all — its English label is "playground" —
 * so an English-only search could not have found the right symbol however well
 * it was guarded.
 *
 * A pictogram id is therefore chosen by how many languages agree on it, and
 * ties are broken by how highly each language ranked it. One language alone is
 * not enough to ship: that is exactly the case that produced the park bug.
 *
 * ── Why not the Global Symbols API ────────────────────────────────────────────
 *
 * It searches in-language too, and it usefully exposes part_of_speech (it marks
 * the parking symbol a verb). But it returns its own picto ids and re-hosted
 * images, not ARASAAC ids. Bundled files are named by ARASAAC id, and every
 * board already seeded writes /pictograms/<arasaac-id>.png into IndexedDB for
 * the life of the profile. Switching identifiers would orphan those. ARASAAC's
 * own API supports per-language search, which gets the same disambiguation with
 * the ids we are already committed to, and keeps the app's single documented
 * network call pointed at the same host.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';

const API = 'https://api.arasaac.org/api/pictograms';
const IMG = 'https://static.arasaac.org/pictograms';
const OUT = 'public/pictograms';

const LANGS = ['en', 'ru', 'fr', 'es'];

/** A pictogram needs this many languages agreeing before it can be shipped. */
const MIN_AGREEMENT = 2;

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
/* Re-check a hand-picked id against what the search would choose now. Useful
 * for confirming an override is still needed, and for proving one was right. */
const NO_OVERRIDES = args.includes('--no-overrides');
const ONLY = (args.find(a => a.startsWith('--only=')) || '').replace('--only=', '')
  .split(',').filter(Boolean);

/*
 * Where a label is a poor search query, say what to search for instead. Keyed by
 * entry id, then language; a missing language falls back to the label itself.
 * Phrases ("Я хочу", "Je veux") rarely match anything, which is harmless — a
 * language that returns nothing simply does not get a vote.
 */
const QUERY_OVERRIDES = {
  i_want:    { en: 'want' },
  like:      { en: 'like' },
  dont_like: { en: 'not like' },
  finished:  { en: 'finished' },
  hurt:      { en: 'pain' },
  what:      { en: 'what' },
  love_you:  { en: 'love' },
  my_turn:   { en: 'my turn' },
  your_turn: { en: 'your turn' },
  tv:        { en: 'television' },
  mum:       { en: 'mother' },
  dad:       { en: 'father' },
  i:         { en: 'I' },
  we:        { en: 'we' },
  biscuit:   { en: 'cookie' },
  shop:      { en: 'shop' },
  toilet:    { en: 'toilet' },
  ice_cream: { en: 'ice cream' },
  morning:   { en: 'morning', es: 'mañana' },
};

/*
 * Hand-picked ids, for words no search resolves well. Each was checked by
 * looking at the image, not at its keywords — the park bug is what happens when
 * you trust keywords.
 */
const PICTOGRAM_OVERRIDES = {
  dont_like: 37825,   // "dislike, I do not like that" — pairs with like: 37826
  your_turn: 6006,    // plain "turn"; ARASAAC has "my turn" but no "your turn"
  later:     13080,   // "after, then, later on, later"
  after:      7818,   // plain "after", so it is not the same picture as later
  hurt:      30620,   // "hurt, suffer, ache, pain" beats the bare "pain" symbol
  love_you:  11519,   // "love"
  little:     4716,   // "small, tiny, little" — the search returned "short", a different idea
  park:       2859,   // "playground, playpark". Kept as an override as well as
                      // being what the four-language search now picks, so the
                      // regression is pinned even if ARASAAC re-ranks.
};

/**
 * Splits the arguments of one `e(...)` call, respecting quotes. The labels are
 * single- or double-quoted depending on whether they contain an apostrophe
 * ("I don't like", "J'aime"), so a per-argument regex is not enough.
 */
const splitArgs = (s) => {
  const out = [];
  let cur = '', quote = null, depth = 0;
  for (const c of s) {
    if (quote) {
      if (c === quote) { quote = null; } else { cur += c; }
      continue;
    }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c === '(' || c === '[' || c === '{') depth++;
    if (c === ')' || c === ']' || c === '}') depth--;
    if (c === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  out.push(cur.trim());
  return out;
};

const src = readFileSync('utils/starterVocabulary.ts', 'utf8');
const entries = [];
for (const m of src.matchAll(/\be\(([^;]*?)\)(?:,|\s*\n)/g)) {
  const a = splitArgs(m[1]);
  if (a.length < 6) continue;
  const [id, arasaac, en, ru, fr, es] = a;
  if (!/^[a-z_]+$/.test(id) || !/^\d+$/.test(arasaac)) continue;
  entries.push({ id, oldArasaac: Number(arasaac), labels: { en, ru, fr, es } });
}
if (entries.length === 0) {
  console.error('parsed no vocabulary entries — the e(...) shape must have changed');
  process.exit(1);
}
console.log(`parsed ${entries.length} vocabulary entries`);

const targets = ONLY.length ? entries.filter(e => ONLY.includes(e.id)) : entries;
if (ONLY.length && targets.length !== ONLY.length) {
  console.error(`--only named ${ONLY.length} ids but matched ${targets.length}`);
}

/** English labels carry a leading pronoun the search does better without. */
const clean = (s, lang) =>
  (lang === 'en' ? s.replace(/^(I |it )/i, '') : s).replace(/[?¿]/g, '').trim();

const searchOne = async (lang, query) => {
  const res = await fetch(`${API}/${lang}/search/${encodeURIComponent(query)}`);
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`${lang} search ${res.status}`);
  const hits = await res.json();
  return Array.isArray(hits) ? hits : [];
};

const resolveEntry = async (entry) => {
  const queries = {};
  for (const lang of LANGS) {
    queries[lang] = QUERY_OVERRIDES[entry.id]?.[lang] ?? clean(entry.labels[lang], lang);
  }

  const perLang = await Promise.all(LANGS.map(async (lang) => {
    try {
      return { lang, hits: await searchOne(lang, queries[lang]) };
    } catch {
      return { lang, hits: [], failed: true };
    }
  }));

  /*
   * Score every candidate by which languages returned it and how highly. The
   * language count decides; the rank sum only breaks ties, so a symbol ranked
   * first in one language cannot outvote one that three languages agree on.
   */
  const candidates = new Map();
  const ranksByLang = {};
  for (const { lang, hits } of perLang) {
    ranksByLang[lang] = hits.length;
    hits.forEach((h, rank) => {
      const c = candidates.get(h._id) ?? { id: h._id, langs: new Set(), rankScore: 0, keywords: [] };
      c.langs.add(lang);
      c.rankScore += 1 / (1 + rank);
      if (lang === 'en' && c.keywords.length === 0) {
        c.keywords = (h.keywords || []).map(k => k.keyword).filter(Boolean);
      }
      candidates.set(h._id, c);
    });
  }

  const ranked = [...candidates.values()].sort((a, b) =>
    b.langs.size - a.langs.size || b.rankScore - a.rankScore);

  const best = ranked[0];
  const languagesWithResults = perLang.filter(p => p.hits.length > 0).length;

  return {
    ...entry,
    queries,
    ranksByLang,
    languagesWithResults,
    proposed: best?.id ?? null,
    agreement: best ? best.langs.size : 0,
    agreeingLangs: best ? [...best.langs].join('+') : '',
    keywords: best?.keywords ?? [],
    runnerUp: ranked[1] ? { id: ranked[1].id, agreement: ranked[1].langs.size } : null,
  };
};

const results = [];
for (const entry of targets) {
  if (PICTOGRAM_OVERRIDES[entry.id] && !NO_OVERRIDES) {
    results.push({
      ...entry, queries: {}, ranksByLang: {}, languagesWithResults: 0,
      proposed: PICTOGRAM_OVERRIDES[entry.id], agreement: null,
      agreeingLangs: 'hand-picked', keywords: [], runnerUp: null, handPicked: true,
    });
    process.stdout.write('=');
    continue;
  }
  try {
    const r = await resolveEntry(entry);
    results.push(r);
    process.stdout.write(r.proposed === null ? 'x'
      : r.agreement >= MIN_AGREEMENT ? (r.proposed === r.oldArasaac ? '.' : '!')
      : '?');
  } catch (err) {
    results.push({ ...entry, proposed: null, agreement: 0, error: String(err.message) });
    process.stdout.write('x');
  }
}
console.log('\n');

// ── Report ───────────────────────────────────────────────────────────────────
const accepted   = results.filter(r => r.handPicked || (r.proposed && r.agreement >= MIN_AGREEMENT));
const lowConf    = results.filter(r => !r.handPicked && r.proposed && r.agreement < MIN_AGREEMENT);
const unresolved = results.filter(r => !r.proposed);
const changed    = accepted.filter(r => r.proposed !== r.oldArasaac);

const row = r => {
  const langs = LANGS.map(l => `${l}:${r.ranksByLang?.[l] ?? '-'}`).join(' ');
  return `  ${r.id.padEnd(12)} current ${String(r.oldArasaac).padEnd(7)} `
       + `proposed ${String(r.proposed ?? '—').padEnd(7)} `
       + `agree ${String(r.agreeingLangs || r.agreement).padEnd(12)} [${langs}]`;
};

if (changed.length) {
  console.log(`CHANGED — ${changed.length} word(s) where the languages agree on a different symbol.`);
  console.log('Look at each image before accepting it; that is the entire lesson of the park card.');
  changed.forEach(r => console.log(row(r)));
  console.log('');
}
if (lowConf.length) {
  console.log(`LOW CONFIDENCE — ${lowConf.length} word(s) backed by fewer than ${MIN_AGREEMENT} languages.`);
  console.log('Not shipped. Add a PICTOGRAM_OVERRIDES entry after checking the image.');
  lowConf.forEach(r => console.log(row(r)));
  console.log('');
}
if (unresolved.length) {
  console.log(`UNRESOLVED — ${unresolved.length} word(s) with no usable result.`);
  unresolved.forEach(r => console.log(row(r)));
  console.log('');
}
console.log(`summary: ${accepted.length} accepted (${changed.length} changed), `
          + `${lowConf.length} low confidence, ${unresolved.length} unresolved`);

if (!APPLY) {
  console.log('\nReport only — nothing written. Re-run with --apply to write the map and download images.');
  process.exit(0);
}

// ── Apply ────────────────────────────────────────────────────────────────────
await mkdir(OUT, { recursive: true });
let downloaded = 0;
for (const r of accepted) {
  try {
    const res = await fetch(`${IMG}/${r.proposed}/${r.proposed}_500.png`);
    if (!res.ok) throw new Error(`img ${res.status}`);
    await writeFile(`${OUT}/${r.proposed}.png`, Buffer.from(await res.arrayBuffer()));
    downloaded++;
  } catch (err) {
    r.downloadError = String(err.message);
  }
}
console.log('downloaded', downloaded, 'pictograms');

const map = results.map(r => ({
  id: r.id,
  oldArasaac: r.oldArasaac,
  en: r.labels?.en,
  queries: r.queries,
  arasaac: (r.handPicked || r.agreement >= MIN_AGREEMENT) ? r.proposed : null,
  agreement: r.agreeingLangs || null,
  keyword: r.keywords?.[0] ?? null,
  ...(r.error ? { error: r.error } : {}),
  ...(r.downloadError ? { downloadError: r.downloadError } : {}),
}));
await writeFile('scripts/pictogram-map.json', JSON.stringify(map, null, 2) + '\n');

const failures = map.filter(m => !m.arasaac || m.downloadError);
if (failures.length) {
  console.log('FAILURES:', failures.map(f => `${f.id} (${f.error || f.downloadError || 'unresolved'})`).join(', '));
}
console.log('\nstarterVocabulary.ts is NOT edited automatically. Apply the CHANGED ids by hand,');
console.log('after looking at each new image — and add a correction to utils/seedPictograms.ts');
console.log('for any word already seeded into existing boards.');
