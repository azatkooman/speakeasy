# Starter-vocabulary symbol review queue

Output of `node scripts/fetch-pictograms.mjs` (report mode) after the resolver was
changed to search all four languages and keep what they agree on.

**Nothing here has been applied.** These are candidates for review, not fixes.

## How to read it

The resolver picks the pictogram the most languages agree on. That is a good way to
*detect* a wrong symbol — it caught the park card, where the shipped symbol had only
English's vote — but it is a poor way to *choose* one. Cross-linguistic consistency is
not the same as clinical suitability, and two of the four candidates spot-checked here
would have made the board worse.

So: open the image before changing anything.

    node scripts/fetch-pictograms.mjs --only=<id>            # see the votes
    node scripts/fetch-pictograms.mjs --no-overrides         # re-check hand-picks

Anything accepted also needs a correction entry in `utils/seedPictograms.ts`, because
boards seeded by an earlier version keep the old id in IndexedDB for the life of the
profile.

## Candidates

| word | current | proposed | languages agreeing |
|---|---|---|---|
| more | 5508 | 32753 | en+ru+fr+es |
| help | 32648 | 12252 | en+fr+es |
| like | 37826 | 38889 | en+ru+fr+es |
| again | 37163 | 37162 | en+ru+fr+es |
| stop | 7196 | 8289 | en+ru |
| dad | 2497 | 6165 | en+ru+fr+es |
| give | 28431 | 38048 | en+ru+fr+es |
| shoes | 2775 | 36876 | en+ru+fr+es |
| bag | 23849 | 39829 | en+ru+fr+es |
| hot | 2300 | 4583 | en+ru+fr+es |
| bad | 5504 | 4690 | en+ru+fr+es |
| happy | 35533 | 3245 | en+ru+fr+es |
| funny | 24733 | 36481 | en+fr+es |
| garden | 2974 | 2434 | en+ru+fr+es |
| pasta | 8652 | 39076 | en+ru+fr+es |
| ice_cream | 3348 | 2420 | en+ru+fr+es |
| soon | 33044 | 5896 | ru+fr |

## Spot checks already done

**`hot` — reject.** Current 2300 is a sweating face beside a sun: a child saying "I'm
hot". Proposed 4583 is a steaming mug — "hot" as a property of a drink. The card sits in
the ADJECTIVE folder and is usually about the child or what they are touching, so the
current symbol is the better one despite all four languages agreeing on the mug.

**`funny` — reject.** Proposed 36481 is a plain smiling face, which reads as *happy*.
`happy` is itself in this queue, so accepting both risks two cards a child cannot tell
apart. Whatever replaces `funny` has to stay distinguishable from `happy`.

**`soon` — weak evidence.** Only ru+fr agree, and en/fr/es each returned a single result,
so there is barely any signal. Treat as unresolved rather than as a proposal.

**`garden` — check against `park`.** Proposed 2434 also appears in the French results for
*parc*, so it may be a park rather than a garden. Those two cards need to stay distinct.

## Not reviewed

The remaining candidates are untouched. Several look like lateral moves between two
acceptable drawings (`again` 37163 → 37162 are adjacent ids), and a lateral move is not
worth making: replacing a symbol a child has already learned has a real cost, and none of
these is known to be wrong the way the park card was.
