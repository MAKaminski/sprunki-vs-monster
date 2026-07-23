/* ============================================================
   SPRUNKI vs MONSTERS  — a tiny arcade game
   Vanilla JS. Top-down stealth + rhythm "Beat Battle".
   Goal: defeat every monster in each arena. Sneak up behind a
   monster for a Beat Battle head-start; get spotted and you
   fight at a disadvantage. Clear all levels to win.
   ============================================================ */
(function () {
  "use strict";

  /* ---------------- tiny helpers ---------------- */
  const $ = (s) => document.querySelector(s);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const dist2 = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;
  const rand = (a, b) => a + Math.random() * (b - a);

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  const LEVELS = 4;

  /* ---------------- audio engine ---------------- */
  const Sound = (() => {
    let ctx = null, master = null, muted = false;
    function ensure() {
      if (ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
    }
    function resume() { ensure(); if (ctx && ctx.state === "suspended") ctx.resume(); }
    function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.9; }
    function isMuted() { return muted; }
    function now() { return ctx ? ctx.currentTime : 0; }

    function tone(freq, t, dur, type, vol, glideTo) {
      if (!ctx || muted) return;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || "square";
      o.frequency.setValueAtTime(freq, t);
      if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + dur + 0.02);
    }
    const sfx = {
      pick() { const t = now(); tone(520, t, 0.09, "square", 0.18, 720); },
      start() { const t = now(); tone(330, t, 0.1, "square", 0.2, 440); tone(440, t + 0.1, 0.14, "square", 0.2, 660); },
      spotted() { const t = now(); tone(300, t, 0.14, "sawtooth", 0.25, 120); tone(200, t + 0.08, 0.2, "sawtooth", 0.22, 90); },
      sneak() { const t = now(); tone(700, t, 0.08, "square", 0.2, 950); tone(950, t + 0.07, 0.1, "square", 0.2, 1200); },
      hit(good) { const t = now(); good ? tone(660, t, 0.09, "square", 0.2, 990) : tone(180, t, 0.12, "sawtooth", 0.18, 110); },
      win() { const t = now(); [523, 659, 784, 1046].forEach((f, i) => tone(f, t + i * 0.09, 0.14, "square", 0.2)); },
      lose() { const t = now(); [392, 330, 262, 196].forEach((f, i) => tone(f, t + i * 0.11, 0.16, "sawtooth", 0.2)); },
      victory() { const t = now(); [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, t + i * 0.12, 0.2, "square", 0.22)); },
    };
    return { ensure, resume, setMuted, isMuted, now, tone, sfx };
  })();

  /* ---------------- characters ---------------- */
  const CHARS = [
    { id: "orb",   name: "Orbo",  color: "#38f9d7", accent: "#0a4d45", perk: "Balanced beat-maker", speed: 1.0,  forgive: 1.0,  stealth: 1.0,  eye: "#0a2a26" },
    { id: "flare", name: "Flare", color: "#ff4bd8", accent: "#5c0a4a", perk: "Fast feet (+speed)",   speed: 1.22, forgive: 0.9,  stealth: 1.0,  eye: "#3a0730" },
    { id: "sunny", name: "Sunny", color: "#ffd23f", accent: "#6b5200", perk: "Big ears (wider hits)", speed: 0.95, forgive: 1.4, stealth: 1.0,  eye: "#4d3d00" },
    { id: "blue",  name: "Bloop", color: "#8a7bff", accent: "#2c2560", perk: "Sneaky (smaller cones)", speed: 1.0, forgive: 1.1, stealth: 0.78, eye: "#221a52" },
  ];

  function drawSprunki(c, x, y, r, ch, t, bob) {
    c.save();
    c.translate(x, y + (bob ? Math.sin(t / 220) * r * 0.06 : 0));
    c.globalAlpha = 0.28; c.fillStyle = "#000";
    c.beginPath(); c.ellipse(0, r * 0.95, r * 0.8, r * 0.28, 0, 0, 7); c.fill();
    c.globalAlpha = 1;
    const g = c.createLinearGradient(0, -r, 0, r);
    g.addColorStop(0, ch.color); g.addColorStop(1, ch.accent);
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(0, -r);
    c.bezierCurveTo(r * 1.05, -r, r * 1.1, r * 0.7, 0, r);
    c.bezierCurveTo(-r * 1.1, r * 0.7, -r * 1.05, -r, 0, -r);
    c.fill();
    c.fillStyle = "#fff";
    c.beginPath(); c.ellipse(-r * 0.32, -r * 0.15, r * 0.24, r * 0.3, 0, 0, 7); c.fill();
    c.beginPath(); c.ellipse(r * 0.32, -r * 0.15, r * 0.24, r * 0.3, 0, 0, 7); c.fill();
    const blink = (Math.floor(t / 2600) % 5 === 0 && (t % 2600) < 140);
    c.fillStyle = ch.eye;
    if (!blink) {
      c.beginPath(); c.arc(-r * 0.28, -r * 0.1, r * 0.11, 0, 7); c.fill();
      c.beginPath(); c.arc(r * 0.36, -r * 0.1, r * 0.11, 0, 7); c.fill();
    }
    c.strokeStyle = ch.eye; c.lineWidth = r * 0.11; c.lineCap = "round";
    c.beginPath(); c.arc(0, r * 0.28, r * 0.34, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
    c.restore();
  }

  /* ---------------- global-ish state ---------------- */
  const Game = { screen: "title", char: CHARS[0], lives: 3, level: 0 };

  function show(name) {
    Game.screen = name;
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    $("#screen-" + name).classList.add("active");
  }

  /* ---------------- overlay ---------------- */
  let ovCb = null;
  function overlay(title, msg, btn, cb) {
    $("#ov-title").textContent = title;
    $("#ov-msg").textContent = msg;
    $("#ov-btn").textContent = btn || "Continue";
    ovCb = cb;
    $("#overlay").classList.add("show");
  }

  /* ================================================================
     ARENA (stealth)
     ================================================================ */
  const Arena = (() => {
    const cv = $("#arena"), ctx = cv.getContext("2d");
    const W = cv.width, H = cv.height;
    const CONE_ANGLE = 0.42, CONE_RANGE = 190;
    let player, walls, monsters, raf = 0, last = 0, running = false;
    const keys = {};
    let drag = null, spawnGuard = 0, particles = [];

    function makeLevel(n) {
      walls = [
        { x: 150, y: 120, w: 120, h: 28 },
        { x: 690, y: 120, w: 120, h: 28 },
        { x: 466, y: 90,  w: 28,  h: 150 },
        { x: 120, y: 330, w: 200, h: 28 },
        { x: 640, y: 330, w: 200, h: 28 },
        { x: 300, y: 430, w: 28,  h: 150 },
        { x: 632, y: 430, w: 28,  h: 150 },
        { x: 430, y: 388, w: 110, h: 28 },
      ];
      const count = clamp(1 + n, 1, 6);
      const spots = [
        { x: 200, y: 220 }, { x: 760, y: 220 }, { x: 480, y: 300 },
        { x: 200, y: 500 }, { x: 760, y: 500 }, { x: 480, y: 520 },
      ];
      const cols = ["#ff5470", "#ff884b", "#c04bff", "#4bff9e", "#4bb8ff", "#ff4bd8"];
      monsters = [];
      for (let i = 0; i < count; i++) {
        const s = spots[i];
        monsters.push({
          x: s.x, y: s.y, r: 22,
          ax: s.x, ay: s.y,
          bx: clamp(s.x + rand(-150, 150), 70, W - 70),
          by: clamp(s.y + rand(-100, 100), 70, H - 70),
          t: Math.random(), dir: 1,
          speed: rand(0.04, 0.07) + n * 0.004,
          angle: rand(0, Math.PI * 2), face: 0, wobble: rand(0, 6),
          color: cols[i % cols.length], detect: 0, alive: true,
        });
      }
      player = { x: 60, y: 60, vx: 0, vy: 0, r: 18, inv: 1400, t: 0 };
      particles = [];
      spawnGuard = 800;
      updateHud();
    }

    function updateHud() {
      const leftN = monsters.filter((m) => m.alive).length;
      $("#hud-monsters").textContent = leftN;
      let hearts = "";
      for (let i = 0; i < Game.lives; i++) hearts += "💗";
      for (let i = Game.lives; i < 3; i++) hearts += "🖤";
      $("#hud-lives").innerHTML = hearts;
    }

    function rectHit(px, py, pr, r) {
      const cx = clamp(px, r.x, r.x + r.w), cy = clamp(py, r.y, r.y + r.h);
      return dist2(px, py, cx, cy) < pr * pr;
    }
    function los(x0, y0, x1, y1) {
      const steps = 26;
      for (let i = 1; i < steps; i++) {
        const x = lerp(x0, x1, i / steps), y = lerp(y0, y1, i / steps);
        for (const w of walls) if (x >= w.x && x <= w.x + w.w && y >= w.y && y <= w.y + w.h) return false;
      }
      return true;
    }

    function start(level) {
      Game.level = level;
      makeLevel(level);
      show("game");
      $("#arena-hint").textContent = "Sneak up behind a monster to ambush it — or fight at a disadvantage if it spots you.";
      run();
    }
    // resume the SAME level after a battle, keeping monster alive-states
    function resume() {
      // reposition player to nearest safe corner, grant brief invulnerability
      const corners = [{ x: 60, y: 60 }, { x: W - 60, y: 60 }, { x: 60, y: H - 60 }, { x: W - 60, y: H - 60 }];
      let bestC = corners[0], bestD = -1;
      for (const c of corners) {
        let d = 1e9;
        for (const m of monsters) if (m.alive) d = Math.min(d, dist2(c.x, c.y, m.x, m.y));
        if (d > bestD) { bestD = d; bestC = c; }
      }
      player.x = bestC.x; player.y = bestC.y; player.vx = player.vy = 0; player.inv = 1600;
      for (const m of monsters) m.detect = 0;
      spawnGuard = 700;
      show("game");
      updateHud();
      run();
    }
    function run() { running = true; last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); }
    function stop() { running = false; cancelAnimationFrame(raf); }

    function moveMonster(m, dt) {
      m.t += m.dir * m.speed * dt / 1000;
      if (m.t >= 1) { m.t = 1; m.dir = -1; }
      if (m.t <= 0) { m.t = 0; m.dir = 1; }
      const nx = lerp(m.ax, m.bx, m.t), ny = lerp(m.ay, m.by, m.t);
      const mdx = nx - m.x, mdy = ny - m.y;
      m.x = nx; m.y = ny;
      m.wobble += dt * 0.0016;
      const scan = Math.sin(m.wobble) * 0.6;
      if (Math.abs(mdx) + Math.abs(mdy) > 0.02) m.face = Math.atan2(mdy, mdx);
      m.angle = m.face + scan;
    }

    function seesPlayer(m) {
      const stealth = Game.char.stealth || 1;
      const range = CONE_RANGE * stealth;
      if (dist2(m.x, m.y, player.x, player.y) > range * range) return false;
      const a = Math.atan2(player.y - m.y, player.x - m.x);
      const diff = Math.abs(((a - m.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (diff > CONE_ANGLE * stealth) return false;
      return los(m.x, m.y, player.x, player.y);
    }

    function burst(x, y, color, n) {
      for (let i = 0; i < n; i++) particles.push({
        x, y, vx: rand(-0.25, 0.25), vy: rand(-0.25, 0.25), life: rand(300, 700), t: 0, color, r: rand(2, 5),
      });
    }

    function loop(now) {
      if (!running) return;
      const dt = Math.min(40, now - last); last = now;
      update(dt); render(now);
      raf = requestAnimationFrame(loop);
    }

    function update(dt) {
      const p = player; p.t += dt;
      if (p.inv > 0) p.inv -= dt;
      if (spawnGuard > 0) spawnGuard -= dt;

      let ix = 0, iy = 0;
      if (keys.ArrowLeft || keys.a || keys.A) ix -= 1;
      if (keys.ArrowRight || keys.d || keys.D) ix += 1;
      if (keys.ArrowUp || keys.w || keys.W) iy -= 1;
      if (keys.ArrowDown || keys.s || keys.S) iy += 1;
      if (drag) {
        const dx = drag.x - p.x, dy = drag.y - p.y, d = Math.hypot(dx, dy);
        if (d > 6) { ix = dx / d; iy = dy / d; }
      }
      const has = Math.hypot(ix, iy) > 0;
      const mag = Math.hypot(ix, iy) || 1;
      const spd = 0.34 * Game.char.speed;
      const tvx = has ? (ix / mag) * spd : 0;
      const tvy = has ? (iy / mag) * spd : 0;
      p.vx = lerp(p.vx, tvx, 0.25); p.vy = lerp(p.vy, tvy, 0.25);

      const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
      if (!walls.some((w) => rectHit(nx, p.y, p.r, w))) p.x = clamp(nx, p.r, W - p.r); else p.vx = 0;
      if (!walls.some((w) => rectHit(p.x, ny, p.r, w))) p.y = clamp(ny, p.r, H - p.r); else p.vy = 0;

      let spotted = null, sneak = null;
      for (const m of monsters) {
        if (!m.alive) continue;
        moveMonster(m, dt);
        const touching = dist2(m.x, m.y, p.x, p.y) < (m.r + p.r) * (m.r + p.r);
        const sees = seesPlayer(m);
        if (spawnGuard <= 0 && p.inv <= 0) {
          if (sees) { m.detect += dt; if (m.detect > 240) spotted = m; }
          else m.detect = Math.max(0, m.detect - dt * 0.9);
          if (touching && !sees) sneak = m;
        }
      }

      for (const pt of particles) { pt.t += dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; }
      particles = particles.filter((pt) => pt.t < pt.life);

      $("#hud-alert").textContent = monsters.some((m) => m.alive && m.detect > 40) ? "!  SPOTTED  !" : "";

      if (sneak) { stop(); Sound.sfx.sneak(); enterBattle(sneak, true); return; }
      if (spotted) { stop(); Sound.sfx.spotted(); enterBattle(spotted, false); return; }
    }

    function render(now) {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#0c0c22"; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(255,255,255,.04)"; ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      for (const w of walls) {
        ctx.fillStyle = "#20204a"; ctx.strokeStyle = "rgba(138,123,255,.5)"; ctx.lineWidth = 2;
        roundRect(ctx, w.x, w.y, w.w, w.h, 8); ctx.fill(); ctx.stroke();
      }

      const stealth = Game.char.stealth || 1;
      for (const m of monsters) {
        if (!m.alive) continue;
        const range = CONE_RANGE * stealth;
        const alertT = clamp(m.detect / 240, 0, 1);
        const base = m.detect > 40 ? "255,84,112" : "255,210,63";
        const cg = ctx.createRadialGradient(m.x, m.y, 6, m.x, m.y, range);
        cg.addColorStop(0, `rgba(${base},${0.2 + alertT * 0.25})`);
        cg.addColorStop(1, `rgba(${base},0)`);
        ctx.fillStyle = cg;
        ctx.beginPath(); ctx.moveTo(m.x, m.y);
        ctx.arc(m.x, m.y, range, m.angle - CONE_ANGLE * stealth, m.angle + CONE_ANGLE * stealth);
        ctx.closePath(); ctx.fill();
        drawMonster(ctx, m, now);
        if (m.detect > 40) {
          ctx.fillStyle = "#ff5470"; ctx.font = "bold 20px Fredoka"; ctx.textAlign = "center";
          ctx.fillText("!", m.x, m.y - m.r - 8);
        }
      }

      for (const pt of particles) {
        ctx.globalAlpha = clamp(1 - pt.t / pt.life, 0, 1);
        ctx.fillStyle = pt.color;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (!(player.inv > 0 && Math.floor(player.t / 90) % 2)) {
        drawSprunki(ctx, player.x, player.y, player.r, Game.char, now, true);
      }
    }

    function drawMonster(c, m, now) {
      c.save(); c.translate(m.x, m.y);
      c.globalAlpha = 0.3; c.fillStyle = "#000";
      c.beginPath(); c.ellipse(0, m.r * 0.9, m.r * 0.8, m.r * 0.28, 0, 0, 7); c.fill();
      c.globalAlpha = 1;
      const spikes = 9, r = m.r;
      c.fillStyle = m.color;
      c.beginPath();
      for (let i = 0; i <= spikes * 2; i++) {
        const ang = (i / (spikes * 2)) * Math.PI * 2 + now / 1600;
        const rr = i % 2 ? r : r * 0.74;
        const x = Math.cos(ang) * rr, y = Math.sin(ang) * rr;
        i ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.closePath(); c.fill();
      const fx = Math.cos(m.angle), fy = Math.sin(m.angle);
      c.fillStyle = "#fff";
      c.beginPath(); c.arc(fx * 5 - 5, fy * 5 - 3, 5, 0, 7); c.fill();
      c.beginPath(); c.arc(fx * 5 + 5, fy * 5 - 3, 5, 0, 7); c.fill();
      c.fillStyle = "#111";
      c.beginPath(); c.arc(fx * 7 - 5, fy * 7 - 3, 2.4, 0, 7); c.fill();
      c.beginPath(); c.arc(fx * 7 + 5, fy * 7 - 3, 2.4, 0, 7); c.fill();
      c.restore();
    }

    // called by Battle when a monster is defeated
    function defeat(monster) {
      monster.alive = false;
      burst(monster.x, monster.y, monster.color, 22);
      updateHud();
      if (monsters.every((m) => !m.alive)) {
        if (Game.level >= LEVELS - 1) { winGame(); }
        else {
          overlay("Arena " + (Game.level + 1) + " cleared!", "Every monster grooved into oblivion. The next arena has more of them…", "Next arena", () => start(Game.level + 1));
        }
        return true; // level over
      }
      return false;
    }

    function toLocal(ev) {
      const r = cv.getBoundingClientRect();
      return { x: (ev.clientX - r.left) / r.width * W, y: (ev.clientY - r.top) / r.height * H };
    }
    cv.addEventListener("pointerdown", (e) => { Sound.resume(); drag = toLocal(e); try { cv.setPointerCapture(e.pointerId); } catch (_) {} });
    cv.addEventListener("pointermove", (e) => { if (drag) drag = toLocal(e); });
    cv.addEventListener("pointerup", () => { drag = null; });
    cv.addEventListener("pointercancel", () => { drag = null; });
    window.addEventListener("keydown", (e) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) e.preventDefault();
      keys[e.key] = true;
    });
    window.addEventListener("keyup", (e) => { keys[e.key] = false; });

    return { start, resume, stop, defeat };
  })();

  /* ================================================================
     BEAT BATTLE (rhythm)
     ================================================================ */
  const Battle = (() => {
    const cv = $("#battle-canvas"), ctx = cv.getContext("2d");
    const W = cv.width, H = cv.height;
    const LANES = 4, LANE_W = W / LANES, HIT_Y = H - 90;
    const KEYMAP = { a: 0, A: 0, s: 1, S: 1, k: 2, K: 2, l: 3, L: 3 };
    const LANE_COLOR = ["#ff5470", "#ffd23f", "#38f9d7", "#8a7bff"];
    let notes, running, raf, start0, foe, progress, combo, speed, padEls, flashes = [];

    function generate(level, isSneak) {
      notes = [];
      const bpm = 96 + level * 8, beat = 60000 / bpm;
      const n = 24 + level * 4;
      let t = 1200, last = -1;
      for (let i = 0; i < n; i++) {
        let lane = Math.floor(Math.random() * LANES);
        if (lane === last && Math.random() < 0.6) lane = (lane + 1) % LANES;
        last = lane;
        notes.push({ lane, time: t, hit: false, missed: false });
        if (level >= 2 && Math.random() < 0.16) {
          const l2 = (lane + 1 + Math.floor(Math.random() * (LANES - 1))) % LANES;
          notes.push({ lane: l2, time: t, hit: false, missed: false });
        }
        t += beat * (Math.random() < 0.28 ? 0.5 : 1);
      }
      progress = isSneak ? 0.55 : 0.35;
      combo = 0;
      speed = 0.42 + level * 0.03;
      flashes = [];
    }

    function enter(monster, isSneak, level) {
      foe = monster;
      generate(level, isSneak);
      $("#battle-foe").textContent = isSneak ? "SNEAK ATTACK!" : "Beat Battle!";
      $("#battle-combo").textContent = "";
      setFill();
      show("battle");
      Sound.resume(); Sound.sfx.start();
      running = true; start0 = performance.now();
      cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
    }

    function setFill() { $("#beatfill").style.width = clamp(progress, 0, 1) * 100 + "%"; }

    function loop(now) {
      if (!running) return;
      const t = now - start0;
      update(t); render(t, now);
      const lastTime = notes.length ? notes[notes.length - 1].time : 0;
      const allDone = notes.every((n) => n.hit || n.missed) && t > lastTime + 350;
      if (progress >= 1) return finish(true);
      if (progress <= 0) return finish(false);
      if (allDone) return finish(progress >= 0.5);
      raf = requestAnimationFrame(loop);
    }

    function update(t) {
      for (const n of notes) {
        if (!n.hit && !n.missed && t - n.time > 150) {
          n.missed = true; combo = 0;
          progress = clamp(progress - 0.05, 0, 1);
          Sound.sfx.hit(false); setFill();
          $("#battle-combo").textContent = "MISS";
        }
      }
      for (const f of flashes) f.t += 16;
      flashes = flashes.filter((f) => f.t < 260);
    }

    function judge(lane) {
      const t = performance.now() - start0;
      let target = null, bd = 1e9;
      for (const n of notes) {
        if (n.lane !== lane || n.hit || n.missed) continue;
        const d = Math.abs(n.time - t);
        if (d < bd) { bd = d; target = n; }
      }
      const win = 150 * (Game.char.forgive || 1);
      if (target && bd <= win) {
        target.hit = true;
        const perfect = bd < 60; combo++;
        progress = clamp(progress + (perfect ? 0.07 : 0.05), 0, 1);
        Sound.sfx.hit(true);
        const scale = [523, 587, 659, 784];
        Sound.tone(scale[lane] * (perfect ? 1 : 0.75), Sound.now(), 0.12, "square", 0.2);
        flashes.push({ lane, t: 0, perfect });
        $("#battle-combo").textContent = (perfect ? "PERFECT ×" : "×") + combo;
      } else {
        combo = 0;
        progress = clamp(progress - 0.02, 0, 1);
        Sound.sfx.hit(false);
        $("#battle-combo").textContent = "";
      }
      setFill();
    }

    function render(t, now) {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#0c0c22"; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < LANES; i++) {
        ctx.fillStyle = i % 2 ? "rgba(255,255,255,.02)" : "rgba(255,255,255,.04)";
        ctx.fillRect(i * LANE_W, 0, LANE_W, H);
        ctx.strokeStyle = "rgba(255,255,255,.06)";
        ctx.beginPath(); ctx.moveTo(i * LANE_W, 0); ctx.lineTo(i * LANE_W, H); ctx.stroke();
      }
      ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, HIT_Y); ctx.lineTo(W, HIT_Y); ctx.stroke();
      for (let i = 0; i < LANES; i++) {
        ctx.strokeStyle = LANE_COLOR[i]; ctx.lineWidth = 2;
        roundRect(ctx, i * LANE_W + 10, HIT_Y - 26, LANE_W - 20, 52, 12); ctx.stroke();
      }
      for (const f of flashes) {
        ctx.globalAlpha = clamp(1 - f.t / 260, 0, 1);
        ctx.fillStyle = f.perfect ? "#fff" : LANE_COLOR[f.lane];
        roundRect(ctx, f.lane * LANE_W + 10, HIT_Y - 26, LANE_W - 20, 52, 12); ctx.fill();
      }
      ctx.globalAlpha = 1;
      for (const n of notes) {
        if (n.hit) continue;
        const y = HIT_Y - (n.time - t) * speed;
        if (y < -40 || y > H + 40) continue;
        const x = n.lane * LANE_W + LANE_W / 2;
        ctx.fillStyle = n.missed ? "rgba(120,120,140,.5)" : LANE_COLOR[n.lane];
        if (!n.missed) { ctx.shadowColor = LANE_COLOR[n.lane]; ctx.shadowBlur = 14; }
        roundRect(ctx, x - LANE_W / 2 + 14, y - 16, LANE_W - 28, 32, 10); ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.save(); ctx.translate(W / 2, 46);
      ctx.fillStyle = foe ? foe.color : "#ff5470";
      const r = 30;
      ctx.beginPath();
      for (let i = 0; i <= 18; i++) {
        const ang = (i / 18) * Math.PI * 2 + now / 1400;
        const rr = i % 2 ? r : r * 0.74;
        i ? ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr) : ctx.moveTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
      }
      ctx.closePath();
      ctx.globalAlpha = 0.4 + 0.6 * (1 - progress); ctx.fill(); ctx.globalAlpha = 1;
      ctx.restore();
    }

    function finish(won) {
      running = false; cancelAnimationFrame(raf);
      if (won) {
        Sound.sfx.win();
        const levelOver = Arena.defeat(foe);
        if (!levelOver) {
          overlay("Beat 'em!", "You out-grooved the monster. Back to the arena — mind the others.", "Continue", () => Arena.resume());
        }
        // if levelOver, Arena.defeat already showed the right overlay
      } else {
        Sound.sfx.lose();
        Game.lives--;
        if (Game.lives <= 0) {
          overlay("Game Over", "The monsters kept the beat this time. Try again?", "Retry", () => { Game.lives = 3; Arena.start(0); });
        } else {
          overlay("Missed the beat!", "You lost a heart — " + Game.lives + " left. Get back out there.", "Continue", () => Arena.resume());
        }
      }
    }

    function bind() {
      padEls = Array.from(document.querySelectorAll(".pad"));
      padEls.forEach((pad) => {
        const lane = +pad.dataset.lane;
        pad.addEventListener("pointerdown", (e) => {
          e.preventDefault();
          if (Game.screen !== "battle") return;
          Sound.resume(); judge(lane); flashPad(lane);
        });
      });
      window.addEventListener("keydown", (e) => {
        if (Game.screen !== "battle" || e.repeat) return;
        const lane = KEYMAP[e.key];
        if (lane != null) { judge(lane); flashPad(lane); }
      });
    }
    function flashPad(lane) {
      const pad = padEls[lane]; if (!pad) return;
      pad.classList.add("hit"); setTimeout(() => pad.classList.remove("hit"), 110);
    }

    return { enter, bind };
  })();

  /* ================================================================
     GLUE
     ================================================================ */
  function enterBattle(monster, isSneak) { Battle.enter(monster, isSneak, Game.level); }

  function winGame() {
    Sound.sfx.victory();
    overlay("YOU WIN! 🎉", Game.char.name + " cleared every arena and is the champion beat-maker!", "Play again", () => { Game.lives = 3; show("title"); });
  }

  /* ---------------- title / roster ---------------- */
  function buildRoster() {
    const root = $("#roster");
    root.innerHTML = "";
    CHARS.forEach((ch, i) => {
      const el = document.createElement("div");
      el.className = "char" + (i === 0 ? " sel" : "");
      el.dataset.id = ch.id;
      const c = document.createElement("canvas");
      c.width = 96; c.height = 96;
      drawSprunki(c.getContext("2d"), 48, 44, 30, ch, 0, false);
      el.appendChild(c);
      const nm = document.createElement("div"); nm.className = "cn"; nm.textContent = ch.name;
      const pk = document.createElement("div"); pk.className = "cp"; pk.textContent = ch.perk;
      el.appendChild(nm); el.appendChild(pk);
      el.addEventListener("click", () => {
        Sound.resume(); Sound.sfx.pick();
        document.querySelectorAll(".char").forEach((x) => x.classList.remove("sel"));
        el.classList.add("sel");
        Game.char = ch;
      });
      root.appendChild(el);
    });
  }

  /* ---------------- boot ---------------- */
  function boot() {
    buildRoster();
    Battle.bind();

    $("#start-btn").addEventListener("click", () => {
      Sound.resume(); Sound.sfx.start();
      Game.lives = 3; Arena.start(0);
    });

    $("#mute-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      Sound.ensure();
      const m = !Sound.isMuted();
      Sound.setMuted(m);
      $("#mute-btn").textContent = m ? "🔇" : "🔊";
    });

    $("#ov-btn").addEventListener("click", () => {
      $("#overlay").classList.remove("show");
      const cb = ovCb; ovCb = null; if (cb) cb();
    });

    const resumeOnce = () => { Sound.resume(); window.removeEventListener("pointerdown", resumeOnce); };
    window.addEventListener("pointerdown", resumeOnce);
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
