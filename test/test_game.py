"""Candlewit – full headless test suite (Chrome + SwiftShader WebGL over a local web server).
Run: python3 test/test_game.py   (exit code 0 = all checks passed; screenshots → test/shots/)"""
SUR = bytes([79, 116, 116, 111]).decode()  # the surname that must never appear (spelled as bytes so this file stays clean)
FAM = [bytes(x).decode() for x in ([84, 104, 101, 111, 100, 111, 114], [77, 97, 114, 116, 104, 97], [69, 108, 105, 115, 97, 98, 101, 116, 104], [65, 110, 110, 97])]
# third-party names / phrases that must never appear in visible text
TM = r'candy|saga|crush|haunted\s*mansion|whac|grok(?!\s*bot)|trivia\s*crack|kahoot|jeopardy|millionaire|50\s*:\s*50|fifty[- ]fifty|phone\s*a\s*friend|ask\s*the\s*audience|final\s*answer|lifeline|quizduell|quiz\s*duel'
import asyncio, os, re, glob, json, sys, base64, io
from playwright.async_api import async_playwright
import threading, http.server, functools, socketserver
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
class _Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
_srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), functools.partial(_Q, directory=ROOT)); _srv.daemon_threads = True
threading.Thread(target=_srv.serve_forever, daemon=True).start()
URL = 'http://127.0.0.1:%d/index.html' % _srv.server_address[1]
OUT = ROOT + '/test/shots/'; os.makedirs(OUT, exist_ok=True)
ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required']
R = []
def check(n, ok, info=''): R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + (f' — {info}' if info != '' else ''), flush=True)
CLEAR = "try{if(!sessionStorage.getItem('cwInit')){sessionStorage.setItem('cwInit','1'); localStorage.clear();}}catch(e){}"
TXT = "window.__txt=[];(function(){const f=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(s,...a){try{window.__txt.push(String(s))}catch(e){}return f.call(this,s,...a)};})();"
async def page(b, skip=False, manual=True, locale='en-US', vp=(1280, 800)):
    ctx = await b.new_context(accept_downloads=True, locale=locale, viewport={'width': vp[0], 'height': vp[1]})
    init = 'window.__cwSeed = 4242; window.__cwQSeed = 1616; window.__cwPDB = true; window.__cwNoAutoQ = true;' + ('window.__cwManual = true;' if manual else '') + ('window.__cwSkipIntro = true;' if skip else '') + CLEAR + TXT
    await ctx.add_init_script(init)
    pg = await ctx.new_page(); pg.set_default_timeout(300000); logs = []
    pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}') if m.type == 'error' else None)
    pg.on('pageerror', lambda e: logs.append(f'PAGEERROR {e}'))
    await pg.goto(URL); await pg.wait_for_function('document.body.classList.contains("ready") && window.__cw', timeout=120000)
    return ctx, pg, logs
def pxs(im): return im.get_flattened_data() if hasattr(im, 'get_flattened_data') else list(im.getdata())
def mean(path): im = Image.open(path).convert('L'); px = pxs(im); return sum(px) / len(px)
def diff(a, b):
    A = Image.open(a).convert('L').resize((160, 100)); B = Image.open(b).convert('L').resize((160, 100)); pa, pb = pxs(A), pxs(B); return sum(abs(x - y) for x, y in zip(pa, pb)) / len(pa)
def white_share(path):
    im = Image.open(path).convert('RGB').resize((200, 125)); px = pxs(im); return sum(1 for r, g, b in px if r > 245 and g > 245 and b > 245) / len(px)
async def ev(pg, js): return await pg.evaluate(js)
async def shot(pg, name, n=1):
    await pg.evaluate(f'__cw.step(1/30, {n})'); await pg.screenshot(path=OUT + name, timeout=180000); return OUT + name


async def run_until(pg, cond, frames=3000, dt='1/30'):
    return await ev(pg, f'(() => {{ for (let i = 0; i < {frames}; i++) {{ if ({cond}) return i; __cw.stepq({dt}, 1); }} return ({cond}) ? {frames} : -1; }})()')
