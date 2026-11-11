(() => {
  "use strict";

  const CA = "8fGtqve6dHD4MzsFbuQsJwF1TneDTym3iAKovu4kiYmU";
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  /* ---------------- toast + copy ---------------- */
  const toast = $("#toast");
  let toastT;
  const say = (msg) => {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastT);
    toastT = setTimeout(() => toast.classList.remove("show"), 1900);
  };
  const lines = ["Copied. Good boy.", "CA fetched 🦴", "Copied — say hi to the homie", "Sit. Stay. Copied."];
  let li = 0;
  const copyCA = async () => {
    try {
      await navigator.clipboard.writeText(CA);
    } catch {
      const t = document.createElement("textarea");
      t.value = CA; t.style.position = "fixed"; t.style.opacity = "0";
      document.body.appendChild(t); t.select();
      try { document.execCommand("copy"); } catch {}
      t.remove();
    }
    say(lines[li++ % lines.length]);
  };
  const caBox = $("#ca");
  $("#caCopy").addEventListener("click", (e) => {
    copyCA();
    caBox.classList.add("copied");
    e.currentTarget.textContent = "Copied";
    setTimeout(() => { caBox.classList.remove("copied"); $("#caCopy").textContent = "Copy"; }, 1800);
  });
  $$("[data-copy]").forEach((b) => b.addEventListener("click", copyCA));

  /* ---------------- canvases ---------------- */
  const storm = $("#storm"), sctx = storm.getContext("2d");
  const boltC = $("#bolts"), bctx = boltC.getContext("2d");
  let W = 0, H = 0;
  const resize = () => {
    W = window.innerWidth; H = window.innerHeight;
    for (const c of [storm, boltC]) {
      c.width = W * DPR; c.height = H * DPR;
    }
    sctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    bctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  };
  resize();
  window.addEventListener("resize", resize);

  /* rain */
  const drops = Array.from({ length: Math.round(Math.min(160, W / 8)) }, () => ({
    x: Math.random() * W, y: Math.random() * H,
    l: 8 + Math.random() * 18, v: 7 + Math.random() * 9, a: .08 + Math.random() * .22,
  }));

  /* bolts */
  const bolts = [];
  const zigzag = (x1, y1, x2, y2, disp, out) => {
    if (disp < 3) { out.push([x2, y2]); return; }
    const mx = (x1 + x2) / 2 + (Math.random() - .5) * disp;
    const my = (y1 + y2) / 2 + (Math.random() - .5) * disp * .35;
    zigzag(x1, y1, mx, my, disp / 2, out);
    zigzag(mx, my, x2, y2, disp / 2, out);
  };
  const makeBolt = (x2, y2) => {
    const x1 = x2 + (Math.random() - .5) * Math.min(W * .5, 420);
    const y1 = -20;
    const main = [[x1, y1]];
    const d = Math.hypot(x2 - x1, y2 - y1);
    zigzag(x1, y1, x2, y2, d * .28, main);
    const branches = [];
    const nb = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < nb; i++) {
      const p = main[Math.floor(main.length * (.2 + Math.random() * .55))];
      const ang = Math.atan2(y2 - y1, x2 - x1) + (Math.random() - .5) * 1.6;
      const len = d * (.15 + Math.random() * .25);
      const b = [[p[0], p[1]]];
      zigzag(p[0], p[1], p[0] + Math.cos(ang) * len, p[1] + Math.sin(ang) * len, len * .35, b);
      branches.push(b);
    }
    return { main, branches, t: 0, life: 520 };
  };
  const drawPath = (pts, w, color, blur) => {
    bctx.beginPath();
    bctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) bctx.lineTo(pts[i][0], pts[i][1]);
    bctx.lineWidth = w; bctx.strokeStyle = color; bctx.shadowBlur = blur; bctx.shadowColor = "rgba(170,200,255,1)";
    bctx.stroke();
  };

  const word = $(".hero__word");
  const flash = $(".flash");
  let litT;
  const strike = (x, y, { silent = false } = {}) => {
    if (reduced) return;
    bolts.push(makeBolt(x, y));
    if (Math.random() < .35) setTimeout(() => bolts.push(makeBolt(x + (Math.random() - .5) * 60, y)), 90);
    flash.style.setProperty("--fx", (x / W) * 100 + "%");
    flash.classList.remove("go"); void flash.offsetWidth; flash.classList.add("go");
    word.classList.add("lit");
    clearTimeout(litT);
    litT = setTimeout(() => word.classList.remove("lit"), 260);
    if (!silent && navigator.vibrate) navigator.vibrate(18);
  };

  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min(50, now - last); last = now;

    // rain
    sctx.clearRect(0, 0, W, H);
    sctx.lineWidth = 1;
    for (const d of drops) {
      d.y += d.v * dt / 16; d.x -= d.v * .18 * dt / 16;
      if (d.y > H) { d.y = -d.l; d.x = Math.random() * (W + 100); }
      sctx.strokeStyle = `rgba(200,215,240,${d.a})`;
      sctx.beginPath(); sctx.moveTo(d.x, d.y); sctx.lineTo(d.x + d.l * .18, d.y - d.l); sctx.stroke();
    }

    // bolts
    bctx.clearRect(0, 0, W, H);
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i];
      b.t += dt;
      const k = 1 - b.t / b.life;
      if (k <= 0) { bolts.splice(i, 1); continue; }
      const flick = k > .6 ? 1 : (Math.random() > .3 ? k : k * .3);
      bctx.globalAlpha = flick;
      drawPath(b.main, 7, "rgba(150,180,255,.35)", 40);
      drawPath(b.main, 2.6, "rgba(255,250,235,1)", 18);
      for (const br of b.branches) drawPath(br, 1.4, "rgba(225,235,255,.85)", 12);
      bctx.globalAlpha = 1;
    }
    bctx.shadowBlur = 0;

    tick(dt);
    requestAnimationFrame(loop);
  };

  /* click anywhere → strike (ignore interactive things) */
  document.addEventListener("click", (e) => {
    if (e.target.closest("a, button, input, iframe, .card, .lightbox")) return;
    strike(e.clientX, e.clientY);
  });

  /* ambient distant thunder */
  if (!reduced) {
    const ambient = () => {
      if (document.visibilityState === "visible" && window.scrollY < H * 1.2) {
        flash.style.setProperty("--fx", Math.random() * 100 + "%");
        flash.classList.remove("go"); void flash.offsetWidth; flash.classList.add("go");
      }
      setTimeout(ambient, 7000 + Math.random() * 9000);
    };
    setTimeout(ambient, 6000);
  }

  /* ---------------- swinging dog tag (pendulum) ---------------- */
  const rig = $("#rig"), tag = $("#tag");
  const pend = { a: 0, v: 0 };
  let lastMX = null, hovering = false;
  const hero = $("#hero");
  hero.addEventListener("pointermove", (e) => {
    if (lastMX !== null && hovering) {
      const dx = e.clientX - lastMX;
      pend.v += dx * .00055;
    }
    lastMX = e.clientX;
    hovering = true;
    const r = tag.getBoundingClientRect();
    tag.style.setProperty("--shine", (100 - ((e.clientX - r.left) / r.width) * 100) + "%");
  });
  hero.addEventListener("pointerleave", () => { hovering = false; lastMX = null; });
  tag.addEventListener("click", () => {
    pend.v += (Math.random() > .5 ? 1 : -1) * .05;
    const r = tag.getBoundingClientRect();
    strike(r.left + r.width / 2, r.top + r.height * .3, { silent: true });
  });
  const nav = $(".nav");
  let lastSY = window.scrollY;
  nav.classList.toggle("scrolled", lastSY > 40);
  window.addEventListener("scroll", () => {
    nav.classList.toggle("scrolled", window.scrollY > 40);
    const d = window.scrollY - lastSY; lastSY = window.scrollY;
    pend.v += Math.max(-.02, Math.min(.02, d * .0004));
  }, { passive: true });

  let idle = 0;
  function tick(dt) {
    if (reduced) return;
    const s = dt / 16;
    idle += dt * .0011;
    const target = Math.sin(idle) * .018;
    pend.v += (-(pend.a - target) * .012) * s;
    pend.v *= Math.pow(.965, s);
    pend.v = Math.max(-.12, Math.min(.12, pend.v));
    pend.a += pend.v * s;
    pend.a = Math.max(-.6, Math.min(.6, pend.a));
    rig.style.transform = `rotate(${pend.a}rad)`;
  }

  /* intro strike */
  window.addEventListener("load", () => {
    setTimeout(() => {
      const r = tag.getBoundingClientRect();
      pend.v += .06;
      strike(r.left + r.width / 2, r.top + r.height * .25, { silent: true });
    }, 650);
  });

  /* ---------------- reveal on scroll ---------------- */
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
  }, { threshold: .15, rootMargin: "0px 0px -8% 0px" });
  $$(".reveal").forEach((el) => io.observe(el));

  /* ---------------- leash draws as you scroll ---------------- */
  const leash = $("#leashPath"), route = $(".walk__route");
  const len = leash.getTotalLength();
  leash.style.setProperty("--len", len);
  const leashUpdate = () => {
    const r = route.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (H * .75 - r.top) / r.height));
    leash.style.setProperty("--p", p.toFixed(3));
  };
  window.addEventListener("scroll", leashUpdate, { passive: true });
  leashUpdate();

  /* ---------------- passport tilt ---------------- */
  const pass = $("#passport");
  const fine = window.matchMedia("(pointer: fine)").matches;
  if (fine && !reduced) {
    pass.addEventListener("pointermove", (e) => {
      const r = pass.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      pass.style.setProperty("--ry", (px - .5) * 14 + "deg");
      pass.style.setProperty("--rx", (.5 - py) * 10 + "deg");
      pass.style.setProperty("--mx", px * 100 + "%");
      pass.style.setProperty("--my", py * 100 + "%");
      pass.style.setProperty("--hx", px * 100 + "%");
      pass.style.setProperty("--hy", py * 100 + "%");
    });
    pass.addEventListener("pointerleave", () => {
      pass.style.setProperty("--ry", "0deg"); pass.style.setProperty("--rx", "0deg");
    });
  }

  /* ---------------- kennel: draggable cards ---------------- */
  const board = $("#board");
  const cards = $$(".card", board);
  const desktop = window.matchMedia("(min-width: 901px)");
  let z = 10;

  const place = () => {
    if (!desktop.matches) return;
    const bw = board.clientWidth, bh = board.clientHeight;
    for (const c of cards) {
      if (c.dataset.moved) continue;
      const x = (+c.dataset.x / 100) * bw, y = (+c.dataset.y / 100) * bh;
      const maxX = bw - c.offsetWidth - 8, maxY = bh - c.offsetHeight - 8;
      c.style.left = Math.max(8, Math.min(maxX, x)) + "px";
      c.style.top = Math.max(8, Math.min(maxY, y)) + "px";
      c.style.transform = `rotate(${c.dataset.r}deg)`;
    }
  };
  // wait for images so heights are right
  Promise.all(cards.map((c) => {
    const img = $("img", c);
    img.loading = "eager";
    return img.complete ? 0 : new Promise((r) => { img.onload = img.onerror = r; });
  })).then(place);
  place();
  window.addEventListener("resize", place);

  cards.forEach((c) => {
    let sx, sy, ox, oy, moved = false, active = false;
    c.addEventListener("pointerdown", (e) => {
      if (!desktop.matches) return;
      active = true; moved = false;
      sx = e.clientX; sy = e.clientY;
      ox = c.offsetLeft; oy = c.offsetTop;
      c.style.zIndex = ++z;
      c.setPointerCapture(e.pointerId);
    });
    c.addEventListener("pointermove", (e) => {
      if (!active) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (!moved && Math.hypot(dx, dy) > 5) { moved = true; c.classList.add("dragging"); }
      if (!moved) return;
      const bw = board.clientWidth, bh = board.clientHeight;
      const nx = Math.max(-c.offsetWidth * .3, Math.min(bw - c.offsetWidth * .7, ox + dx));
      const ny = Math.max(-20, Math.min(bh - c.offsetHeight * .6, oy + dy));
      c.style.left = nx + "px"; c.style.top = ny + "px";
      const tilt = Math.max(-14, Math.min(14, (+c.dataset.r) + dx * .03));
      c.style.transform = `rotate(${tilt}deg)`;
    });
    const end = (e) => {
      if (!active) return;
      active = false;
      c.classList.remove("dragging");
      if (moved) {
        c.dataset.moved = "1";
        c.dataset.r = (Math.random() * 14 - 7).toFixed(1);
        c.style.transform = `rotate(${c.dataset.r}deg)`;
      } else {
        openLB(c);
      }
    };
    c.addEventListener("pointerup", end);
    c.addEventListener("pointercancel", () => { active = false; c.classList.remove("dragging"); });
    c.addEventListener("click", () => { if (!desktop.matches) openLB(c); });
  });

  /* ---------------- lightbox ---------------- */
  const lb = $("#lightbox"), lbImg = $("img", lb), lbCap = $(".lightbox__cap", lb);
  function openLB(card) {
    const img = $("img", card);
    lbImg.src = img.src; lbImg.alt = img.alt;
    lbCap.textContent = $("figcaption", card).textContent;
    lb.hidden = false;
    document.body.style.overflow = "hidden";
  }
  const closeLB = () => { lb.hidden = true; document.body.style.overflow = ""; };
  lb.addEventListener("click", (e) => { if (e.target !== lbImg) closeLB(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !lb.hidden) closeLB(); });

  /* go */
  requestAnimationFrame(loop);
})();
