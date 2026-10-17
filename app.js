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
  const enabled = () => finePointer.matches && !reduced.matches && !card.matches(':focus-within');
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
    if (e.target.closest('button,input,select,summary') || e.pointerType === 'touch' || !enabled()) { reset(); return; }
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

// Menu uses the same free-moving proximity network as the page background.
(() => {
  const svg = document.querySelector('.n-network');
  if (!svg) return;
  const ns = 'http://www.w3.org/2000/svg', width = 691, height = 410;
  const lines = document.createElementNS(ns, 'path');
  lines.setAttribute('fill', 'none'); lines.setAttribute('stroke', 'currentColor');
  lines.setAttribute('stroke-width', '.65');
  const dots = document.createElementNS(ns, 'g'); dots.setAttribute('fill', 'currentColor');
  const centers = Array.from({length: 4}, () => ({x:45+Math.random()*(width-90), y:40+Math.random()*(height-80)}));
  const points = Array.from({length: 29}, (_, i) => {
    const dot = document.createElementNS(ns, 'circle');
    dot.setAttribute('r','1.25'); dots.append(dot);
    const center = centers[Math.floor(Math.random()*centers.length)];
    const angle = Math.random()*Math.PI*2, radius = 12+Math.random()*65;
    const grouped = i < 23;
    return {x:grouped?Math.max(4,Math.min(width-4,center.x+Math.cos(angle)*radius)):Math.random()*width,
      y:grouped?Math.max(4,Math.min(height-4,center.y+Math.sin(angle)*radius)):Math.random()*height,
      vx:(Math.random()-.5)*14,vy:(Math.random()-.5)*14,dot};
  });
  svg.replaceChildren(lines,dots);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = true, frame = 0, previous = 0;
  function render(dt) {
    points.forEach(p => {
      p.x=(p.x+p.vx*dt+width)%width; p.y=(p.y+p.vy*dt+height)%height;
      p.dot.setAttribute('cx',p.x.toFixed(2)); p.dot.setAttribute('cy',p.y.toFixed(2));
    });
    const segments=[];
    for(let i=0;i<points.length;i++){
      const p=points[i];
      for(let j=i+1;j<points.length;j++){
        const q=points[j],d=Math.hypot(p.x-q.x,p.y-q.y);
        if(d<110)segments.push('M'+p.x.toFixed(2)+' '+p.y.toFixed(2)+'L'+q.x.toFixed(2)+' '+q.y.toFixed(2));
      }
    }
    lines.setAttribute('d',segments.join(''));
  }
  render(0);
  function paint(time){
    frame=0;
    if(!visible||document.hidden||motion.matches)return;
    const elapsed=time-previous;
    if(elapsed>=33){render(previous?Math.min(elapsed/1000,.05):0);previous=time;}
    frame=requestAnimationFrame(paint);
  }
  function resume(){
    if(frame)cancelAnimationFrame(frame);
    frame=0;previous=0;
    if(visible&&!document.hidden&&!motion.matches)frame=requestAnimationFrame(paint);
  }
  new IntersectionObserver(e=>{visible=e[0].isIntersecting;resume();}).observe(svg);
  document.addEventListener('visibilitychange',resume);
  motion.addEventListener('change',resume);
})();

