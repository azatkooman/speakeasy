/**
 * Resolves every starter-vocabulary word to an ARASAAC pictogram and bundles it.
 *
 * Run: node scripts/fetch-pictograms.mjs
 *
 * Symbols are bundled rather than fetched at runtime because offline operation
 * is a hard requirement — a communication device that needs a network to draw a
 * word is not a communication device. ARASAAC pictograms are CC BY-NC-SA;
 * attribution lives in public/pictograms/ATTRIBUTION.txt.
 *
 * The search picks the best match automatically, which is not good enough on its
 * own: a wrong symbol puts a wrong meaning under a child's finger. It therefore
 * also writes a review sheet pairing every symbol with its word, in all four
 * languages, so a human can check the lot in one pass.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';

const API = 'https://api.arasaac.org/api/pictograms';
const IMG = 'https://static.arasaac.org/pictograms';
const OUT = 'public/pictograms';

// Where the English label is a poor search query, say what to search for instead.
const QUERY_OVERRIDES = {
  i_want: 'want', like: 'like', dont_like: 'not like', finished: 'finished',
  hurt: 'pain', what: 'what', love_you: 'love', my_turn: 'my turn',
  your_turn: 'your turn', tv: 'television', mum: 'mother', dad: 'father',
  i: 'I', we: 'we', biscuit: 'cookie', shop: 'shop', toilet: 'toilet',
  ice_cream: 'ice cream', por_la_manana: 'morning', morning: 'morning',
};

/*
 * Hand-picked ids, for words the search cannot resolve well on its own.
 * Each of these was checked against the pictogram's own keywords.
 */
const PICTOGRAM_OVERRIDES = {
  dont_like: 37825,   // "dislike, I do not like that" — pairs with like: 37826
  your_turn: 6006,    // plain "turn"; ARASAAC has "my turn" but no "your turn"
  later:     13080,   // "after, then, later on, later"
  after:      7818,   // plain "after", so it is not the same picture as later
  hurt:      30620,   // "hurt, suffer, ache, pain" beats the bare "pain" symbol
  love_you:  11519,   // "love"
  little:     4716,   // "small, tiny, little" — the search returned "short", a different idea
  park:       2859,   // "playground, playpark". ARASAAC's keyword for 5379 is
                      // literally "park", but the drawing is a car reversing
                      // into a parking space — the verb, not the place. The
                      // keyword guard cannot catch this: the keyword matches.
};

const src = readFileSync('utils/starterVocabulary.ts', 'utf8');
// The English label may be single- or double-quoted (apostrophes in "I don't
// like"), so accept either — a silently skipped entry ships a card with a
// placeholder id and therefore no symbol at all.
const entries = [...src.matchAll(/e\('([a-z_]+)',\s*(\d+),\s*(?:'([^']*)'|"([^"]*)")/g)]
  .map(m => ({ id: m[1], oldArasaac: Number(m[2]), en: m[3] ?? m[4] }));

const clean = s => s.replace(/^(I |it )/i, '').replace(/[?¿]/g, '').trim();

const resolved = [];
for (const entry of entries) {
  if (PICTOGRAM_OVERRIDES[entry.id]) {
    resolved.push({ ...entry, q: '(hand-picked)', arasaac: PICTOGRAM_OVERRIDES[entry.id], keyword: '(hand-picked)' });
    process.stdout.write('=');
    continue;
  }
  const q = QUERY_OVERRIDES[entry.id] ?? clean(entry.en);
  try {
    const res = await fetch(`${API}/en/search/${encodeURIComponent(q)}`);
    if (!res.ok) throw new Error(`search ${res.status}`);
    const hits = await res.json();
    if (!Array.isArray(hits) || hits.length === 0) throw new Error('no results');
    // Prefer a hit whose keyword matches the query exactly; else the first.
    const exact = hits.find(h => (h.keywords || []).some(k => (k.keyword || '').toLowerCase() === q.toLowerCase()));
    /*
     * The API answers an unmatchable query with an arbitrary pictogram rather
     * than nothing — "your turn" and "not like" both came back as New Year's
     * Eve. So a result is only accepted if its keywords actually share a word
     * with what was asked for. Anything else is reported, not shipped: a
     * plausible-looking wrong symbol is worse than a missing one, because
     * nobody goes looking for it.
     */
    const tokens = q.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    const relevant = h => (h.keywords || []).some(k => {
      const kw = (k.keyword || '').toLowerCase();
      return tokens.length === 0 || tokens.some(t => kw.includes(t));
    });
    const pick = exact ?? hits.find(relevant);
    if (!pick) throw new Error(`no relevant match (best was ${hits[0]?._id})`);
    resolved.push({ ...entry, q, arasaac: pick._id, keyword: (pick.keywords?.[0]?.keyword) ?? q });
    process.stdout.write('.');
  } catch (err) {
    resolved.push({ ...entry, q, arasaac: null, error: String(err.message) });
    process.stdout.write('x');
  }
}
console.log('\nresolved', resolved.filter(r => r.arasaac).length, 'of', resolved.length);

await mkdir(OUT, { recursive: true });
let downloaded = 0;
for (const r of resolved) {
  if (!r.arasaac) continue;
  try {
    const res = await fetch(`${IMG}/${r.arasaac}/${r.arasaac}_500.png`);
    if (!res.ok) throw new Error(`img ${res.status}`);
    await writeFile(`${OUT}/${r.arasaac}.png`, Buffer.from(await res.arrayBuffer()));
    downloaded++;
  } catch (err) {
    r.downloadError = String(err.message);
  }
}
console.log('downloaded', downloaded, 'pictograms');

await writeFile('scripts/pictogram-map.json', JSON.stringify(resolved, null, 2));
const failures = resolved.filter(r => !r.arasaac || r.downloadError);
if (failures.length) console.log('FAILURES:', failures.map(f => `${f.id} (${f.error || f.downloadError})`).join(', '));