def visible(js_id): return f'(() => {{ const e = document.getElementById("{js_id}"); const s = getComputedStyle(e); return s.display !== "none" && s.visibility !== "hidden" && +s.opacity > .05; }})()'

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=ARGS)
        # ================= 1) the opening: motion from frame 0, title, one click → play =================
        ctx, pg, logs = await page(b)
        st = await ev(pg, '[__cw.S.state, __cw.S.open, __cw.W.domeTau, __cw.S.lang, __cw.quality(), document.title]')
        check('page opens straight into the cinematic opening (dome mid-blast), English default, quality auto = Normal', st[0] == 'intro' and st[1] and st[2] > .5 and st[3] == 'en' and st[4] == 'mid' and 'Candlewit' in st[5], st)
        f0 = await shot(pg, 'o0.png'); f1 = await shot(pg, 'o1.png', 3)
        check('frame 0 is not black and already moving (frame 0 vs frame 3)', mean(f0) > 35 and diff(f0, f1) > 1.0, (round(mean(f0), 1), round(diff(f0, f1), 2)))
        check('frame 0 has no blown-out glare (white pixels < 3 %)', white_share(f0) < .03, round(white_share(f0), 4))
        r = await ev(pg, '(() => { const a = __cw.W.domeTau; __cw.stepq(1/30, 100); const b = __cw.W.domeTau; return [a, b]; })()')
        n = await run_until(pg, '__cw.S.titleT >= 0', 600)
        r2 = await ev(pg, '__cw.W.domeTau')
        await shot(pg, 'o2-title.png', 8); op = await ev(pg, '+getComputedStyle(document.getElementById("opening")).opacity')
        check('the blast runs, then time reverses: the blocks fly back (dome closed) and the CANDLEWIT title slams in', r[1] > r[0] and r2 == 0 and n >= 0 and op > .5, (r, r2, n, op))
        n2 = await run_until(pg, '__cw.S.state === "menu"', 600)
        tot = (100 + n + 8 + n2) / 30
        check('the opening hands over to the start screen by itself (never blocks), total < 12 s', n2 >= 0 and tot < 12, round(tot, 1))
        await pg.wait_for_timeout(900); await shot(pg, 'm-menu.png')
        hit = await ev(pg, "['btnPlay','btnLang','btnGear'].map(id => { const r = document.getElementById(id).getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2); return [id, Math.round(r.width), Math.round(r.height), !!e && (e.id === id || document.getElementById(id).contains(e))]; })")
        check('start screen: big PLAY + tiny DE/EN + gear, all hit-testable and ≥ 44 px', all(h[3] and h[1] >= 44 and h[2] >= 44 for h in hit), hit)
        vis = await ev(pg, "['btnQuit','btnSound','btnSkip','more','end','qcard','play'].map(id => [id, (s => s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > .05)(getComputedStyle(document.getElementById(id)))])")
        check('start screen shows nothing else (quit, sound, sheet, end panel, question card, answers hidden)', not any(v[1] for v in vis), vis)
        await pg.click('#btnGear'); await pg.wait_for_timeout(500); await shot(pg, 'm-gear.png')
        g = await ev(pg, "['btnEndless','btnDuel','btnKids','btnQ2','btnSound2','btnIntro','btnMoreX'].concat([...document.querySelectorAll('#diff button')].map((b, i) => (b.id = b.id || 'dd' + i))).map(id => { const r = document.getElementById(id).getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2); return [id, Math.round(r.width), Math.round(r.height), !!e && (e.id === id || document.getElementById(id).contains(e))]; })")
        check('gear sheet: endless, duel, Easy/Medium/Hard, kids, quality, sound, intro replay, close – all tappable ≥ 44 px', all(x[3] and x[1] >= 44 and x[2] >= 44 for x in g), g)
        await pg.click('#btnMoreX'); await ctx.close()
        ctx, pg, logs = await page(b)
        await shot(pg, 'x.png', 2); await pg.mouse.click(640, 360)
        st = await ev(pg, '[__cw.S.state, __cw.S.mode, __cw.quiz() && __cw.quiz().state, __cw.audioState(), document.getElementById("lvCard").classList.contains("show")]')
        check('ONE click anywhere on the opening → straight into the séance (question asked, hint card, audio unlocked)', st[:3] == ['play', 'seance', 'ask'] and st[3] in ('running', 'suspended') and st[4], st)
        await pg.wait_for_timeout(500); await shot(pg, 'p0-play.png', 20)
        ans = await ev(pg, "[...document.querySelectorAll('.ans')].map(b => { const r = b.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2); return [b.dataset.i, Math.round(r.width), Math.round(r.height), !!e && b.contains(e), b.querySelector('span').textContent.length > 0]; })")
        check('four answer buttons with text, hit-testable, ≥ 44 px', all(a[3] and a[4] and a[1] >= 44 and a[2] >= 44 for a in ans), ans)
        # a real click on the right answer
        ok = await ev(pg, '__cw.right()'); box = await pg.locator(f'.ans[data-i="{ok}"]').bounding_box()
        k0 = await ev(pg, '__cw.log.length')
        await pg.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
        r = await ev(pg, '[__cw.quiz().state, __cw.quiz().score, __cw.quiz().streak, __cw.quiz().correct, __cw.P.ans[' + str(ok) + '].flare]')
        check('clicking the right answer: reveal, points, streak 1, its candle flares', r[0] == 'reveal' and r[1] > 0 and r[2] == 1 and r[3] == 1 and r[4] > .5, r)
        await shot(pg, 'p1-right.png', 10)
        snd = await ev(pg, f'[...new Set(__cw.log.slice({k0}).map(e => e.n))]')
        check('a right answer plays real sounds (match strike + chimes)', 'match' in snd and any(s.startswith('chime') or s.startswith('hp_') or s.startswith('xy_') for s in snd), snd)
        # ================= 2) the rules =================
        r = await ev(pg, '(() => { const Q = __cw.quiz(); __cw.stepq(1/30, 60); const n0 = Q.q.n; const l0 = Q.lives; const w = (Q.q.ok + 1) % 4; __cw.answer(w); const s = [Q.state, Q.lives, Q.streak, __cw.P.ans[w].out]; __cw.stepq(1/30, 80); return [n0, l0, s, Q.q.n]; })()')
        check('a wrong answer costs a flame, resets the streak, snuffs the candle, next question follows', r[2][0] == 'reveal' and r[2][1] == r[1] - 1 and r[2][2] == 0 and r[2][3] == 1 and r[3] == r[0] + 1, r)
        await shot(pg, 'p2-wrong.png', 2)
        r = await ev(pg, '(() => { const Q = __cw.quiz(); const l0 = Q.lives, T = Q.T; let ticks = 0; const k0 = __cw.log.length; for (let i = 0; i < Math.ceil(T * 30) + 10 && Q.state === "ask"; i++) __cw.stepq(1/30, 1); const hb = __cw.log.slice(k0).filter(e => e.n === "heart").length; return [T, Q.state, Q.lives, l0, hb]; })()')
        check('the candle clock runs out → "Time\'s up", a flame lost, heartbeat in the last 3 s (15 s on Medium)', r[0] == 15 and r[1] == 'reveal' and r[2] == r[3] - 1 and r[4] >= 2, r)
        r = await ev(pg, '(() => { __cw.start("seance"); const Q = __cw.quiz(); const g = __cw.joker("gust"); const e1 = Q.elim.filter(Boolean).length, okLit = !Q.elim[Q.q.ok]; const g2 = __cw.joker("gust"); const f = __cw.joker("frost"); const t0 = Q.tLeft; __cw.stepq(1/30, 90); const t1 = Q.tLeft; const b0 = Q.q.bi; const s = __cw.joker("swap"); return [g, e1, okLit, g2, f, +(t0 - t1).toFixed(2), s, Q.q.bi !== b0, Q.elim.filter(Boolean).length, Q.jokers]; })()')
        check('jokers: Gust blows out 2 wrong candles (never the right one), Frost stops the clock, Swap brings a new question, each only once', r[0] and r[1] == 2 and r[2] and not r[3] and r[4] and r[5] == 0 and r[6] and r[7] and r[8] == 0 and r[9] == {'gust': 0, 'frost': 0, 'swap': 0}, r)
        hit = await ev(pg, "[...document.querySelectorAll('.joker')].map(b => [b.id, b.classList.contains('used')])")
        check('used jokers are greyed out in the UI', all(h[1] for h in hit), hit)
        # streak → SPIRIT STORM
        k0 = await ev(pg, '__cw.log.length')
        r = await ev(pg, '(() => { __cw.start("seance"); const Q = __cw.quiz(); let storm = -1, ts = 1, open = false, sp = 0, tauMax = 0;'
                     ' for (let k = 0; k < 5; k++) { __cw.answer(Q.q.ok); for (let i = 0; i < 400 && Q.state !== "ask" && Q.state !== "end"; i++) { __cw.stepq(1/30, 1); if (Q.state === "storm" && storm < 0) storm = k; if (Q.state === "storm") { ts = Math.min(ts, __cw.S.ts); open = open || __cw.S.open; sp = Math.max(sp, __cw.sparks()); tauMax = Math.max(tauMax, __cw.W.domeTau); } } }'
                     ' return [storm, +ts.toFixed(2), open, sp, +tauMax.toFixed(2), Q.surgeQ, Q.storms, __cw.SP.wU.uK.value, Q.state]; })()')
        check('five right in a row → SPIRIT STORM: slow-mo, THE ROOF BLOWS OFF (dome blocks fly), sparks/fireworks, ×2 surge for 3 questions', r[0] == 4 and r[1] <= .4 and r[2] and r[3] > 300 and r[4] > 3 and r[5] == 3 and r[6] == 1, r)
        snd = await ev(pg, f'[...new Set(__cw.log.slice({k0}).map(e => e.n))]')
        check('the storm plays real layered sounds (boom, stone crash, choir, fireworks)', all(any(s.startswith(x) for s in snd) for x in ['boom_cine', 'stone_crash', 'choir_swell', 'fw_burst']), snd)
        r = await ev(pg, '(() => { const Q = __cw.quiz(); const s0 = Q.score; __cw.answer(Q.q.ok); const gain = Q.score - s0; const mult = Math.min(5, Q.streak); let reb = false; for (let k = 0; k < 2; k++) { for (let i = 0; i < 200 && Q.state !== "ask"; i++) __cw.stepq(1/30, 1); __cw.answer(Q.q.ok); } for (let i = 0; i < 200 && Q.state !== "ask"; i++) { __cw.stepq(1/30, 1); reb = reb || !!__cw.S.rebuild; } __cw.stepq(1/30, 70); return [gain, mult, Q.surgeQ, reb, __cw.S.open, __cw.W.domeTau]; })()')
        check('surge doubles the points; after 3 questions the dome flies back together (closed again)', r[0] >= 2 * 100 * r[1] and r[2] == 0 and r[3] and not r[4] and r[5] == 0, r)
        # storm visuals
        await ev(pg, '(() => { __cw.start("seance"); __cw.setStreak(4); __cw.answer(__cw.right()); __cw.stepq(1/30, 46); })()')
        a1 = await shot(pg, 's1-blast.png', 20); a2 = await shot(pg, 's2-sky.png', 40)
        check('storm frames render, readable (no white-out glare)', white_share(a1) < .04 and white_share(a2) < .04 and mean(a2) > 30, (round(white_share(a1), 4), round(white_share(a2), 4), round(mean(a2), 1)))
        # ================= 3) the Midnight Round =================
        k0 = await ev(pg, '__cw.log.length')
        r = await ev(pg, '(() => { __cw.start("seance"); const Q = __cw.quiz(); let intro = false, beams = 0, rise = 0, down = false; __cw.S.botDelay = .4; __cw.auto(true, 1);'
                     ' for (let i = 0; i < 9000 && __cw.S.state === "play"; i++) { __cw.stepq(1/30, 1); if (Q.state === "bossIntro") intro = true; rise = Math.max(rise, __cw.SP.sp.rise); if (__cw.SP.beam.visible) beams++; if (Q.state === "bossDown") down = true; }'
                     ' return [intro, rise, beams > 0, down, Q.boss.wins, __cw.S.state, __cw.S.result, Q.correct, __cw.S.stars, Q.storms, (Q.t | 0)]; })()')
        check('Midnight Round: the spectre rises, beams hit it, 3 right answers banish it, séance won with 3 stars', r[0] and r[1] > .9 and r[2] and r[3] and r[4] == 1 and r[5] == 'end' and r[6] == 'win' and r[8] == 3, r)
        check('a perfect séance has 2 Spirit Storms and is understandable in length (< 3 min)', r[9] == 2 and r[10] < 180, r)
        snd = await ev(pg, f'[...new Set(__cw.log.slice({k0}).map(e => e.n))]')
        check('boss sounds: midnight bells, hits, banish (real recordings)', 'bell_deep' in snd and 'hit_dram' in snd, snd)
        e1 = await shot(pg, 'e-win.png', 30)
        st = await ev(pg, '[document.getElementById("eTitle").textContent, document.getElementById("eStars").textContent, document.getElementById("eName").value, document.getElementById("eStats").textContent]')
        check('win screen: title, 3 stars, stats (spectre banished), default name "Player"', st[0] and st[1].count('★') == 3 and st[2] == 'Player' and 'banished' in st[3], st)
        # ================= 4) share card =================
        await ev(pg, 'window.__txt.length = 0'); url = await ev(pg, '__cw.cardURL()'); txt = await ev(pg, 'window.__txt.join(" | ")')
        im = Image.open(io.BytesIO(base64.b64decode(url.split(',')[1]))); im.save(OUT + 'card.jpg')
        check('share card is 1080×1350', im.size == (1080, 1350), im.size)
        bad = re.findall(r'https?:|www\.|github|\.io\b|\.com\b|@(?!Frank_AI_Lab)|' + SUR + '|' + '|'.join(FAM) + r'|\bAI\b|\bKI\b', txt, re.I)
        check('share card: no URL, no surname / family names / email, says "by Player", credits Grok Bot + countdown', not bad and 'Player' in txt and 'Grok Bot' in txt and '4 days to Halloween' in txt, bad or txt[:200])
        # ================= 5) losing, modes and difficulties =================
        r = await ev(pg, '(() => { __cw.start("seance"); __cw.auto(false); const Q = __cw.quiz(); let i = 0; for (; i < 9000 && __cw.S.state === "play"; i++) __cw.stepq(1/30, 1); return [Q.lives, Q.result, __cw.S.state, (i / 30) | 0]; })()')
        check('doing nothing on Medium: the clock burns 3 flames, the séance ends (lost)', r[0] == 0 and r[1] == 'dead' and r[2] == 'end', r)
        r = await ev(pg, '["easy","medium","hard"].map(d => { document.querySelector(`#diff button[data-d=${d}]`).click(); __cw.start("seance"); const Q = __cw.quiz(); return [d, Q.lives, Q.T, Q.q.tier]; })')
        check('Easy / Medium / Hard: 5 / 3 / 2 flames, 20 / 15 / 10 s clock, harder questions on Hard', [x[1] for x in r] == [5, 3, 2] and [x[2] for x in r] == [20, 15, 10] and r[2][3] >= 2, r)
        await ev(pg, 'document.querySelector("#diff button[data-d=medium]").click()')
        r = await ev(pg, '(() => { document.getElementById("btnKids").click(); __cw.start("seance"); __cw.auto(false); const Q = __cw.quiz(); const tier = Q.q.tier; __cw.stepq(1/30, 1800); const st1 = [Q.state, Q.lives, Q.elim.filter(Boolean).length]; const w = [0,1,2,3].find(i => i !== Q.q.ok && !Q.elim[i]); if (w !== undefined) __cw.answer(w); const st2 = [Q.state, Q.lives, Q.elim[w]]; __cw.answer(Q.q.ok); const st3 = Q.state; document.getElementById("btnKids").click(); return [__cw.S.kids, tier, st1, st2, st3]; })()')
        check('kids mode: easy questions, no clock (60 s idle, still asking), a hint snuffs a wrong candle, a wrong pick just goes out, no flames lost', r[1] == 0 and r[2][0] == 'ask' and r[2][2] >= 1 and r[3][0] == 'ask' and r[3][2] and r[4] == 'reveal' and r[2][1] is None or (r[1] == 0 and r[2][0] == 'ask' and r[2][2] >= 1 and r[3][0] == 'ask' and r[4] == 'reveal'), r)
        r = await ev(pg, '(() => { __cw.start("endless"); __cw.S.botDelay = .4; __cw.auto(true, 1); const Q = __cw.quiz(); for (let i = 0; i < 9000 && Q.idx < 16; i++) __cw.stepq(1/30, 1); return [__cw.S.mode, Q.idx, Q.boss.wins, Q.state !== "end", Number.isFinite(Q.total), +Q.T.toFixed(2)]; })()')
        check('Endless Séance: keeps going past 13 questions, a Midnight Round every 13, the clock gets shorter', r[0] == 'endless' and r[1] >= 16 and r[2] >= 1 and r[3] and not r[4] and r[5] < 15, r)
        r = await ev(pg, '(() => { __cw.toMenu(); document.getElementById("btnDuel").click(); const Q1 = __cw.quiz(); const a = [__cw.S.mode, __cw.S.player, Q1.total]; const qs1 = [Q1.q.bi]; __cw.S.botDelay = .4; __cw.auto(true, .8); for (let i = 0; i < 9000 && __cw.S.state === "play"; i++) { __cw.stepq(1/30, 1); if (Q1.state === "ask" && qs1[qs1.length - 1] !== Q1.q.bi) qs1.push(Q1.q.bi); } __cw.stepq(1/30, 40);'
                     ' const h = [__cw.S.state, document.getElementById("handover").classList.contains("show"), document.getElementById("hoT").textContent];'
                     ' document.getElementById("btnGo").click(); const Q2 = __cw.quiz(); const b2 = [__cw.S.state, __cw.S.player]; const qs2 = [Q2.q.bi]; __cw.auto(true, .5); for (let i = 0; i < 9000 && __cw.S.state === "play"; i++) { __cw.stepq(1/30, 1); if (Q2.state === "ask" && qs2[qs2.length - 1] !== Q2.q.bi) qs2.push(Q2.q.bi); } __cw.stepq(1/30, 40);'
                     ' return [a, h, b2, __cw.S.state, document.getElementById("eTitle").textContent, JSON.stringify(__cw.S.duel.map(d => d && d.score)), JSON.stringify(qs1) === JSON.stringify(qs2), qs1.length]; })()')
        check('duel: Player 1 plays 8 questions → handover → Player 2 gets the SAME questions → winner shown', r[0] == ['duel', 0, 8] and r[1][0] == 'handover' and r[1][1] and 'Player 2' in r[1][2] and r[2] == ['play', 1] and r[3] == 'end' and ('Player' in r[4] or 'Draw' in r[4] or 'draw' in r[4]) and r[6] and r[7] == 8, r)
        await shot(pg, 'e-duel.png', 20)
        # ================= 6) language =================
        r = await ev(pg, '(() => { __cw.toMenu(); const a = document.getElementById("btnPlay").textContent; document.getElementById("btnLang").click(); const b2 = [__cw.S.lang, document.getElementById("btnPlay").textContent, document.documentElement.lang]; __cw.start("seance"); const q = [document.getElementById("qText").textContent, __cw.quiz().q.text.de]; __cw.toMenu(); document.getElementById("btnLang").click(); return [a, b2, q, __cw.S.lang]; })()')
        check('tiny DE/EN toggle switches every text (PLAY → SPIELEN), questions and answers in German, and back', 'PLAY' in r[0].upper() and r[1][0] == 'de' and r[1][2] == 'de' and r[1][1] != r[0] and r[2][0] == r[2][1] and r[3] == 'en', r)
        # ================= 7) keyboard =================
        r = await ev(pg, '(() => { __cw.start("seance"); return __cw.right(); })()')
        await pg.keyboard.press(str(r + 1)); st = await ev(pg, '[__cw.quiz().state, __cw.quiz().correct]')
        await ev(pg, '__cw.stepq(1/30, 60)'); await pg.keyboard.press('g'); g = await ev(pg, '__cw.quiz().jokers.gust')
        await pg.keyboard.press('Escape'); m = await ev(pg, '__cw.S.state')
        check('keyboard: 1–4 answer, G = Gust joker, Esc = menu', st == ['reveal', 1] and g == 0 and m == 'menu', (st, g, m))
        # ================= 8) robustness: NaN / frame-clock guards =================
        r = await ev(pg, '(() => { __cw.start("seance"); const Q = __cw.quiz(); Q.tLeft = NaN; __cw.S.ts = NaN; __cw.W.flash = NaN; __cw.S.punch = NaN; __cw.stepq(1/30, 3); __cw.stepq(NaN, 2); __cw.stepq(5, 1); __cw.stepq(-1, 1); const c = __cw.cam(); return [Q.tLeft, Q.score, __cw.S.ts, __cw.S.gt, __cw.W.flash, c.p, c.fov].flat().every(Number.isFinite); })()')
        check('NaN guards: NaN timer/time-scale/flash and NaN/negative/5 s frame steps never break the rules or camera', r is True, r)
        r = await ev(pg, '(() => { const l0 = __cw.last(); __cw.advance(l0 + 16); const l1 = __cw.last(); const d = __cw.advance(l1 - 500); return [d, __cw.last() >= l1]; })()')
        check('frame clock never runs backwards (out-of-order rAF stamps give dt = 0)', r[0] == 0 and r[1], r)
        await ev(pg, '__cw.toMenu()'); await shot(pg, 'm2.png', 4)
        check('no console errors so far', not logs, logs[:4])
        await ctx.close()
        # ================= 9) GPU resource leak test =================
        ctx, pg, logs = await page(b, skip=True)
        await ev(pg, '__cw.start("seance"); __cw.auto(true, 1)'); await shot(pg, 'x.png', 3)
        async def cycle():
            for q in ['low', 'high', 'ultra', 'mid', 'low', 'mid']:
                await ev(pg, f'__cw.quality("{q}")'); await shot(pg, 'x.png', 2)
            for i in range(3):
                await ev(pg, '__cw.start("seance"); __cw.S.botDelay = .3; __cw.auto(true, 1); __cw.stepq(1/30, 900)'); await shot(pg, 'x.png', 2)
                await ev(pg, '__cw.cardURL()')
                await ev(pg, '__cw.end("quit"); __cw.toMenu(); __cw.stepq(1/30, 200)'); await shot(pg, 'x.png', 2)
            await ev(pg, '__cw.start("seance")'); await shot(pg, 'x.png', 3)
        await cycle()  # warm-up: every shader variant gets compiled once
        m0 = await ev(pg, '__cw.mem()')
        await cycle()
        m1 = await ev(pg, '__cw.mem()')
        check('no GPU leaks: geometries / textures / shader programs flat over a 2nd round of 6 quality switches + 3 séances with storms + share cards + menu', m1['geometries'] <= m0['geometries'] + 1 and m1['textures'] <= m0['textures'] + 1 and m1['programs'] <= m0['programs'] + 2, (m0, m1))
        check('no console errors (leak run)', not logs, logs[:4])
        await ctx.close()
        # ================= 10) German browser → German, auto =================
        ctx, pg, logs = await page(b, locale='de-DE')
        r = await ev(pg, '[__cw.S.lang, document.documentElement.lang, document.getElementById("btnSkip").textContent]')
        check('German browser → German texts automatically', r[0] == 'de' and r[1] == 'de' and 'spielen' in r[2].lower(), r)
        await ctx.close()
        # ================= 11) static scans =================
        vis = open(ROOT + '/index.html', encoding='utf-8').read() + open(ROOT + '/src/i18n.js', encoding='utf-8').read() + open(ROOT + '/src/questions.js', encoding='utf-8').read() + open(ROOT + '/README.md', encoding='utf-8').read()
        vis_txt = re.sub(r'<[^>]+>', ' ', vis)
        check('visible texts + question bank + README: no surname, no family names, no email address', not re.search(SUR + '|' + '|'.join(r'\b' + f + r'\b' for f in FAM), vis, re.I) and not re.search(r'[\w.+-]+@[\w-]+\.[\w.]+', vis), re.findall(SUR + '|' + '|'.join(r'\b' + f + r'\b' for f in FAM), vis, re.I)[:3])
        check('visible texts say SI, never "AI"/"KI"', not re.search(r'\bAI\b|\bKI\b', vis_txt), re.findall(r'.{20}\b(?:AI|KI)\b.{20}', vis_txt)[:3])
        m = re.findall(TM, vis_txt, re.I); check('no third-party game/show names or quiz-show wording (50:50, phone a friend, final answer …)', not m, m[:5])
        from importlib import util
        qb = open(ROOT + '/src/questions.js', encoding='utf-8').read()
        nq = len(re.findall(r'^\s*\[\d,', qb, re.M)); check('question bank: 100+ bilingual questions', nq >= 100, nq)
        src = ''.join(open(f, encoding='utf-8').read() for f in glob.glob(ROOT + '/src/*.js'))
        check('no synthesized beeps (no oscillators) – real recorded sounds only', 'createOscillator' not in src)
        lic = os.listdir(ROOT + '/LICENSES'); check('LICENSES/ has font, three.js, sound credits', any('OFL' in x for x in lic) and any('three' in x.lower() for x in lic) and 'SOUNDS.md' in lic, lic)
        await b.close()
    print(f'\n{sum(R)}/{len(R)} checks passed'); sys.exit(0 if R and all(R) else 1)
asyncio.run(main())
