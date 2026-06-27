// BuildFlow scroll-driven animation engine (extracted verbatim from BuildFlow.astro).
// See memory note 'buildflow-animejs-boundary': GSAP owns the scrubbed tweens/staggers/
// progress; the gate state machine, view-4->card handoff, tier stepPop and geometry bars
// stay imperative inside the gsap-driven tick.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

export function initBuildFlow() {
  // Set --snz-nav-h from the consultation nav so the sticky panel fills exactly below it.
  const setNavH = () => {
    const navEl = document.getElementById('snz-cnav');
    if (navEl) document.documentElement.style.setProperty('--snz-nav-h', navEl.offsetHeight + 'px');
  };
  setNavH();
  window.addEventListener('resize', setNavH, { passive: true });

  // Scroll-driven flow animation for THE BUILD. Ported from the design prototype,
  // driven off window scroll position over the tall #snz-build section.
  type El = HTMLElement & SVGElement;
  const $ = (id: string) => document.getElementById(id) as unknown as El | null;

  // Boot wireframe background columns — fill width then start vertical scroll
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wbg = document.getElementById('snz-wbg');
  if (!reduceMotion && wbg) {
    const animClasses = ['snz-bf-col-a', 'snz-bf-col-b', 'snz-bf-col-c'];
    const marginOffsets = [-40, -70, -20];
    const baseCols = Array.from(wbg.querySelectorAll<HTMLElement>('.snz-bf-col'));

    // Vertical duplication for seamless loop
    baseCols.forEach((col) => {
      const kids = Array.from(col.children);
      kids.forEach((k) => col.appendChild(k.cloneNode(true)));
    });

    // Add extra columns until container width is overfilled
    const containerW = wbg.offsetWidth;
    const colW = (baseCols[0]?.offsetWidth ?? 160) + 18;
    const needed = Math.ceil(containerW / colW) + 2;

    for (let i = baseCols.length; i < needed; i++) {
      const src = baseCols[i % baseCols.length];
      const clone = src.cloneNode(true) as HTMLElement;
      animClasses.forEach((c) => clone.classList.remove(c));
      clone.classList.add(animClasses[i % animClasses.length]);
      clone.style.marginTop = marginOffsets[i % marginOffsets.length] + 'px';
      wbg.appendChild(clone);
    }

    requestAnimationFrame(() => {
      wbg.querySelectorAll<HTMLElement>('.snz-bf-col').forEach((col) => col.classList.add('snz-bf-go'));
    });
  }

  const sec = $('snz-build');
  const svg = $('snz-flow');
  if (sec && svg) {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const camera = $('camera');
    const gCore = $('gCore'), gApi = $('gApi'), gApiCard = $('gApiCard');
    const apiBox = $('apiBox');
    // ENGINE overlay: marquee bg + a browser that morphs through 4 product shapes (scroll-driven).
    const purpose = $('snz-purpose');
    // Anchor each marquee item's gradient to its row origin so the per-item background-clip shimmer
    // reads as ONE continuous band sweeping across the whole row (the clip is per-item to dodge the
    // oversized-layer glyph-clipping bug, but --bgx phase-aligns them back into a coherent sweep).
    if (purpose) {
      requestAnimationFrame(() => {
        (purpose.querySelectorAll('.pur-row') as NodeListOf<HTMLElement>).forEach((row) => {
          (row.querySelectorAll('.pur-it') as NodeListOf<HTMLElement>).forEach((it) => {
            it.style.setProperty('--bgx', `${-it.offsetLeft}px`);
          });
        });
      });
    }
    // Scroll-velocity boost for the background marquee rows. Base drift is a CSS
    // `transform` animation; we accumulate EXTRA forward distance on the independent
    // `translate` property (composites, never fights the animation). The boost only
    // ever advances each row along its own drift direction (scroll up or down), so it
    // never rubber-bands backward; the accumulated offset wraps by the marquee period
    // (one repeating copy) so the loop stays seamless. Driven from the ticker below.
    const purRows = purpose ? Array.from(purpose.querySelectorAll('.pur-row')) as HTMLElement[] : [];
    const purRowVx = purRows.map(() => 0);     // accumulated extra px (wrapped to period)
    const purRowPeriod = purRows.map(() => 0); // one marquee copy width; measured lazily
    const measurePurPeriods = () => purRows.forEach((r, i) => { purRowPeriod[i] = r.scrollWidth / 2; });
    if (purRows.length) {
      requestAnimationFrame(() => requestAnimationFrame(measurePurPeriods));
      window.addEventListener('resize', measurePurPeriods);
    }
    const purViews = [$('ev0'), $('ev1'), $('ev2'), $('ev3')];
    // view-4 shrink-into-card handoff: the tight browser+phone box (NOT the marquee), its caption, and
    // the stage box they live in. Scaling purProdi leaves the background marquee untouched.
    const purProdi = purpose ? (purpose.querySelector('.pur-prodi') as HTMLElement | null) : null;
    const purBrowser = purpose ? (purpose.querySelector('.pur-browser') as HTMLElement | null) : null;
    const purCap = purpose ? (purpose.querySelector('.pur-cap') as HTMLElement | null) : null;
    const gCorePh = $('gCorePh');
    // normal motion: the live view-4 element persists as the product, so hide the SVG placeholder.
    if (gCorePh) gCorePh.style.opacity = reduce ? '1' : '0';
    const stageEl = $('snz-buildsticky');
    const PUR_HANDOFF_DY = 0; // product seats dead-centre in the card (no label to sit above)
    const purStep = $('pur-step'), purTitle = $('pur-title'), purSub = $('pur-sub');
    const PUR_META = [
      ['A LANDING PAGE', 'just a clean first impression'],
      ['START SELLING', 'add a store and take payments'],
      ['PUBLISH CONTENT, AS A CMS', 'blogs, guides, an audience'],
      ['WEB APP & MOBILE', 'dashboards on the web, a native app on iOS and Android, one backend'],
    ];
    const PUR_CATS = ['host', 'pay', 'cms', 'all']; // stage → highlighted marquee category ('all' = light everything)
    let purStage = -1;
    const purPlop = (view: El) => {
      const els = Array.from(view.querySelectorAll('.pur-pl')) as unknown as El[];
      // restart the pop animations with NO synchronous forced reflow. The old `void offsetWidth`
      // (even once) forced a layout of the whole sticky section — which holds the 230vmax / 416-word
      // marquee, and the trace flagged the DOM as large — costing ~60ms+ on the very frame a stage
      // flip happens, i.e. the scroll-through spike the lag complaint is about. Removing .go then
      // re-adding it across a double-rAF lets the removal flush through the normal render pipeline
      // (no forced sync layout); the pop just retriggers ~1 frame later, which is imperceptible.
      els.forEach((el) => el.classList.remove('go'));
      requestAnimationFrame(() => requestAnimationFrame(() => {
        els.forEach((el, idx) => { el.style.animationDelay = (idx * 50) + 'ms'; el.classList.add('go'); });
      }));
    };
    const purShow = (n: number) => {
      if (n === purStage) return;
      const prev = purStage;
      const dir = n > prev ? 1 : -1;   // scroll-forward slides the new view in from the right, back from the left
      purStage = n;
      purViews.forEach((v, j) => { if (v) v.classList.toggle('on', j === n); });
      if (purpose) { purpose.dataset.cat = PUR_CATS[n]; purpose.toggleAttribute('data-app', n === 3); }
      if (purStep) purStep.textContent = String(n + 1).padStart(2, '0');
      if (purTitle) purTitle.textContent = PUR_META[n][0];
      if (purSub) purSub.textContent = PUR_META[n][1];
      const inc = purViews[n];
      if (inc) {
        // slide the incoming view in with eased velocity (power3.out = quick then settle).
        if (reduce) gsap.set(inc, { xPercent: 0, opacity: 1 });
        else gsap.fromTo(inc, { xPercent: dir * 12, opacity: 0 }, { xPercent: 0, opacity: 1, duration: 0.55, ease: 'power3.out', overwrite: true });
        purPlop(inc as El);
      }
      // slide the outgoing view out the opposite way so the switch reads as a directional swipe.
      if (!reduce && prev >= 0 && purViews[prev]) gsap.to(purViews[prev], { xPercent: -dir * 12, opacity: 0, duration: 0.4, ease: 'power2.in', overwrite: true });
    };
    const cnApi = $('cnApi'), cnApiPulse1 = $('cnApiPulse1'), cnApiPulse2 = $('cnApiPulse2');
    const ciAcc = $('ciAcc'), ciPay = $('ciPay'), ciAgent = $('ciAgent'), ciCms = $('ciCms'), ciEcom = $('ciEcom'), ciDyn = $('ciDyn');
    const pkReq = $('pkReq');
    const customers = $('customers'), custNum = $('custNum');
    const custDots = Array.from(svg.querySelectorAll('#customers .cust')) as unknown as El[];
    const bizTitle = $('bizTitle'), bizNum = $('bizNum'), bizSize = $('bizSize');
    const gAnalytics = $('gAnalytics');
    const analytics = $('analytics');
    const ciProdAn = $('ciProdAn'), ciApiAn = $('ciApiAn');
    const ciProdAnPulse = $('ciProdAnPulse'), ciApiAnPulse = $('ciApiAnPulse');
    const scSqs = [0,1,2,3,4,5,6,7,8,9].map(i => $('gsq' + i));
    const gReplicas = $('gReplicas'), apiCardBox = $('apiCardBox');
    const cbBars = [$('cb0'), $('cb1'), $('cb2'), $('cb3'), $('cb4'), $('cb5'), $('cb6'), $('cb7')];
    const anChart = $('anChart');
    const anHeat = $('anHeat'), anSearch = $('anSearch'), anRev = $('anRev');
    const anStatRev = $('anStatRev'), anStatVis = $('anStatVis'), anStatSrc = $('anStatSrc'), anStatSig = $('anStatSig');
    const anHeatCells: El[] = [];
    const anSearchH: number[] = [], anRevH: number[] = [];
    const gabBars = [0,1,2,3,4,5,6,7].map(i => $('gab' + i));
    const gabH = [22, 32, 26, 38, 30, 46, 34, 54];
    const gAnalyticsLine = $('gAnalyticsLine');
    const snzWord = $('snzWord');
  const snzWordPaths = Array.from(svg.querySelectorAll('#snzWord [data-ln]')) as unknown as El[];
    const caps = [$('cap1'), $('cap2'), $('cap3'), $('cap4')];
    const track = [$('tk1'), $('tk2'), $('tk3'), $('tk4')];
    const dots = [$('td1'), $('td2'), $('td3'), $('td4')];
    const prog = $('fProg');
    const wBg = document.getElementById('snz-wbg') as HTMLElement | null;
    const hero1 = $('snz-hero1');
    const purBg = purpose ? (purpose.querySelector('.pur-bg') as HTMLElement | null) : null;
    [cnApi, ciAcc, ciPay, ciAgent, ciCms, ciEcom, ciDyn, anChart].forEach((e) => {
      if (e) { e.style.strokeDasharray = '1'; e.style.strokeDashoffset = '1'; }
    });

    // build analytics sub-charts (heatmap + impression/revenue bars)
    const NS = 'http://www.w3.org/2000/svg';
    const mk = (t: string, attrs: Record<string, string | number>) => {
      const e = document.createElementNS(NS, t);
      for (const k in attrs) e.setAttribute(k, String(attrs[k]));
      return e;
    };
    if (anHeat && !anHeat.childNodes.length) {
      const cols = 11, rows = 5, x0 = 520, y0 = 232, cw = 33, ch = 24, gx = 2, gy = 3;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const hot = Math.exp(-(Math.pow(c - 7, 2) / 9 + Math.pow(r - 1.6, 2) / 3.2));
        const noise = Math.abs((Math.sin(c * 12.9 + r * 78.2) * 43758.5453) % 1);
        const v = Math.max(0.05, Math.min(0.95, hot * 0.9 + noise * 0.18 + 0.05));
        const cell = mk('rect', { x: x0 + c * (cw + gx), y: y0 + r * (ch + gy), width: cw, height: ch, rx: 2, fill: 'var(--accent)', 'fill-opacity': v.toFixed(2), opacity: 0 });
        anHeat.appendChild(cell);
        anHeatCells.push(cell as unknown as El);
      }
    }
    if (anSearch && !anSearch.childNodes.length) {
      const n = 14, x0 = 96, base = 502, bw = 18, step = 27, maxH = 64;
      for (let i = 0; i < n; i++) { const t = i / (n - 1); const h = (0.25 + 0.7 * t + 0.12 * Math.sin(i * 1.7)) * maxH; anSearchH.push(h); anSearch.appendChild(mk('rect', { x: x0 + i * step, y: base, width: bw, height: 0, rx: 2, fill: 'rgba(198,244,50,.6)' })); }
    }
    if (anRev && !anRev.childNodes.length) {
      const n = 12, x0 = 524, base = 502, bw = 20, step = 32, maxH = 64;
      for (let i = 0; i < n; i++) { const t = i / (n - 1); const h = (0.22 + 0.72 * t + 0.1 * Math.sin(i * 2.1 + 1)) * maxH; anRevH.push(h); anRev.appendChild(mk('rect', { x: x0 + i * step, y: base, width: bw, height: 0, rx: 2, fill: 'var(--accent)' })); }
    }

    const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
    const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a), 0, 1);
    const sm = (t: number) => t * t * (3 - 2 * t);   // smoothstep — also the gsap tween ease below
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    // elastic "rubber balloon" ease: overshoots past 1 then settles. t in [0,1].
    const elasticOut = (t: number) => {
      if (t <= 0) return 0; if (t >= 1) return 1;
      const per = 0.42; // oscillation period — smaller = more bounces
      return Math.pow(2, -9 * t) * Math.sin((t - per / 4) * (2 * Math.PI) / per) + 1;
    };

    // ---- gsap timelines for the SCRUBBED tracks + the two CLEAN staggers ----
    // Built once, paused. Durations are in p-units (= gsap seconds), so seek(p) reads the value at
    // scroll progress p (done in the ticker below). The smoothstep ease (sm) makes the interpolation
    // identical to the former hand-rolled loops; the keyframes now read declaratively with labels.
    // camera: [p, fx, fy, k]
    const CAM_KF = [[0,500,300,1.0],[0.14,500,300,1.0],[0.22,352,270,2.8],[0.34,352,270,2.8],[0.46,500,300,1.0],[0.54,500,300,1.32],[0.70,500,300,1.32],[0.88,500,300,1.22]];
    const cam = { fx: CAM_KF[0][1], fy: CAM_KF[0][2], k: CAM_KF[0][3] };
    const camTl = gsap.timeline({ paused: true });
    for (let i = 0; i < CAM_KF.length - 1; i++) camTl.to(cam, { fx: CAM_KF[i + 1][1], fy: CAM_KF[i + 1][2], k: CAM_KF[i + 1][3], duration: CAM_KF[i + 1][0] - CAM_KF[i][0], ease: sm }, CAM_KF[i][0]);
    // backend card: [p, bx, by]
    const BK_KF = [[0,500,700],[0.14,500,700],[0.24,500,200],[0.53,500,200],[0.62,660,300],[0.70,660,300],[0.76,660,300],[1.04,660,300]];
    const bk = { bx: BK_KF[0][1], by: BK_KF[0][2] };
    const bkTl = gsap.timeline({ paused: true });
    for (let i = 0; i < BK_KF.length - 1; i++) bkTl.to(bk, { bx: BK_KF[i + 1][1], by: BK_KF[i + 1][2], duration: BK_KF[i + 1][0] - BK_KF[i][0], ease: sm }, BK_KF[i][0]);
    // heatmap cells: opacity 0→1; cell i window [t*0.55, t*0.55+0.45], t=i/(n-1) → stagger 0.55/(n-1), dur 0.45
    const heatTl = anHeatCells.length
      ? gsap.timeline({ paused: true }).fromTo(anHeatCells, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: sm, stagger: anHeatCells.length > 1 ? 0.55 / (anHeatCells.length - 1) : 0 }, 0)
      : null;
    // glyph outlines: strokeDashoffset 1→0; path i window [t*0.5, t*0.5+0.4], t=i/n → stagger 0.5/n, dur 0.4
    const glyphTl = snzWordPaths.length
      ? gsap.timeline({ paused: true }).fromTo(snzWordPaths, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.4, ease: sm, stagger: 0.5 / snzWordPaths.length }, 0)
      : null;

    // SCALE size steps: each customer size (small / medium / enterprise) is its own
    // discrete scroll zone. `tierAnim` eases toward the active zone's tier over REAL
    // TIME, so a step pops IN on scroll-down and reverses (pops OUT) on scroll-up,
    // independent of scroll speed. `scaleAnimActive` keeps the rAF applying while the
    // eased value is still settling after the user stops scrolling.
    const POP_DUR = 640;                          // ms balloon settle time
    const nowMs = () => performance.now();
    let tierAnim = 0, frameLastT = -1;            // eased tier value + last frame stamp
    let custCount = 0;                            // time-eased customer counter (trigger-driven)
    const gate: Record<string, number> = {};      // named eased trigger gates (0..1)
    let scaleAnimActive = false;
    let purLastTx = 0, purLastTy = 0;             // last translate applied to the persisting product, so we can
                                                  // back it out next frame and recover its true natural centre
    let purHandLast = 0;                          // last frame's handoff value — gates the layout reads below

    const apply = (p: number) => {
      const draw = (el: El | null, d: number) => { if (el) { el.style.strokeDashoffset = String(1 - d); el.style.opacity = d > 0 ? '1' : '0'; } };
      const flow = (pk: El | null, c: number[], m: number[], a: number, b: number) => {
        if (!pk) return;
        const l = seg(p, a, b);
        const active = l > 0 && l < 1;
        const frac = l < 0.5 ? sm(l * 2) : 1 - sm((l - 0.5) * 2);
        pk.setAttribute('cx', lerp(c[0], m[0], frac).toFixed(1));
        pk.setAttribute('cy', lerp(c[1], m[1], frac).toFixed(1));
        pk.style.opacity = active ? '1' : '0';
      };

      // PERF: batch all layout reads at the TOP of the frame, before any style writes below, AND only
      // when the view4->card handoff is actually live (p>=~0.50, or still easing back). These rects
      // are consumed ONLY inside the `hand > 0` handoff branch; reading them every frame forced a full
      // layout of a large DOM through the ENTIRE earlier ENGINE phase (p~0.1-0.45) — exactly the
      // stage-transition window — for values that branch never used. Gating it makes every ENGINE
      // frame reflow-free, which is the scroll-through-transitions lag. One frame of camera-relative
      // latency on entry to the handoff is imperceptible.
      let hoGr: DOMRect | null = null, hoPr: DOMRect | null = null, hoBrW = 560, hoPrH = 366;
      if (!reduce && (p >= 0.49 || purHandLast > 0.001) && gCore && purProdi && stageEl) {
        hoGr = gCore.getBoundingClientRect(); hoPr = purProdi.getBoundingClientRect();
        if (purBrowser) hoBrW = purBrowser.offsetWidth;
        hoPrH = purProdi.offsetHeight || 366;
      }

      // single frame delta drives all time-eased (trigger) animations
      if (frameLastT < 0) frameLastT = nowMs();
      const dtF = Math.min(64, nowMs() - frameLastT); frameLastT = nowMs();
      const kF = reduce ? 1 : 1 - Math.pow(0.0006, dtF / POP_DUR);
      // eased trigger gate: scroll crossing a threshold sets `on`; the value then plays to
      // 1 (forward) or back to 0 (reverse on scroll-up) over real time, not scrubbed.
      let gateSettling = false;
      const trig = (name: string, on: boolean) => {
        const cur = gate[name] ?? 0;
        const t = on ? 1 : 0;
        const next = reduce ? t : cur + (t - cur) * kF;
        gate[name] = next;
        if (!reduce && Math.abs(t - next) > 0.002) gateSettling = true;
        return next;
      };
      // same as trig() but with a custom (slower) settle duration — used where a reveal should
      // play out longer than the default POP_DUR (e.g. the analytics dashboard text filling in).
      const trigSlow = (name: string, on: boolean, durMs: number) => {
        const cur = gate[name] ?? 0;
        const t = on ? 1 : 0;
        const kS = reduce ? 1 : 1 - Math.pow(0.0006, dtF / durMs);
        const next = reduce ? t : cur + (t - cur) * kS;
        gate[name] = next;
        if (!reduce && Math.abs(t - next) > 0.002) gateSettling = true;
        return next;
      };

      // ---- STAGE 1 → 2: TRIGGERED (not scrubbed). Crossing a small scroll threshold fires the
      // zoom-into-place over real time via the eased gate, so stage 1 needs only a nudge to leave
      // instead of a long scrub. Reverses on scroll-up back past the threshold. ----
      const seq2 = trig('seq2', p >= 0.096);
      const s1Out = clamp(seq2 / 0.35, 0, 1);   // stage-1 clears fast — gone by the time the gate is ~35% in
      if (hero1) hero1.style.opacity = (1 - s1Out).toFixed(3);
      if (wBg) wBg.style.opacity = (0.55 * (1 - s1Out)).toFixed(3);

      // ---- CAMERA ----
      // 0.00-0.14: site+phone centered
      // 0.14-0.22: zoom INTO the website wireframe (center ~352,270) — it becomes the ENGINE
      // 0.22-0.34: held zoomed-in while the ENGINE browser morphs through product shapes
      // 0.34-0.46: pull back out to neutral
      // 0.46-0.54: zoom out for side-by-side
      // 0.54-0.70: side-by-side, product left / backend right
      // 0.70-0.87: scale view
      // 0.87+: analytics
      // camera keyframes interpolate via the gsap timeline; for p>=0.88 the DATA override below
      // replaces these values, so clamping the seek there matches the old loop's default fall-through.
      camTl.seek(clamp(p, 0, 0.88));
      let fx = cam.fx, fy = cam.fy, k = cam.k;
      // ---- DATA stage camera: TWO SEPARATE triggers, each playing over real time (not scrubbed).
      // Trigger 1 (cross 0.88): pan the scale view UP to make room; the analytics card + connecting
      // lines appear in the new space. NO zoom yet. Trigger 2 (cross 0.94): zoom INTO the analytics
      // card. The crossfade/fill gates below hang off panP (reveal) and zoomP (zoom). ----
      const panP = trig('datapan', p >= 0.88);   // phase 1: move-up + card reveal
      const zoomP = trig('datazoom', p >= 0.94);  // phase 2: zoom into the card
      if (p >= 0.88 || panP > 0.001) { fx = 500; fy = lerp(300, 460, panP); k = lerp(1.22, 3.4, zoomP); }
      if (camera) camera.setAttribute('transform', 'translate(' + (500 - k * fx).toFixed(1) + ' ' + (300 - k * fy).toFixed(1) + ') scale(' + k.toFixed(3) + ')');

      // ---- ZOOM IN: the design wall scales into one tile (handled above), ENGINE takes over ----
      // product/cards stay up through the move-up (panP) and only dissolve as the DATA zoom plays in.
      const dissolve = 1 - zoomP;

      // ---- BACKEND position ----
      // Enters from bottom, holds at center for ENGINE (incl. collapse), then slides right as small card
      // backend position keyframes interpolate via the anime.js timeline (last segment ends at p=1.04)
      bkTl.seek(clamp(p, 0, 1.04));
      let bx = bk.bx, by = bk.by;

      // ENGINE is now an HTML overlay (#snz-purpose); the SVG backend terminal stays hidden.
      if (gApi) gApi.style.opacity = '0';

      // CONNECT+: simple API card follows Banch (slides center → right)
      const apiCardShow = trig('side', p >= 0.50);
      if (gApiCard) { gApiCard.setAttribute('transform', 'translate(660 300)'); gApiCard.style.opacity = (apiCardShow * (1 - zoomP)).toFixed(3); }
      // ENGINE overlay: fade the marquee+browser in over the ENGINE phase. On the way OUT, view 4
      // (web app + mobile) SHRINKS onto the on-screen slot where the "YOUR PRODUCT" card (gCore) lands,
      // so the app visibly becomes the product card instead of a plain crossfade.
      if (purpose) {
        // The seq-2 landing browser is the SAME node shown faintly in stage 1's backdrop; the
        // triggered `seq2` gate zooms it into place over real time — no swap, no scrubbing.
        const purOut = 1 - sm(seg(p, 0.53, 0.58));      // reduced-motion only: crossfade to the SVG card
        // Normal motion: the SAME view-4 element PERSISTS as the product through stage 3 (no swap) and
        // only fades when the product card itself dissolves (~0.93). Reduced motion keeps the simple swap.
        const op = seq2 * (reduce ? purOut : dissolve); // hidden in stage 1 → zooms in only once triggered
        purpose.style.opacity = op.toFixed(3);
        // marquee runs `infinite`; only let it animate while the overlay is actually visible so its
        // continuous main-thread shimmer repaint costs nothing when the section is scrolled away.
        purpose.classList.toggle('snz-live', op > 0.01);
        purpose.style.transform = 'none';                // marquee/background never scales — only the product does
        // handoff: shrink ONLY the browser+phone box down onto gCore's live on-screen slot. Measure real
        // rects each frame so the moving camera is accounted for; offsetWidth ignores the transform we
        // set here, so reading it back is feedback-free.
        // view-4 → SCALE handoff is TRIGGERED, not scrubbed: crossing the threshold plays the
        // shrink-into-card over real time (and reverses on scroll-up), like the seq2/traffic gates.
        const hand = reduce ? 0 : trig('hand', p >= 0.50);
        purHandLast = hand;                              // next frame's read-gate (handoff easing back)
        const baseScale = lerp(0.5, 1.0, seq2);          // entry zoom-into-place (product only)
        if (purProdi) {
          purProdi.style.transformOrigin = 'center center';
          if (hand > 0 && gCore && stageEl && hoGr && hoPr) {
            const gr = hoGr;
            // Recover the product's NATURAL centre by backing out the translate we applied last frame
            // (scale is about-centre, so it never moves the centre). Then aim exactly at the card centre —
            // this is caption-offset-proof, so the product seats dead-centre in the "YOUR PRODUCT" card.
            const r = hoPr;
            const natCx = r.left + r.width / 2 - purLastTx;
            const natCy = r.top + r.height / 2 - purLastTy;
            const tx = ((gr.left + gr.width / 2) - natCx) * hand;
            const ty = ((gr.top + gr.height / 2 + PUR_HANDOFF_DY) - natCy) * hand;
            // content width = browser + (docked phone when on view 4); target gCore's card width.
            const contentW = hoBrW + (purpose.hasAttribute('data-app') ? 164 : 0);
            const contentH = hoPrH;
            // fit inside the card on BOTH axes — width alone lets the (taller) browser overflow top/bottom
            const s = Math.min((gr.width * 0.9) / (contentW || 1), (gr.height * 0.76) / contentH);
            purLastTx = tx; purLastTy = ty;
            purProdi.style.transform = 'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px) scale(' + (baseScale * lerp(1, s, hand)).toFixed(3) + ')';
          } else {
            purLastTx = 0; purLastTy = 0;
            purProdi.style.transform = 'scale(' + baseScale.toFixed(3) + ')';
          }
        }
        if (purCap) purCap.style.opacity = (1 - hand).toFixed(3); // caption gone as it lands; gCore carries the label
        if (purBg) purBg.style.opacity = (clamp((seq2 - 0.55) / 0.45, 0, 1) * purOut * (1 - hand)).toFixed(3); // marquee gone before the shrink
        if (op > 0.01) {
          const t = clamp((p - 0.14) / (0.46 - 0.14), 0, 1); // morph window pulled in tight after the trigger
          purShow(Math.min(purViews.length - 1, Math.floor(t * purViews.length)));
        }
      }

      // ---- CONNECT: product card left (280,300), backend right (700,300) ----
      const pSideBy = apiCardShow;
      if (gCore) { gCore.setAttribute('transform', 'translate(340 300)'); gCore.style.opacity = (pSideBy * dissolve).toFixed(3); }
      if (cnApi) { const cv = trig('cn', p >= 0.50); cnApi.setAttribute('x1', '432'); cnApi.setAttribute('y1', '300'); cnApi.setAttribute('x2', '568'); cnApi.setAttribute('y2', '300'); cnApi.style.strokeDashoffset = String(1 - cv); cnApi.style.opacity = (cv * 0.7 * dissolve).toFixed(3); if (cnApiPulse1) cnApiPulse1.style.opacity = (cv * dissolve).toFixed(3); if (cnApiPulse2) cnApiPulse2.style.opacity = (cv * dissolve).toFixed(3); }

      // ---- TRAFFIC → SCALE: customer grows through 3 size steps, infra balloons ----
      // TRAFFIC arrival is scroll-TRIGGERED (eased gate), not scrubbed: crossing 0.60 plays
      // the crowd/title in over real time and reverses on scroll-up.
      const sIn = trig('traffic', p >= 0.50);
      if (bizTitle) bizTitle.style.opacity = (sIn * dissolve).toFixed(3);

      // Customer size as 3 INDIVIDUAL scroll-triggered steps. Each size owns a scroll
      // zone; crossing one sets the target tier and `tierAnim` eases toward it over real
      // time. Because the ease chases the target in BOTH directions, every step pops in
      // on the way down and pops back out on the way up (inverse on scroll-up).
      const SCALE_ZONES = [0.54, 0.66, 0.78];   // p thresholds → small / medium / enterprise (evened to kill dead scroll between tiers)
      let sizeTier = -1;
      for (let i = 0; i < SCALE_ZONES.length; i++) if (p >= SCALE_ZONES[i]) sizeTier = i;
      const tierTarget = Math.max(0, sizeTier);
      if (sizeTier < 0) tierAnim = 0; else tierAnim += (tierTarget - tierAnim) * kF;
      const tierSettling = !reduce && sizeTier >= 0 && Math.abs(tierTarget - tierAnim) > 0.002;

      // per-element reveal from the eased tier: 0 below its step, eases to 1 once reached,
      // eases back out (reverses) when scrolled up. `need` = tier index the element joins at.
      const stepPop = (need: number) => reduce
        ? (tierAnim >= need - 0.001 ? 1 : 0)
        : elasticOut(clamp(tierAnim - (need - 1), 0, 1));

      // counter + label snap to the nearest step; count rolls between steps as it eases
      const SIZE_LABEL = ['SMALL BUSINESS', 'MEDIUM BUSINESS', 'ENTERPRISE'];
      const SIZE_NUM = [100, 25000, 500000];
      // number eases (rolls) toward the active step's value over REAL TIME — triggered by
      // the scroll zone crossing, but the roll itself is time-driven, not scroll-scrubbed.
      const custTarget = sizeTier < 0 ? 0 : SIZE_NUM[sizeTier];
      custCount = reduce ? custTarget : custCount + (custTarget - custCount) * kF;
      const countSettling = !reduce && Math.abs(custTarget - custCount) > Math.max(1, custTarget * 0.0015);
      if (!countSettling) custCount = custTarget;   // snap exact so it never rests at e.g. 499,500
      if (sizeTier < 0) {
        if (bizNum) bizNum.textContent = '';
        if (bizSize) bizSize.textContent = '';
      } else {
        const shown = Math.round(custCount / 50) * 50;
        if (bizNum) bizNum.textContent = shown.toLocaleString('en-US') + ' customers';
        if (bizSize) bizSize.textContent = SIZE_LABEL[sizeTier];   // label snaps per step
      }
      if (bizTitle) bizTitle.setAttribute('transform', 'translate(500 220) scale(1) translate(-500 -220)');

      // ---- SCALE gates ----
      // mini→full analytics crossfade rides the DATA zoom phase (triggered), not scroll.
      const an = zoomP;
      // server cluster scales WITH the customers: pops in as the first size step arrives,
      // then grows per tier (srvScale/scSqs follow tierAnim). Reverses on scroll-up.
      const gsGate = trig('servers', sizeTier >= 0);

      // SERVERS (right, inside the API card): count steps 1→4→10 across the 3 steps; the
      // cluster scale eases between step sizes (and back down on scroll-up).
      const SRV_PS = [0.86, 0.97, 1.08];
      const srvScale = lerp(SRV_PS[Math.floor(tierAnim)] ?? SRV_PS[0], SRV_PS[Math.min(2, Math.ceil(tierAnim))], tierAnim - Math.floor(tierAnim));
      if (gReplicas) {
        gReplicas.style.opacity = (gsGate * dissolve).toFixed(3);
        gReplicas.setAttribute('transform', 'translate(706 300) scale(' + (srvScale * gsGate).toFixed(3) + ') translate(-706 -300)');
      }
      // enterprise: balloon the card wider so the 10-server cluster fits (expands rightward)
      if (apiCardBox) {
        const cardW = lerp(184, 214, clamp(tierAnim - 1, 0, 1));
        apiCardBox.setAttribute('width', cardW.toFixed(1));
      }
      const repCols = 5;
      const repColX = [666, 686, 706, 726, 746];   // column centres, abs (card right half)
      // single populated row (tiers 0/1) sits vertically centred (300); as the 2nd row
      // spins up at tier 2, row 0 eases up to 288 so both rows straddle centre.
      const twoRowP = clamp(tierAnim - 1, 0, 1);
      const repRowY = [lerp(300, 288, twoRowP), 312];   // row centres, abs
      const nodeNeed = [0, 1, 1, 1, 2, 2, 2, 2, 2, 2]; // step each replica joins at (1 → 4 → 10)
      scSqs.forEach((s, i) => {
        if (!s) return;
        const pop = stepPop(nodeNeed[i]);
        s.style.opacity = clamp(pop, 0, 1).toFixed(3);
        let x = repColX[i % repCols], y = repRowY[Math.floor(i / repCols)];
        let extra = 1;
        if (i === 0) {
          // tier 0 has a single server: sit it large & centred in the card's right half, then
          // ease it back to its grid slot (and normal size) as more replicas spin up at tier 1+.
          const solo = clamp(1 - tierAnim, 0, 1);   // 1 at tier 0 → 0 by tier 1
          x = lerp(x, 706, solo); y = lerp(y, 300, solo);
          extra = lerp(1, 2.2, solo);
        }
        s.setAttribute('transform', 'translate(' + x + ' ' + y + ') scale(' + (Math.max(0.01, pop) * extra).toFixed(3) + ')');
      });

      // PEOPLE (left crowd): reveal in waves 3→5→8, whole crowd balloons each step.
      const PPL_PS = [0.78, 1.04, 1.3];
      const pplScale = lerp(PPL_PS[Math.floor(tierAnim)] ?? PPL_PS[0], PPL_PS[Math.min(2, Math.ceil(tierAnim))], tierAnim - Math.floor(tierAnim));
      if (customers) {
        customers.style.opacity = (sIn * dissolve).toFixed(3);
        customers.setAttribute('transform', 'translate(145 300) scale(' + pplScale.toFixed(3) + ') translate(-145 -300)');
      }
      if (custNum) custNum.style.opacity = '0';
      const dotNeed = [0, 0, 0, 1, 1, 2, 2, 2]; // step each crowd dot joins at (3 → 5 → 8)
      custDots.forEach((d, i) => {
        const pop = stepPop(dotNeed[i]);
        d.style.opacity = clamp(pop, 0, 1).toFixed(3);
        d.setAttribute('r', Math.max(0.1, 6 * pop).toFixed(2));
      });
      // analytics card reveals only AFTER the app/api/customers have moved up (pan ~complete).
      const anCardIn = trig('analytics', panP > 0.85);
      if (gAnalytics) gAnalytics.style.opacity = (anCardIn * (1 - an)).toFixed(3);
      gabBars.forEach((b, i) => { if (!b) return; const prog = sm(seg(anCardIn, i / 8 * 0.35, i / 8 * 0.35 + 0.65)); const h = gabH[i] * prog; b.setAttribute('y', String(40 - h)); b.setAttribute('height', String(h)); });
      if (gAnalyticsLine) { const lp = sm(seg(anCardIn, 0.45, 1.0)); gAnalyticsLine.style.strokeDashoffset = String(1 - lp); gAnalyticsLine.style.opacity = lp > 0 ? '1' : '0'; }
      // ANALYTICS: each glyph outline strokes in, staggered left→right (anime stagger); accent fills after
      glyphTl?.seek(anCardIn);
      if (snzWord) snzWord.style.fillOpacity = sm(seg(anCardIn, 0.85, 1.0)).toFixed(3);
      if (analytics) analytics.style.opacity = an.toFixed(3);
      const ciPAv = sm(seg(panP, 0.2, 0.8));
      if (ciProdAn) ciProdAn.style.opacity = (ciPAv * dissolve).toFixed(3);
      if (ciProdAnPulse) ciProdAnPulse.style.opacity = (ciPAv * dissolve).toFixed(3);
      const ciAAv = sm(seg(panP, 0.4, 1.0));
      if (ciApiAn) { ciApiAn.setAttribute('x1', bx.toFixed(1)); ciApiAn.style.opacity = (ciAAv * dissolve).toFixed(3); }
      if (ciApiAnPulse) { ciApiAnPulse.setAttribute('x1', bx.toFixed(1)); ciApiAnPulse.style.opacity = (ciAAv * dissolve).toFixed(3); }

      // ---- DATA ----
      // dashboard content fills over real time once the zoom is in (triggered, not scroll-scrubbed).
      const dataFill = trigSlow('datafill', zoomP > 0.9, 1500);
      draw(anChart, sm(seg(dataFill, 0.3, 1.0)));
      const anP = dataFill;
      // stat counters
      if (anStatRev) anStatRev.textContent = '£' + (42.8 * anP).toFixed(1) + 'K';
      if (anStatVis) anStatVis.textContent = Math.round(12840 * anP).toLocaleString('en-US');
      if (anStatSrc) anStatSrc.textContent = (1.2 * anP).toFixed(1) + 'M';
      if (anStatSig) anStatSig.textContent = Math.round(1932 * anP).toLocaleString('en-US');
      // heatmap cells stagger in (anime stagger timeline, seeked by the dataFill gate)
      heatTl?.seek(dataFill);
      // bars grow from bottom, staggered
      const anBarP = dataFill;
      if (anSearch) { const bars = Array.from(anSearch.children); const n = bars.length; bars.forEach((b, i) => { const prog = sm(seg(anBarP, (i / n) * 0.4, (i / n) * 0.4 + 0.6)); const h = (anSearchH[i] || 0) * prog; b.setAttribute('y', String(502 - h)); b.setAttribute('height', String(h)); }); }
      if (anRev) { const bars = Array.from(anRev.children); const n = bars.length; bars.forEach((b, i) => { const prog = sm(seg(anBarP, (i / n) * 0.4, (i / n) * 0.4 + 0.6)); const h = (anRevH[i] || 0) * prog; b.setAttribute('y', String(502 - h)); b.setAttribute('height', String(h)); }); }

      // ---- captions + tracker + progress ----
      // 0=DESIGN 1=PURPOSE 2=SCALE (traffic+scale merged) 3=DATA
      // PURPOSE holds through the purpose morph + product/backend bridge; SCALE spans the
      // customer arrival AND infra scaling (~0.60–0.88); DATA at the analytics view.
      const phase = p < 0.105 ? 0 : (p < 0.60 ? 1 : (p < 0.88 ? 2 : 3));
      // cap index 0 (DESIGN) is covered by the centered #snz-hero1, so never show the top-left duplicate
      caps.forEach((c, i) => { if (c) { const on = i === phase && i !== 0; c.style.opacity = on ? '1' : '0'; c.style.transform = on ? 'translateY(0)' : 'translateY(12px)'; } });
      track.forEach((t, i) => { if (t) t.style.color = i <= phase ? 'var(--accent)' : '#4a4a44'; });
      dots.forEach((d, i) => { if (!d) return; const on = i <= phase;
        d.style.background = on ? 'var(--accent)' : '#0b0b0b';
        d.style.borderColor = on ? 'var(--accent)' : '#2f2f2a';
        d.style.boxShadow = i === phase ? '0 0 0 4px rgba(198,244,50,.18)' : 'none';
      });
      // fill maps p → dot positions piecewise so it lands ON each dot exactly at its section threshold
      // (dots are evenly spaced but the section thresholds in p are not)
      const SEC_TH = [0, 0.105, 0.60, 0.88, 1.0], SEC_POS = [0, 0.25, 0.5, 0.75, 1.0];
      const pc = Math.max(0, p);
      let fillPos = 1;
      for (let i = 0; i < SEC_TH.length - 1; i++) { if (pc < SEC_TH[i + 1]) { fillPos = lerp(SEC_POS[i], SEC_POS[i + 1], (pc - SEC_TH[i]) / (SEC_TH[i + 1] - SEC_TH[i])); break; } }
      if (prog) prog.style.width = (fillPos * 100).toFixed(1) + '%';

      // keep the rAF applying while any triggered animation (gates, size tier, counter) settles
      scaleAnimActive = gateSettling || tierSettling || countSettling;
    };

    if (reduce) {
      apply(0.60);
    } else {
      // ScrollTrigger measures scroll progress over the tall #snz-build section: 0 when its top hits
      // the viewport top, 1 when its bottom hits the viewport bottom — exactly the old
      // -rect.top/(offsetHeight - vh) ratio, now declarative (it also handles resize refresh). The
      // existing sticky child still does the visual pinning, so no DOM/CSS changes are needed.
      const st = ScrollTrigger.create({ trigger: sec, start: 'top top', end: 'bottom bottom' });
      // gsap.ticker owns the frame loop (rAF, display-rate) so the eased gates keep settling after
      // the user stops scrolling; each tick reads the latest ScrollTrigger progress and applies it.
      let lastP = -1;
      // SCRUB SMOOTHING: raw st.progress advances in uneven bursts under trackpad/wheel input, so
      // feeding it straight into the scrubbed camera/backend seeks makes the morph stutter even at
      // full fps — the jitter is in the scroll->progress MAPPING, not the frame rate. Ease pSmooth
      // toward the live scroll position over ~SCRUB seconds (the GSAP `scrub` feel) and drive the
      // whole apply() off pSmooth, so every layer moves off one damped clock. Snaps onto the target
      // when input stops, so gate end-states (p=0/1) are still reached exactly.
      let pSmooth = st.progress;
      const SCRUB = 0.3;       // catch-up time constant (s); higher = smoother but laggier
      // marquee velocity-boost tuneables
      const SPEED_MAX = 900;   // px/s of extra drift at full scroll velocity
      const VEL_REF = 6000;    // scroll px/s mapping to ~full boost
      let velLastT = performance.now();
      gsap.ticker.add(() => {
        const nowT = performance.now();
        const dt = Math.min(0.05, (nowT - velLastT) / 1000); // clamp survives tab-away
        velLastT = nowT;
        const target = st.progress;
        pSmooth += (target - pSmooth) * Math.min(1, dt / SCRUB);
        if (Math.abs(target - pSmooth) < 1e-4) pSmooth = target; // settle exactly when idle
        const p = pSmooth;
        if (Math.abs(p - lastP) > 0.0004 || scaleAnimActive) { lastP = p; apply(p); }
        // marquee velocity boost: scroll speed (either direction) adds extra forward
        // drift along each row's OWN direction. Pure accumulation — never reverses —
        // wrapped to the marquee period so it stays seamless. When not scrolling the
        // offset just holds; the base CSS animation keeps the row drifting.
        if (purRows.length) {
          const live = !!purpose && purpose.classList.contains('snz-live');
          const boost = live ? Math.tanh(Math.abs(st.getVelocity()) / VEL_REF) * SPEED_MAX : 0;
          if (boost > 0.5) {
            for (let i = 0; i < purRows.length; i++) {
              const per = purRowPeriod[i] || (purRowPeriod[i] = purRows[i].scrollWidth / 2);
              if (!per) continue;
              const dir = purRows[i].classList.contains('r') ? 1 : -1;
              const nx = (purRowVx[i] + dir * boost * dt) % per; // wrap = seamless
              purRowVx[i] = nx;
              purRows[i].style.translate = nx.toFixed(2) + 'px';
            }
          }
        }
      });
      apply(0);
    }
  }

  // Statement section sliding rows tied to scroll
  const snzSr1 = document.getElementById('snz-sr1') as HTMLElement | null;
  const snzSr2 = document.getElementById('snz-sr2') as HTMLElement | null;
  const snzRow1 = document.getElementById('snz-row1') as HTMLElement | null;
  const snzRow2 = document.getElementById('snz-row2') as HTMLElement | null;
  const stmtEl = document.getElementById('snz-stmt');
  const stmtWords = stmtEl ? Array.from(stmtEl.querySelectorAll<HTMLElement>('.snz-w')) : [];
  const sm3 = (t: number) => t * t * (3 - 2 * t);
  const updateSlide = () => {
    if (!stmtEl) return;
    const r = stmtEl.getBoundingClientRect();
    const prog = (window.innerHeight - r.top) / (window.innerHeight + r.height);
    const x = (prog - 0.5) * 260;
    if (snzSr1) snzSr1.style.transform = `translateX(${x.toFixed(1)}px)`;
    if (snzSr2) snzSr2.style.transform = `translateX(${(-x).toFixed(1)}px)`;
    // scroll-driven row slide: row1 from left, row2 from right
    const slideP = sm3(Math.max(0, Math.min(1, (prog - 0.05) / 0.88)));
    const row1X = -(1 - slideP) * 90;
    const row2End = -100;
    const row2X = row2End + (1 - slideP) * (180 - row2End);
    if (snzRow1) { snzRow1.style.transform = `translateX(${row1X.toFixed(1)}px)`; snzRow1.style.opacity = slideP.toFixed(3); }
    if (snzRow2) { snzRow2.style.transform = `translateX(${row2X.toFixed(1)}px)`; snzRow2.style.opacity = slideP.toFixed(3); }
    // glow sweep driven by scroll
    const gp1 = ((prog * 130) % 110) - 5;
    const gp2 = (((1 - prog) * 130) % 110) - 5;
    const glow = (p: number) => `linear-gradient(90deg,rgba(198,244,50,.05) 0%,rgba(198,244,50,.05) ${Math.max(0,p-10).toFixed(1)}%,rgba(198,244,50,.65) ${p.toFixed(1)}%,rgba(198,244,50,.05) ${Math.min(100,p+10).toFixed(1)}%,rgba(198,244,50,.05) 100%)`;
    if (snzSr1) snzSr1.style.backgroundImage = glow(gp1);
    if (snzSr2) snzSr2.style.backgroundImage = glow(gp2);
    // accent color sweep: each word shifts white→lime staggered across scroll progress
    const n = stmtWords.length;
    stmtWords.forEach((w, i) => {
      const thresh = 0.30 + (i / n) * 0.40;
      const t = Math.max(0, Math.min(1, (prog - thresh) / 0.13));
      const rv = Math.round(242 + (198 - 242) * t);
      const gv = Math.round(240 + (244 - 240) * t);
      const bv = Math.round(234 + (50 - 234) * t);
      w.style.color = `rgb(${rv},${gv},${bv})`;
    });
  };
  window.addEventListener('scroll', updateSlide, { passive: true });
  updateSlide();

  // Statement section intersection observer
  const stmt = document.getElementById('snz-stmt');
  if (stmt) {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { stmt.classList.add('snz-in'); obs.disconnect(); }
    }, { threshold: 0.25 });
    obs.observe(stmt);
  }

}
