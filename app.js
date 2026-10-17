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

// Connected triangular constellations, spread across the black menu.
(() => {
  const svg = document.querySelector('.n-network');
  if (!svg) return;
  const ns = 'http://www.w3.org/2000/svg';
  const lines = document.createElementNS(ns, 'path');
  lines.setAttribute('fill', 'none'); lines.setAttribute('stroke', 'currentColor');
  lines.setAttribute('stroke-width', '.65');
  const dots = document.createElementNS(ns, 'g'); dots.setAttribute('fill', 'currentColor');
  const clusters = Array.from({length: 6}, (_, i) => {
    const angle = Math.random() * Math.PI * 2;
    const nodes = Array.from({length: 4}, (_, j) => {
      const a = angle + j * Math.PI * 2 / 3;
      const radius = j === 3 ? 13 : 24 + Math.random() * 15;
      const dot = document.createElementNS(ns, 'circle');
      dot.setAttribute('r', '1.4'); dots.append(dot);
      return {x: Math.cos(a)*radius, y: Math.sin(a)*radius, phase: Math.random()*6.28, dot};
    });
    return {x: 94 + (i%3)*244 + (Math.random()-.5)*24,
      y: 96 + Math.floor(i/3)*211 + (Math.random()-.5)*22,
      phase: Math.random()*6.28, speed: .15+Math.random()*.13, nodes};
  });
  svg.replaceChildren(lines, dots);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0, visible = true, previous = 0;
  function render(time) {
    const t = time/1000, segments = [];
    clusters.forEach(c => {
      const cx = c.x + Math.sin(t*c.speed+c.phase)*16;
      const cy = c.y + Math.cos(t*c.speed*.8+c.phase)*13;
      const p = c.nodes.map(n => ({
        x: cx+n.x+Math.sin(t*.3+n.phase)*5,
        y: cy+n.y+Math.cos(t*.25+n.phase)*5
      }));
      c.nodes.forEach((n,i) => {
        n.dot.setAttribute('cx',p[i].x.toFixed(2));
        n.dot.setAttribute('cy',p[i].y.toFixed(2));
      });
      [[0,1],[1,2],[2,0],[0,3],[1,3],[2,3]].forEach(([a,b]) =>
        segments.push('M'+p[a].x.toFixed(2)+' '+p[a].y.toFixed(2)+'L'+p[b].x.toFixed(2)+' '+p[b].y.toFixed(2)));
    });
    lines.setAttribute('d',segments.join(''));
  }
  render(0);
  function paint(time) {
    frame = 0;
    if (!visible || document.hidden || motion.matches) return;
    if(time-previous>=33){render(time);previous=time;}
    frame=requestAnimationFrame(paint);
  }
  function resume(){
    if(frame)cancelAnimationFrame(frame);
    frame=0;
    if(visible&&!document.hidden&&!motion.matches)frame=requestAnimationFrame(paint);
  }
  new IntersectionObserver(e=>{visible=e[0].isIntersecting;resume();}).observe(svg);
  document.addEventListener('visibilitychange',resume);
  motion.addEventListener('change',resume);
})();