// Interactive browser-only preview. No game process or service is controlled.
(() => {
  const menu = document.querySelector('.nocturne-window');
  if (!menu) return;
  const tabs = menu.querySelector('.n-tabs');
  const sidebar = menu.querySelector('.n-sidebar');
  const panels = [menu.querySelector('.n-aim'), menu.querySelector('.n-target')];
  const status = menu.querySelector('.n-status');
  const values = {};
  let active = 'Aim';
  const pages = {
    Aim: [['Aimbot Settings', ['Enabled','check',true], ['Show FOV','check',false], ['Aim key','select',['Mouse 5','Mouse 4','Shift','Alt']], ['Hitbox','select',['Head','Chest','Body']], ['FOV (px)','range',200,20,400], ['Smoothing','range',1,1,20]], ['Target Selection',['Visible only','check',false],['Target lock','check',true]]],
    Visuals: [['Player info',['Player boxes','check',true],['Health bars','check',true],['Names','check',true],['Weapon labels','check',false]], ['Appearance',['ESP color','color','#43c5cf'],['Glow','check',false],['Text size','range',12,9,20]]],
    Misc: [['Menu',['Menu key','select',['L','Insert','Home']],['Menu opacity','range',100,65,100]], ['Preview',['Reset preview','action']]],
    Sound: [['Hit & kill sounds',['Hit sound','select',['Off','Click','Bell']],['Kill sound','select',['Off','Click','Bell']],['Volume','range',50,0,100]], ['Audio preview',['Play hit sound','sound'],['Play kill sound','sound']]],
    Config: [['Configuration profiles'], ['Saved in this browser']]
  };
  const tabButtons = [];
  tabs.replaceChildren(); tabs.setAttribute('role','tablist'); tabs.setAttribute('aria-label','Menu preview sections');
  Object.keys(pages).forEach((name,i) => {
    const button = document.createElement('button'); button.type='button'; button.textContent=name;
    button.setAttribute('role','tab'); button.id='preview-tab-'+name.toLowerCase();
    button.setAttribute('aria-controls','preview-settings');
    button.addEventListener('click',()=>{active=name;render();});
    button.addEventListener('keydown',e=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
      e.preventDefault(); const n=tabButtons.length;
      const index=e.key==='Home'?0:e.key==='End'?n-1:(i+(e.key==='ArrowRight'?1:-1)+n)%n;
      tabButtons[index].click();tabButtons[index].focus();
    });
    tabs.append(button);tabButtons.push(button);
  });
  menu.querySelector('.n-window-controls').remove();
  const notice=document.createElement('span');notice.className='n-preview-tag';notice.textContent='PREVIEW';tabs.after(notice);
  sidebar.replaceChildren();
  const sideTitle=document.createElement('div');sideTitle.className='n-side-section';sidebar.append(sideTitle);
  const sideNote=document.createElement('p');sideNote.className='n-side-note';sideNote.textContent='Try the settings. Changes apply to this preview only.';sidebar.append(sideNote);
  const reset=document.createElement('button');reset.className='n-reset';reset.type='button';reset.textContent='Reset preview';reset.addEventListener('click',resetAll);sidebar.append(reset);
  status.replaceChildren();status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  function message(text){status.textContent=text;}
  function resetAll(){Object.keys(values).forEach(k=>delete values[k]);render();message('Preview reset.');}
  function control(parent, spec) {
    const [name,type,initial,min,max]=spec,key=active+':'+name;
    if(!(key in values))values[key]=Array.isArray(initial)?initial[0]:initial;
    if(['action','sound'].includes(type)){
      const button=document.createElement('button');button.type='button';button.className='n-demo-button';button.textContent=name;
      button.addEventListener('click',()=>type==='action'?resetAll():play(name));parent.append(button);return;
    }
    const label=document.createElement('label');label.className='n-control n-control-'+type;
    const title=document.createElement('span');title.textContent=name;label.append(title);
    const input=document.createElement(type==='select'?'select':'input');
    if(type==='select')initial.forEach(item=>{const option=document.createElement('option');option.value=item;option.textContent=item;input.append(option);});
    else input.type=type==='check'?'checkbox':type;
    if(type==='check')input.checked=!!values[key];else input.value=values[key];
    if(type==='range'){input.min=min;input.max=max;input.step=1;const output=document.createElement('output');output.textContent=input.value;title.append(output);input.addEventListener('input',()=>output.textContent=input.value);}
    input.addEventListener('input',()=>{
      values[key]=type==='check'?input.checked:type==='range'?+input.value:input.value;
      applyAppearance();
    });
    label.append(input);parent.append(label);
  }
  function applyAppearance(){
    menu.style.setProperty('--demo-color',values['Visuals:ESP color']||'#43c5cf');
    menu.querySelector('.n-workspace').style.opacity=(values['Misc:Menu opacity']??100)/100;
  }
  function profiles(panel){
    const name=document.createElement('input');name.type='text';name.maxLength=40;name.placeholder='Profile name';name.setAttribute('aria-label','Profile name');name.className='n-profile-input';panel.append(name);
    const saved=document.createElement('select');saved.setAttribute('aria-label','Saved profile');saved.className='n-profile-input';panels[1].append(saved);
    function read(){try{return JSON.parse(localStorage.getItem('nocturne-preview-profiles')||'{}');}catch{return {};}}
    function refresh(){saved.replaceChildren();Object.keys(read()).forEach(n=>{const o=document.createElement('option');o.value=n;o.textContent=n;saved.append(o);});}
    ['Save profile','Load profile','Delete profile'].forEach((text,index)=>{
      const b=document.createElement('button');b.type='button';b.className='n-demo-button';b.textContent=text;
      b.addEventListener('click',()=>{
        const data=read(),n=index===0?name.value.trim():saved.value;
        if(!n){message(index===0?'Enter a profile name.':'No saved profile selected.');return;}
        try{
          if(index===0){data[n]={...values};localStorage.setItem('nocturne-preview-profiles',JSON.stringify(data));refresh();saved.value=n;message('Preview profile saved.');}
          else if(index===1){Object.keys(values).forEach(k=>delete values[k]);Object.assign(values,data[n]);render();message('Preview profile loaded.');}
          else{delete data[n];localStorage.setItem('nocturne-preview-profiles',JSON.stringify(data));refresh();message('Preview profile deleted.');}
        }catch{message('Browser storage is unavailable.');}
      });(index===0?panel:panels[1]).append(b);
    });refresh();
  }
  function play(name){
    const kind=name.includes('hit')?'Hit sound':'Kill sound',sound=values['Sound:'+kind]||'Off';
    if(sound==='Off'){message('Choose a sound first.');return;}
    try{
      const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio){message('Audio preview is unavailable.');return;}
      const audio=new Audio();audio.resume();const osc=audio.createOscillator(),gain=audio.createGain();
      osc.type=sound==='Bell'?'sine':'triangle';osc.frequency.value=sound==='Bell'?880:440;
      gain.gain.setValueAtTime(((values['Sound:Volume']??50)/100)*.12,audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.18);
      osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+.2);
      osc.onended=()=>audio.close();message('Example '+sound.toLowerCase()+' sound played.');
    }catch{message('Audio preview is unavailable.');}
  }
  function render(){
    tabButtons.forEach(b=>{const selected=b.textContent===active;b.setAttribute('aria-selected',selected);b.tabIndex=selected?0:-1;b.classList.toggle('n-active',selected);});
    sideTitle.textContent=active;message('Interactive preview — '+active);
    panels.forEach((panel,i)=>{
      panel.replaceChildren();const [heading,...specs]=pages[active][i];const title=document.createElement('div');title.className='n-heading';title.textContent=heading;panel.append(title);specs.forEach(s=>control(panel,s));
    });
    panels[0].id='preview-settings';panels[0].setAttribute('role','tabpanel');panels[0].setAttribute('aria-labelledby','preview-tab-'+active.toLowerCase());
    if(active==='Aim'){
      const spin=document.createElement('details');spin.className='n-spin-demo';
      const summary=document.createElement('summary');summary.innerHTML='<svg class="spinbot-arrow" viewBox="0 0 63.9 122.88" aria-hidden="true"><polygon fill="currentColor" points="63.9,61.44 0,122.88 0,0"/></svg>Spinbot';spin.append(summary);
      control(spin,['Spinbot enabled','check',false]);control(spin,['Spin speed','range',10,1,30]);panels[0].append(spin);
    }
    if(active==='Config')profiles(panels[0]);applyAppearance();
  }
  render();
})();

// Reveal content only when animation support is active; keep reduced-motion static.
(() => {
  if(!('IntersectionObserver' in window)||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
    if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}
  }),{threshold:.08});
  document.querySelectorAll('.product,.feature-grid article,.download,.faq').forEach(el=>{el.classList.add('reveal-ready');observer.observe(el);});
})();
