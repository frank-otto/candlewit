# Sounds – sources & licenses (Candlewit)

All 116 sounds are real recordings released under **CC0 1.0** (https://creativecommons.org/publicdomain/zero/1.0/), reused unchanged from earlier games of this series where each source page was checked for CC0 1.0. No synthesizer, no oscillators, no beeps. `tools/build.mjs` embeds them as base64 into `js/sounds-src.js`, so the game also runs via `file://`. The rotunda echo is a generated convolution impulse (processing only). Credit is not required for CC0 and is given voluntarily, by source ID only.

## Answers, candles and the crystal ball
| File | Used for | Source |
|---|---|---|
| match | striking a candle when you pick an answer | Freesound #534318 (CC0) |
| chime_a, chime_b, chime_c, harp, sparkle, tinkle | right answers (rising with the streak), hints | Freesound #418164, #119543, #660493, #610703, #715067, #84526 (CC0) |
| freeze, freeze_b | wrong answer (icy gust), the Frost joker | Freesound #452645, #396447 (CC0) |
| heart | the last three seconds of the candle clock | Freesound #21409 (CC0) |
| clock_loop | the ticking candle clock | Freesound #797574, #626162 (CC0) |
| page | a new question card | Freesound #336374 (CC0) |
| knock | menu / button taps | Freesound #268500 (CC0) |
| swish_a, swish_b, whoosh, swoosh_rise, fwoosh, wing, flap_1 | Gust joker, candle flare-ups, bats | Freesound #463763, #264777, #580967, #557812, #389634, #177242 (CC0) |
| bats, bat_swarm | Swap joker (the bats bring a new question) | Freesound #546823, #245768 (CC0) |
| giggle_kids, laugh_kids | kids mode | Freesound #754382, #754399 (CC0) |
| impact, thud_a | small hits, the dome landing back in place | Kenney "Impact Sounds" (CC0 1.0, see Kenney-Impact-Sounds-License.txt) |
| thump, thump_b, crack, crumble, stone_1, stone_2, stone_crash, slab_grind | the dome blasting apart / flying back together | Freesound #529396, #60013, #157804, #262118, #179341, #265580, #844329 (CC0) |

## The Spirit Storm, the Midnight Spectre, results
| File | Source |
|---|---|
| riser, stinger, sub, boom_bass, boom_cine, hit_dram, rumble | Freesound #822419, #754771, #428073, #268084, #255111, #222517 (CC0) |
| fw_burst, fw_burst_b, fw_crackle | Freesound #587184, #335983, #505264 (CC0) |
| choir_ah, choir_swell, magic, success, cheer, applause, epic | Freesound #764330, #458146, #249819, #615099, #32260, #160493, #688612 (CC0) |
| bell_deep, bell_strike, bell_far, bells_peal | Freesound #240586, #219047, #341866, #147913 (CC0) – the midnight bells |
| cackle, cackle_b, mad_laugh | Freesound #223851, #348142, #417826, #814020 (CC0) – the spectre laughs at a wrong answer |
| glass | VSCO 2 Community Edition (CC0 1.0) – the shattering spirit shell |

## Night ambience
| File | Source |
|---|---|
| night_loop, eerie_loop, wind, torch_loop | Freesound #251340, #32805, #159509, #437475, #481139, #697217, #483316 (CC0) |
| owl, howl, crow, whisper, boo, ghosts, creak_1 | Freesound #558214, #398430, #404687, #175944, #607205, #763804, #254735 (CC0) |
| thunder_big, thunder_soft | Freesound #243614, #244053 (CC0) |

## Music – VSCO 2 Community Edition (CC0 1.0)
https://github.com/sgossner/VSCO-2-CE – trimmed, faded and loudness-matched; the game re-pitches the nearest recorded note. Original music written for this game (a D-minor séance waltz, a 6/8 menu theme and a 4/4 Midnight Round theme), sequenced note by note.

| Files | Instrument |
|---|---|
| org_48 … org_75 (10), ped_24 … ped_42 (7) | pipe organ manual and pedal |
| pz_A3, pz_C4, pz_D3, pz_D5, pz_E4, pz_G4, cb_A1, cb_Cs2, cb_E1, cb_E2, cb_Fs1 | violin and contrabass pizzicato |
| hp_D4, hp_A4, glissup | harp, harp glissando |
| xy_C5, xy_G5, xy_C6, tri | xylophone, triangle |
| tp_1 … tp_4, tproll, bd, crash, gong, cymcresc | timpani, bass drum, cymbals, gong |

Code: three.js (MIT, see three.js-MIT.txt). Font: Fredoka (SIL Open Font License 1.1, see Fredoka-OFL.txt).
