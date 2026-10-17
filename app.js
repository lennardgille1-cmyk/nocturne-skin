const canvas = document.querySelector('#particles'), ctx = canvas.getContext('2d');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let points = [], width = 0, height = 0, lastTime = 0;
function resize() {
  width = innerWidth; height = innerHeight;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const count = Math.max(28, Math.min(70, Math.round(width * height / 22000)));
  points = Array.from({length: count}, () => ({x: Math.random()*width, y: Math.random()*height, vx: (Math.random()-.5)*9, vy: (Math.random()-.5)*9}));
}
resize(); addEventListener('resize', resize);
function draw(time) {
  const dt = Math.min((time - lastTime) / 1000 || 0, .05); lastTime = time;
  if (!reduced.matches && !document.hidden) {
    ctx.clearRect(0, 0, width, height);
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      p.x = (p.x + p.vx*dt + width)%width; p.y = (p.y + p.vy*dt + height)%height;
      ctx.fillStyle = 'rgba(67,197,207,.65)'; ctx.fillRect(p.x, p.y, 2, 2);
      for (let j = i+1; j < points.length; j++) {
        const q = points[j], d = Math.hypot(p.x-q.x, p.y-q.y);
        if (d < 150) {
          ctx.strokeStyle = 'rgba(67,197,207,' + ((1-d/150)*.24) + ')';
          ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(q.x,q.y); ctx.stroke();
        }
      }
    }
  }
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);

// Pointer effects share one scheduled frame; no mouse-event layout writes.
(() => {
  const card = document.querySelector('.menu-screenshot');
  const region = document.createElement('div');
  region.className = 'menu-hover-region';
  card.before(region);
  region.append(card);
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const glow = document.createElement('div');
  glow.className = 'cursor-glow';
  glow.setAttribute('aria-hidden', 'true');
  document.body.append(glow);
  let frame = 0, x = 0, y = 0, pointerVisible = false, overCard = false;
  const enabled = () => finePointer.matches && !reduced.matches;
  function reset() {
    pointerVisible = false;
    overCard = false;
    glow.style.opacity = '0';
    card.style.transform = '';
    card.classList.remove('tilting');
  }
  function paint() {
    frame = 0;
    if (!enabled()) { reset(); return; }
    glow.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
    glow.style.opacity = pointerVisible ? '1' : '0';
    // Recompute hover from the stable layout rectangle on every scroll/frame.
    // Enter/leave alone misses a stationary pointer when content moves beneath it.
    const bounds = region.getBoundingClientRect();
    const hit = document.elementFromPoint(x, y);
    overCard = pointerVisible && bounds.width > 0 && bounds.height > 0 &&
      x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom &&
      hit && region.contains(hit);
    if (overCard) {
      const nx = Math.max(-.5, Math.min(.5, (x - bounds.left) / bounds.width - .5));
      const ny = Math.max(-.5, Math.min(.5, (y - bounds.top) / bounds.height - .5));
      card.style.transform = 'perspective(1100px) rotateX(' + (ny * 12) + 'deg) rotateY(' + (-nx * 12) + 'deg) translateZ(10px)';
      card.style.setProperty('--shine-x', (nx + .5) * 100 + '%');
      card.style.setProperty('--shine-y', (ny + .5) * 100 + '%');
      card.classList.add('tilting');
    } else {
      card.style.transform = '';
      card.classList.remove('tilting');
    }
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(paint); }
  document.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch' || !enabled()) return;
    x = e.clientX; y = e.clientY; pointerVisible = true; schedule();
  }, {passive:true});
  region.addEventListener('pointerenter', schedule);
  region.addEventListener('pointerleave', schedule);
  document.documentElement.addEventListener('pointerleave', reset);
  window.addEventListener('blur', reset);
  window.addEventListener('scroll', schedule, {passive:true, capture:true});
  window.addEventListener('resize', schedule, {passive:true});
  new ResizeObserver(schedule).observe(region);
  document.addEventListener('visibilitychange', () => { if(document.hidden) reset(); });
  finePointer.addEventListener('change', reset);
  reduced.addEventListener('change', reset);
})();

// Animate only the decorative menu network, without moving its controls.
(() => {
  const svg = document.querySelector('.n-network');
  if (!svg) return;
  const dots = [...svg.querySelectorAll('circle')];
  const origins = dots.map(dot => ({x: +dot.getAttribute('cx'), y: +dot.getAttribute('cy')}));
  const edgeGroup = svg.querySelector('g');
  const edges = [];
  for (let i = 0; i < origins.length; i++) {
    for (let j = i + 1; j < origins.length; j++) {
      if (Math.hypot(origins[i].x - origins[j].x, origins[i].y - origins[j].y) < 93)
        edges.push([i, j]);
    }
  }
  let visible = true, frame = 0, started = 0, previous = 0;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  function paint(time) {
    frame = 0;
    if (!visible || document.hidden || motion.matches) return;
    if (!started) started = time;
    if (time - previous > 32) {
      previous = time;
      const t = (time - started) / 1000;
      const points = origins.map((p, i) => ({
        x: p.x + Math.sin(t * .42 + i * 1.7) * 11,
        y: p.y + Math.sin(t * .33 + i * 2.1) * 9
      }));
      dots.forEach((dot, i) => {
        dot.setAttribute('cx', points[i].x.toFixed(2));
        dot.setAttribute('cy', points[i].y.toFixed(2));
      });
      edgeGroup.querySelector('path').setAttribute('d', edges.map(([a, b]) =>
        'M' + points[a].x.toFixed(2) + ' ' + points[a].y.toFixed(2) +
        'L' + points[b].x.toFixed(2) + ' ' + points[b].y.toFixed(2)).join(''));
    }
    frame = requestAnimationFrame(paint);
  }
  function resume() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    if (visible && !document.hidden && !motion.matches) frame = requestAnimationFrame(paint);
  }
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; resume(); }).observe(svg);
  document.addEventListener('visibilitychange', resume);
  motion.addEventListener('change', resume);
})();
