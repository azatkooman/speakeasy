# SpeakEasy AAC

[![CI](https://github.com/azatkooman/speakeasy/actions/workflows/ci.yml/badge.svg)](https://github.com/azatkooman/speakeasy/actions/workflows/ci.yml)

An Augmentative and Alternative Communication (AAC) app for children who speak little or not at all.
The child taps cards with pictures to build a sentence, and the device says it aloud.

Published on Google Play as `com.azatkooman.speakeasy`, and deployed on the web at
[speakeasy-phi-nine.vercel.app](https://speakeasy-phi-nine.vercel.app).

Current build: **versionCode 10 / 2.0**. minSdk 24, targetSdk 36.

---

## What this is, and what it must not do

An AAC board is somebody's voice. That fact decides most of the design here, and two rules follow
from it that are easy to break by accident:

**Positions must not move.** A child learns where a word is and reaches for it without looking, so a
card keeps its exact cell — when another card is hidden, when the tablet rotates, when the language
changes, when new words are added. Every item stores an absolute `slot`, and a hidden or deleted card
leaves an empty gap rather than pulling the rest forward. Anything that reflows the grid is a bug,
not a layout preference.

**It must work with no network.** A device that needs a connection to say a word is not a
communication device. Fonts, symbols, and the whole UI are bundled; nothing is fetched to render a
board.

Colour is information, not decoration: cards are coloured by grammatical category (the Fitzgerald
key), so it has to survive every visual change.

---

## Features

**Communication**
- Fixed grid with absolute slots; three grid densities (3×4, 4×6, 5×8)
- A core-word rail pinned on screen inside every folder — roughly 80% of what anyone says
- Sentence strip with playback, backspace, clear, and per-utterance history
- Word forms per card (`want` → `wants`, `wanted`), chosen from a badge rather than a long press
- Spelling keyboard with predictions drawn from the child's own cards
- Text-to-speech, or a parent's own recorded audio per card

**Access**
- Three ways to choose a card: on release (droppable), on touch, or a hold with adjustable dwell
- Auditory preview — speak first, confirm second
- Switch scanning: linear or row-column, auto or two-switch step, adjustable rate. Scanning reaches
  the Speak button and the folder controls, not only the vocabulary, so a switch user can compose,
  correct and speak a sentence unaided
- Semantic buttons throughout, `aria-live` announcements, visible focus, `prefers-reduced-motion`
- Every control has an accessible name, verified against the browser's own accessibility tree rather
  than by reading the source. No target is below the WCAG 2.5.8 AA minimum of 24×24 px

**Vocabulary**
- 90 starter words with bundled symbols, in four languages, seeded into every new board
- Language-independent identity: switching language re-labels cells **in place**, so a bilingual
  child keeps their motor plan
- Parent-mode action to add the starter words to a board that already exists, without moving
  anything on it

**Parents and professionals**
- Multiple child profiles per device, each with its own boards and settings
- Custom cards from photos or the ARASAAC symbol search
- Two visual shells — *young learner* and *neutral* — same grid, same colours, different register.
  The second exists because a fifteen-year-old should not carry a toddler interface in front of
  their peers
- Parent mode behind a 1.5s press-and-hold

**Languages** — English, Russian, French, Spanish. UI, vocabulary and speech.

---

## Stack

| | |
|---|---|
| UI | React 19, TypeScript 5.8, Vite 6 |
| Styling | Tailwind 3.4 (deliberately not v4 — the class renames aren't worth the churn) |
| Native | Capacitor 8 (WebView wrapper, Android) |
| Storage | IndexedDB, `speakeasy_aac_db` schema v7 |
| Tests | Vitest 4 with fake-indexeddb |
| Symbols | ARASAAC, bundled locally |

It is a web app in a WebView, not React Native. That was a deliberate choice: one codebase, and the
accessibility work lands once rather than twice.

---

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
```

No environment variables, no API keys, no accounts. If you find a `.env.local` on your machine it is
a leftover — nothing reads it.

Node 20 or newer (`.nvmrc` pins 20, which is what CI treats as the floor).

| Command | |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | typecheck, then production bundle into `dist/` |
| `npm run typecheck` | `tsc --noEmit`, strict |
| `npm run lint` | ESLint |
| `npm test` | full suite, once |
| `npm run test:watch` | suite in watch mode |
| `npm run verify` | typecheck + lint + tests — what CI runs |

`build` type-checks before bundling on purpose: Vite transpiles without consulting the type
checker, so a build that skipped this step would happily deploy a type error to production.

Lint warnings are ratcheted, not ignored — `lint` passes `--max-warnings 63`, the count when the
config was added, so the number can be driven down but cannot creep up.

### Android

Requires **JDK 21** — JDK 25 fails Gradle 8.14 with *"Unsupported class file major version 69"*. On
macOS the keg-only Homebrew install stays off the system PATH deliberately, so point at it per shell:

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@21 && export PATH="$JAVA_HOME/bin:$PATH"
```

```bash
npm run build && npx cap sync android && cd android && ./gradlew assembleDebug
```

`bundleRelease` produces an **unsigned** AAB; there is no signing config in the repo, so sign it with
your own upload keystore before uploading. Debug builds install alongside the Play release under
`com.azatkooman.speakeasy.debug` and are labelled *SpeakEasy Test* — a debug build can never replace
a release-signed install, and forcing it would mean uninstalling and taking a child's boards with it.

---

## Layout

```
components/   21 files — UI, all dialogs via components/Dialog.tsx
contexts/     SpeakEasyContext.tsx — app state, persistence, playback
pages/        BoardPage.tsx — the board, the rail, the scan graph
services/     storage.ts (IndexedDB), translations.ts, voice.ts, arasaac.ts, audioPlayer.ts
utils/        starterVocabulary.ts, keyboardLayouts.ts, useScanner.ts, useSelectable.ts,
              useRenderedCols.ts, history.ts, languages.ts, seedPictograms.ts, icons.ts
tests/        13 suites, 93 tests
scripts/      fetch-pictograms.mjs, build-review-sheet.mjs
public/       92 bundled ARASAAC pictograms, manifest, icons
android/      Capacitor Android project
```

### Files worth knowing about

- **`services/storage.ts`** — IndexedDB, the schema migrations, and board seeding. The v6→v7
  migration turns the old compacted `order` into absolute `slot`, inside the upgrade transaction so
  it either lands whole or not at all.
- **`utils/starterVocabulary.ts`** — the 90-word starter vocabulary, all four languages, in one file
  so a speech and language therapist can revise it without touching code. Word choice is drawn from
  published core-vocabulary research; the per-folder fringe words are not, and say so.
- **`utils/useScanner.ts`** — switch scanning. Takes a flat list of *stops*, each declaring its row,
  rather than cells plus a column count.
- **`components/Dialog.tsx`** — the one accessible dialog: `aria-modal`, focus trap, focus
  restoration, Escape, and the app behind it made `inert`. Portalled to `body`, which is what makes
  inertness possible.
- **`index.css`** — the two visual shells, expressed as CSS custom properties per Fitzgerald colour.

---

## Testing

```bash
npm test
```

93 tests over 13 suites: schema migrations, profile isolation, switch traversal, keyboard layouts,
history snapshots, asset paths, starter-vocabulary integrity, delete ordering, blocked database
upgrades, the settings write race, hook ordering, dependency declarations, and accessible names.

Every suite was mutation-checked — deliberate regressions introduced one at a time to confirm the
tests actually fail. A suite that passes against broken code is worse than no suite, and this project
had two invalid tests before that habit started.

There is no UI test coverage. Interaction and accessibility behaviour is still verified by hand.

### CI

`.github/workflows/ci.yml` runs typecheck, lint, tests and build on every push to `main` and every
pull request, against Node 20 and 22. It installs with `npm ci` rather than `npm install`, which
matters because the lockfile is what makes a run reproducible; `npm install` is free to wander off
it. Every dependency is declared as a caret range on a real version — `tests/dependencies.test.ts`
fails the build if a moving tag like `"latest"` reappears, or if a Capacitor plugin drifts onto a
different major than `@capacitor/core`.

Locally, `npm run verify` is the same three checks without the build.

---

## Symbols and licence

Pictographic symbols are the property of the Government of Aragón, created by Sergio Palao for
[ARASAAC](https://arasaac.org), distributed under **CC BY-NC-SA**. Full terms in
`public/pictograms/ATTRIBUTION.txt`.

The non-commercial clause is load-bearing: the app is free, which is compatible. **If it ever carries
a price, a paid tier, or advertising, these symbols must be relicensed or replaced first.**

Regenerate the symbol set with `node scripts/fetch-pictograms.mjs`. It reports by default and writes
nothing; `--apply` downloads and rewrites the map, and it never edits `starterVocabulary.ts`.

Two failure modes, and only one of them is guardable:

- The ARASAAC search answers an unmatchable query with an arbitrary pictogram rather than nothing —
  "your turn" once came back as *New Year's Eve*. The keyword-overlap check catches that.
- A query can match the **wrong sense** of a homonym, where the keyword is genuinely correct. No
  keyword check can see this. The park card shipped in 2.0 with a picture of a car reversing into a
  parking space.

So the resolver searches all four languages and keeps what they agree on. Each card already carries
four labels for one concept, and that redundancy is the signal: the parking symbol had only English's
vote, while the right symbol led in Russian, French and Spanish — and never appeared in the English
results at all, since its English label is "playground".

Agreement is a good *detector* and a poor *chooser*. Running it over the existing 90 words proposed
17 changes, and of the four spot-checked, two would have made the board worse — see
`scripts/SYMBOL-REVIEW.md`. Open the image before accepting anything, and remember that replacing a
symbol a child has already learned has its own cost. `scripts/build-review-sheet.mjs` produces a
sheet pairing every word with its symbol for that review.

---

## Privacy

Boards, photos and voice recordings stay on the device. There is no account, no analytics, no ads,
and no server.

One exception, stated plainly because the store listing has to match: when a parent uses the symbol
search while making a card, the typed query goes to `api.arasaac.org` to find an image. Everything
else works with the network off.

---

## Known gaps

Honest list, roughly in order of how much they matter:

- **No export or import.** Boards live only in that device's IndexedDB. A parent replacing a tablet
  loses months of work, and a failed migration has no recovery path. This is the largest outstanding
  risk and should land before the next schema change.
- **The starter vocabulary needs clinical review.** Symbol choices remain the weak point, and the
  verb/adjective forms in ru/fr/es are compromises an SLP should settle.
  `scripts/build-review-sheet.mjs` generates the review artefact.

  The failure mode to look for is a *correct keyword on the wrong sense of the word*, which the
  automatic search cannot detect and the keyword guard cannot catch. The park card shipped in 2.0
  with ARASAAC 5379, whose English keyword is exactly "park" but whose drawing is a car reversing
  into a parking space; every label on the card — park / парк / parc / parque — means the place.
  Fixed, and corrected on read for boards already seeded with it.

  Spot-checked the other homonym-prone entries by looking at the images: `play`, `drink` and `shop`
  are right. `water` is ARASAAC 32464, a running tap, and it sits in the FOOD folder where the card
  is a child asking for a drink — a glass of water would read better. Left alone pending a decision,
  since replacing a symbol a child may already have learned is a clinical call, not a technical one.
- **Parent mode is not keyboard-operable** — it needs a 1.5s pointer hold, which a keyboard or
  screen-reader user cannot perform.
- **Parent mode is visually crowded on a phone**; edit controls overlap the artwork. Child mode is
  unaffected. This got slightly worse, deliberately: the card reorder arrows were 20×20, below the
  WCAG 2.5.8 AA minimum, and are now 24×24. On a 95×80 card carrying three overlaid controls, 44×44
  each is geometrically impossible — the real fix is a different editing affordance for phones, not
  bigger badges.
- **The keyboard and history dialogs are not scannable**, so switch scanning deliberately does not
  offer them — reaching a dialog you cannot operate or dismiss is worse than not reaching it.
- **No VoiceOver or TalkBack pass on a real device.** The iOS platform is not in the project.
- **No UI tests.**

---

SpeakEasy does not replace the support of a speech and language therapist. The starter vocabulary is
a starting point to adapt with the professional who knows the child.
