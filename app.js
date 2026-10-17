const canvas=document.querySelector('#particles'),ctx=canvas.getContext('2d');const reduced=matchMedia('(prefers-reduced-motion: reduce)');let points=[];function resize(){canvas.width=innerWidth;canvas.height=1000;points=Array.from({length:45},()=>({x:Math.random()*canvas.width,y:Math.random()*1000,vx:(Math.random()-.5)*.15,vy:(Math.random()-.5)*.15}))}resize();addEventListener('resize',resize);function draw(){if(!reduced.matches&&!document.hidden){ctx.clearRect(0,0,canvas.width,1000);for(const p of points){p.x=(p.x+p.vx+canvas.width)%canvas.width;p.y=(p.y+p.vy+1000)%1000;ctx.fillStyle='#43c5cf77';ctx.fillRect(p.x,p.y,2,2);for(const q of points){const d=Math.hypot(p.x-q.x,p.y-q.y);if(d<140){ctx.strokeStyle=`rgba(67,197,207,${(1-d/140)*.13})`;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke()}}}}requestAnimationFrame(draw)}draw();


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
