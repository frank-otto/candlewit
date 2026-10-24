# 🕯️ Candlewit

Day 16 of a daily Halloween web-game series – **4 days to Halloween 🎃**

A cinematic 3D séance quiz. Midnight in a stone rotunda under a dome of old blocks: a crystal ball on a velvet table asks the questions, and every answer belongs to a coloured candle – amber ☾, green ✶, violet ✦, blue ◆. Light the right one and it shoots up a column of coloured fire. Pick wrong and an icy gust snuffs it out. Twelve small candles round the table are your clock – they go out one by one while you think.

**The hook – THE SPIRIT STORM.** Five right answers in a row and the séance gets out of hand: time slows, the camera cranes up and **THE ROOF BLOWS OFF** – some 240 stone blocks of the dome blast into the night, a vortex of little ghosts spirals up to a giant moon and fireworks crack overhead. For the next three questions you score **×2 (Spirit Surge)** under the open sky, then the dome flies back together, block by block.

**The boss – THE MIDNIGHT ROUND.** Questions 11–13 are asked by a giant spectre rising behind the table. Every right answer fires a beam of candle light into it; three hits and it is banished in a burst of wisps.

## How to play
- **Tap an answer** (or press **1–4** / **A–D**) to light its candle. Faster answers score more; right answers in a row multiply the score (up to ×5).
- **Flames** are your lives (Easy 5 · Medium 3 · Hard 2). A wrong answer or an empty candle clock costs one.
- **Three jokers**, each once per séance: **🌬 Gust** blows out two wrong candles · **❄ Frost** freezes the clock for this question · **🦇 Swap** – the bats bring a different question. Keys: **G**, **F**, **S**.
- The floor's rune circle and the 🌕 dots on the question card show how close the next Spirit Storm is.
- A séance is 10 questions in rising difficulty plus the Midnight Round; 1 to 3 stars (3 stars: at least 12 right and the spectre banished).

**Question bank:** 106 hand-checked questions in English and German (Halloween customs, monsters & legends, nature & creatures, books, poems & music) in four tiers – kids, easy, medium, hard. Dates, numbers and facts were checked against reference sources.
**Modes:** Séance · **Endless Séance** (a Midnight Round every 13 questions, the clock gets shorter) · **Player 1 vs Player 2** hot-seat duel (the same 8 questions for both, no flames to lose, highest score wins).
**Difficulty:** Easy / Medium / Hard (time per question, flames, question tiers). **Kids mode:** easy questions, no clock, you can't lose – a wrong candle just goes out and you pick again; after a while a wrong candle goes out by itself as a hint.

**One tap to play.** The game opens in the middle of the blast: the dome is already flying apart in the very first frame, then time runs backwards and the blocks fly home before the title lands. Tap (or click) anywhere and you are straight in the séance, sound on, with a short hint. After the opening the start screen has one big PLAY button; Endless Séance, the duel, difficulty, kids mode, quality, sound and the intro replay sit behind the small ⚙. The language follows the browser (German for German browsers, English otherwise) with a tiny DE/EN switch (remembered). A 1080×1350 score card to save or share. Quality is automatic (Normal, steps down only if the frame rate stays low).

## Tech
- Three.js (WebGL): procedural PBR stone, oak and velvet (sheen) materials, PMREM environment light, a shadowed moonbeam spotlight through the oculus, coloured point lights per answer candle, exponential fog, HDR bloom with a clamped high-pass (no glare), colour grade (warm / frost / hurt pulses), MSAA.
- The dome is ~240 instanced blocks driven by an analytic blast function – the same function runs backwards for the rebuild and the opening. Instanced billboard flames, a GPU ghost-vortex shader, a lathe-modelled spectre with a rim-light shader, GPU sparks for fireworks and fire columns.
- A pure, deterministic rules engine (`src/quiz.js`): timer, flames, streak multiplier, spirit meter, jokers, boss round, kids rules, duel with identical questions; it only emits events, the visuals and sounds react to them.
- Frame-rate independent clock with NaN guards; GPU resources are disposed on quality changes (leak-tested).
- Sounds: real CC0 recordings only, no oscillators; original sample-based music. See `LICENSES/SOUNDS.md`.
- Everything is bundled into `js/game.bundle.js` + `js/sounds-src.js`, so it also runs straight from the file system (`start.command` or open `index.html`).

## Build & test
```
npm install
node tools/build.mjs
python3 test/test_game.py     # headless Chrome (SwiftShader) via Playwright
python3 test/test_mobile.py   # phones: WebKit iPhone + Chromium Pixel, real taps, portrait + landscape
```

Built with Grok Bot by Frank (@Frank_AI_Lab). Sound credits by source ID in `LICENSES/SOUNDS.md`. Code licenses: three.js (MIT), Fredoka font (OFL).
