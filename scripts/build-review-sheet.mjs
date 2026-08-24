/**
 * Builds a one-page review sheet pairing every starter-vocabulary word with the
 * symbol it will actually show, in all four languages.
 *
 * The point is clinical review. An automated symbol search produces plausible
 * wrong answers, and a plausible wrong symbol is worse than a missing one
 * because nobody goes looking for it. This is the artefact an SLP or a native
 * speaker marks up.
 *
 * Run: node scripts/build-review-sheet.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync('utils/starterVocabulary.ts', 'utf8');
const map = JSON.parse(readFileSync('scripts/pictogram-map.json', 'utf8'));
const qById = Object.fromEntries(map.map(r => [r.id, { q: r.q, keyword: r.keyword }]));

const rowRe = /e\('([a-z_]+)',\s*(\d+),\s*(?:'([^']*)'|"([^"]*)"),\s*'([^']*)',\s*(?:'([^']*)'|"([^"]*)"),\s*(?:'([^']*)'|"([^"]*)")/g;
const sections = [];
let current = null;
for (const line of src.split('\n')) {
  const head = line.match(/^\s{2}([A-Z_]+):\s*\[/);
  if (head) { current = { name: head[1], rows: [] }; sections.push(current); continue; }
  if (/^export const CORE_RAIL/.test(line)) { current = { name: 'CORE RAIL', rows: [] }; sections.push(current); continue; }
  const m = rowRe.exec(line); rowRe.lastIndex = 0;
  if (m && current) {
    current.rows.push({
      id: m[1], arasaac: Number(m[2]),
      en: m[3] ?? m[4], ru: m[5], fr: m[6] ?? m[7], es: m[8] ?? m[9],
    });
  }
}

const b64 = id => readFileSync(`public/pictograms/${id}.png`).toString('base64');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Words whose symbol I already consider questionable — called out rather than
// left for the reviewer to happen upon.
const FLAGGED = {
  finished: 'Crossed cutlery reads as "finished eating", not finished in general.',
  more: 'Hard to read at cell size; check it means "more" to a child.',
  your_turn: 'ARASAAC has no "your turn"; this is the generic "turn" symbol.',
  little: 'Search returned "short"; overridden to "small" — confirm which is wanted.',
  hurt: 'Chosen for "hurt/ache"; confirm it is not read as illness.',
  love_you: 'Generic "love"; confirm it works for "I love you".',
};

const rows = sections.map(s => `
  <section>
    <h2>${esc(s.name.replace(/_/g, ' '))} <span class="count">${s.rows.length} words</span></h2>
    <table>
      <thead><tr><th>Symbol</th><th>English</th><th>Русский</th><th>Français</th><th>Español</th><th class="meta">id / searched</th></tr></thead>
      <tbody>
      ${s.rows.map(r => `
        <tr${FLAGGED[r.id] ? ' class="flagged"' : ''}>
          <td class="sym"><img alt="" src="data:image/png;base64,${b64(r.arasaac)}"></td>
          <td class="w en">${esc(r.en)}</td>
          <td class="w">${esc(r.ru)}</td>
          <td class="w">${esc(r.fr)}</td>
          <td class="w">${esc(r.es)}</td>
          <td class="meta"><code>${r.arasaac}</code><br><span class="q">${esc(qById[r.id]?.q ?? '')} → ${esc(qById[r.id]?.keyword ?? '')}</span></td>
        </tr>
        ${FLAGGED[r.id] ? `<tr class="note"><td></td><td colspan="5">⚠ ${esc(FLAGGED[r.id])}</td></tr>` : ''}
      `).join('')}
      </tbody>
    </table>
  </section>`).join('');

const total = sections.reduce((n, s) => n + s.rows.length, 0);

writeFileSync('scripts/vocabulary-review.html', `<title>Starter Vocabulary Review</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&display=swap">
<style>
  :root {
    --ground: #fbfaf8; --panel: #ffffff; --ink: #1b1a19; --muted: #6b6864;
    --line: rgba(27,26,25,.10); --accent: #6d4aff; --warn-bg: #fdf6e3; --warn-ink: #7a5a00;
  }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
    --ground: #16151a; --panel: #1e1d24; --ink: #ecebef; --muted: #a09daa;
    --line: rgba(236,235,239,.13); --accent: #a993ff; --warn-bg: #2a2410; --warn-ink: #e8cf8a;
  }}
  :root[data-theme="dark"] {
    --ground: #16151a; --panel: #1e1d24; --ink: #ecebef; --muted: #a09daa;
    --line: rgba(236,235,239,.13); --accent: #a993ff; --warn-bg: #2a2410; --warn-ink: #e8cf8a;
  }
  body { background: var(--ground); color: var(--ink); margin: 0;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    font-size: 15px; line-height: 1.5; }
  .wrap { max-width: 1000px; margin: 0 auto; padding: 3rem 1.25rem 5rem; }
  header { border-bottom: 2px solid var(--ink); padding-bottom: 1.5rem; margin-bottom: 2.5rem; }
  h1 { font-family: Fraunces, Georgia, serif; font-weight: 700; font-size: clamp(1.9rem, 4vw, 2.8rem);
       margin: 0 0 .5rem; letter-spacing: -.02em; text-wrap: balance; }
  .lede { color: var(--muted); max-width: 62ch; margin: 0 0 1.25rem; }
  .stats { display: flex; flex-wrap: wrap; gap: .5rem 1.75rem; font-size: .82rem;
           text-transform: uppercase; letter-spacing: .07em; color: var(--muted); }
  .stats b { color: var(--accent); font-variant-numeric: tabular-nums; }
  .ask { background: var(--panel); border: 1px solid var(--line); border-left: 3px solid var(--accent);
         border-radius: 4px; padding: 1rem 1.15rem; margin: 0 0 2.5rem; }
  .ask h3 { font-size: .8rem; text-transform: uppercase; letter-spacing: .08em; margin: 0 0 .5rem; color: var(--accent); }
  .ask ol { margin: 0; padding-left: 1.25rem; } .ask li { margin: .3rem 0; }
  section { margin-bottom: 3rem; }
  h2 { font-family: Fraunces, Georgia, serif; font-size: 1.15rem; letter-spacing: .04em;
       text-transform: uppercase; margin: 0 0 .75rem; padding-bottom: .4rem; border-bottom: 1px solid var(--line); }
  .count { float: right; font-family: inherit; font-size: .75rem; text-transform: none;
           letter-spacing: 0; color: var(--muted); font-weight: 500; }
  .table-scroll, table { width: 100%; }
  table { border-collapse: collapse; }
  th { text-align: left; font-size: .72rem; text-transform: uppercase; letter-spacing: .07em;
       color: var(--muted); font-weight: 600; padding: .4rem .6rem; }
  td { padding: .45rem .6rem; border-top: 1px solid var(--line); vertical-align: middle; }
  .sym { width: 66px; }
  .sym img { width: 54px; height: 54px; object-fit: contain; background: var(--panel);
             border: 1px solid var(--line); border-radius: 6px; display: block; }
  .w { font-size: 1rem; } .w.en { font-weight: 600; }
  .meta { color: var(--muted); font-size: .74rem; white-space: nowrap; }
  .meta code { font-variant-numeric: tabular-nums; }
  .q { opacity: .75; }
  tr.flagged td { background: var(--warn-bg); }
  tr.note td { background: var(--warn-bg); color: var(--warn-ink); font-size: .82rem;
               border-top: none; padding-top: 0; }
  @media (max-width: 720px) { .meta { display: none } .w { font-size: .92rem } }
</style>
<div class="wrap">
  <header>
    <h1>Starter Vocabulary Review</h1>
    <p class="lede">Every word a new SpeakEasy board is seeded with, paired with the symbol it
      will actually show. The words come from published core-vocabulary research; the symbols were
      matched automatically against ARASAAC, and automatic matching produces confident wrong
      answers. This sheet exists so a person can catch them.</p>
    <div class="stats">
      <span>Words <b>${total}</b></span>
      <span>Languages <b>4</b></span>
      <span>Flagged for review <b>${Object.keys(FLAGGED).length}</b></span>
    </div>
  </header>
  <div class="ask">
    <h3>What to check</h3>
    <ol>
      <li>Does the picture mean the word? A wrong symbol puts a wrong meaning under a child's finger.</li>
      <li>Is each translation the word a child would use, not a dictionary gloss?</li>
      <li>Verbs are infinitives and adjectives are masculine singular in ru/fr/es. Right call, or not?</li>
      <li>Which words are missing that a child needs on day one — and which here could go?</li>
    </ol>
  </div>
  ${rows}
</div>`);
console.log('wrote scripts/vocabulary-review.html with', total, 'words');
