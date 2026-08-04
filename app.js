const products = [
  { id:'eagle', name:'Origami Eagle', category:'origami', icon:'🦅', blurb:'A sharp-winged paper bird ready to soar.', price:'Ask at stall' },
  { id:'dragon', name:'Origami Dragon', category:'origami', icon:'🐉', blurb:'A fierce little desk guardian with folded wings.', price:'Ask at stall' },
  { id:'mouse', name:'Origami Mouse', category:'origami', icon:'🐭', blurb:'Tiny, curious, and suspiciously good at hiding.', price:'Ask at stall' },
  { id:'kangaroo', name:'Origami Kangaroo', category:'origami', icon:'🦘', blurb:'A pocket-sized hopper, folded by hand.', price:'Ask at stall' },
  { id:'turtle', name:'Origami Turtle', category:'origami', icon:'🐢', blurb:'Slow, steady, and made from one clever sheet.', price:'Ask at stall' },
  { id:'origami-bookmark', name:'Origami Bookmark', category:'origami', icon:'🔖', blurb:'A colorful page-corner companion for your next case.', price:'Ask at stall' },
  { id:'heart-keychain', name:'Crochet Heart Keychain', category:'crochet', icon:'🧡', blurb:'A soft little heart to take everywhere.', price:'Ask at stall' },
  { id:'crochet-bookmark', name:'Crochet Bookmark', category:'crochet', icon:'🧶', blurb:'A cozy, handmade way to save your page.', price:'Ask at stall' },
  { id:'caricature', name:'Personalized Caricature', category:'art', icon:'✍️', blurb:'A funny, one-of-one portrait drawn just for you.', price:'Made on site' }
];

const state = {
  picks: JSON.parse(localStorage.getItem('sketchy-picks') || '[]'),
  orders: JSON.parse(localStorage.getItem('sketchy-orders') || '[]'),
  clues: JSON.parse(localStorage.getItem('sketchy-clues') || '[]'),
  orderFilter: 'active'
};
let revealObserver;
let catalogTravel = 0;

const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
const save = () => { localStorage.setItem('sketchy-picks', JSON.stringify(state.picks)); localStorage.setItem('sketchy-orders', JSON.stringify(state.orders)); localStorage.setItem('sketchy-clues', JSON.stringify(state.clues)); };
const productById = id => products.find(p => p.id === id);

function renderProducts(filter='all') {
  $('#productGrid').innerHTML = products.map((p,i) => `
    <article class="product-card ${filter !== 'all' && p.category !== filter ? 'hidden' : ''}" data-category="${p.category}">
      <div class="product-art"><span class="card-tag">File ${String(i+1).padStart(2,'0')} · ${p.category}</span><span class="emoji" aria-hidden="true">${p.icon}</span><span class="card-glint" aria-hidden="true"></span></div>
      <div class="card-body"><h3>${p.name}</h3><p>${p.blurb}</p><div class="card-bottom"><span class="price">${p.price}</span><button class="add-button ${state.picks.includes(p.id)?'added':''}" data-product="${p.id}" type="button" aria-label="${state.picks.includes(p.id)?`Remove ${p.name} from my picks`:`Add ${p.name} to my picks`}"><span class="add-label">${state.picks.includes(p.id)?'In my picks':'Add to picks'}</span><span class="add-icon" aria-hidden="true"><b class="icon-plus">＋</b><b class="icon-check">✓</b></span></button></div></div>
    </article>`).join('');
  if (revealObserver) requestAnimationFrame(() => observeReveals($('#productGrid')));
  requestAnimationFrame(()=>{ updateCatalogMetrics(); window.dispatchEvent(new Event('scroll')); });
}

function renderProductStory() {
  $('#storyCards').innerHTML=products.map((p,i)=>`
    <article class="story-card${i===0?' is-current':''}" data-story-index="${i}">
      <span class="story-number" aria-hidden="true">${String(i+1).padStart(2,'0')}</span>
      <div class="story-object" aria-hidden="true">${p.icon}</div>
      <div class="story-copy">
        <p class="eyebrow">Case ${String(i+1).padStart(2,'0')} · ${p.category}</p>
        <h2>${p.name}<em>${p.category==='origami'?'One sheet. A lot of personality.':p.category==='crochet'?'Soft, useful, and made by hand.':'Your face. Our funniest lines.'}</em></h2>
        <p>${p.blurb}</p><span class="story-price">${p.price}</span>
      </div>
    </article>`).join('');
  $('#storyRail').innerHTML=products.map((p,i)=>`<button class="story-dot${i===0?' is-current':''}" type="button" data-story-jump="${i}" aria-label="Show ${p.name}"></button>`).join('');
}

function togglePick(id) {
  const index = state.picks.indexOf(id);
  if (index >= 0) { state.picks.splice(index,1); toast('Removed from your picks'); }
  else { state.picks.push(id); toast(`${productById(id).name} added!`); }
  save(); renderProducts($('.filter.active')?.dataset.filter || 'all'); renderDrawer();
}

function renderDrawer() {
  $('#caseCount').textContent = state.picks.length;
  $('#caseCount').dataset.count = state.picks.length;
  const box = $('#drawerItems');
  if (!state.picks.length) box.innerHTML = `<div class="empty-case"><span>⌕</span><h3>No clues yet!</h3><p>Browse the goods and add anything that catches your eye.</p></div>`;
  else box.innerHTML = state.picks.map(id => { const p=productById(id); return `<div class="drawer-item"><div class="mini-art">${p.icon}</div><div><h3>${p.name}</h3><p>${p.price}</p></div><button class="remove-item" data-remove="${id}" aria-label="Remove ${p.name}" type="button">×</button></div>`; }).join('');
  $('#showAtStallBtn').disabled = !state.picks.length;
  $('#showAtStallBtn').style.opacity = state.picks.length ? '1' : '.45';
}

function openDrawer() { $('#caseDrawer').classList.add('open'); $('#caseDrawer').setAttribute('aria-hidden','false'); $('#scrim').hidden=false; document.body.style.overflow='hidden'; }
function closeDrawer() { $('#caseDrawer').classList.remove('open'); $('#caseDrawer').setAttribute('aria-hidden','true'); $('#scrim').hidden=true; document.body.style.overflow=''; }
let toastTimer;
function toast(message) { const el=$('#toast'); el.textContent=message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),2200); }

function renderStaffProducts() {
  $('#staffProducts').innerHTML = products.map(p => `<label class="staff-product"><input type="checkbox" name="items" value="${p.id}" />${p.name}</label>`).join('');
}
function nextOrderNumber() {
  const nums=state.orders.map(o=>Number(o.number)).filter(Number.isFinite);
  return String(Math.max(100,...nums)+1);
}
function renderStats() {
  const active=state.orders.filter(o=>!['picked-up'].includes(o.status)).length;
  const drawing=state.orders.filter(o=>o.status==='drawing').length;
  const ready=state.orders.filter(o=>o.status==='ready').length;
  const done=state.orders.filter(o=>o.status==='picked-up').length;
  $('#staffStats').innerHTML = [[active,'Active orders'],[drawing,'Being drawn'],[ready,'Ready now'],[done,'Picked up']].map(([n,l])=>`<div class="stat"><strong>${n}</strong><span>${l}</span></div>`).join('');
}
function filteredOrders() {
  if(state.orderFilter==='ready') return state.orders.filter(o=>o.status==='ready');
  if(state.orderFilter==='active') return state.orders.filter(o=>o.status!=='picked-up');
  return state.orders;
}
function renderOrders() {
  renderStats(); const orders=filteredOrders(); const box=$('#ordersList');
  if(!orders.length) { box.innerHTML=`<div class="empty-orders"><span>✓</span><h3>All clear!</h3><p>No orders in this view.</p></div>`; return; }
  box.innerHTML=orders.map(o=>`<article class="order-card status-${o.status}"><div class="order-number"><div><small>ORDER</small><strong>#${o.number}</strong></div></div><div class="order-info"><h3>${escapeHtml(o.customer)}</h3><p><b>${o.items.map(id=>productById(id)?.name).filter(Boolean).join(' · ')}</b></p>${o.notes?`<p>Note: ${escapeHtml(o.notes)}</p>`:''}<p>${new Date(o.createdAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}</p></div><div class="order-actions"><select data-order-status="${o.id}" aria-label="Status for order ${o.number}"><option value="received" ${o.status==='received'?'selected':''}>Received</option><option value="drawing" ${o.status==='drawing'?'selected':''}>Drawing</option><option value="ready" ${o.status==='ready'?'selected':''}>Ready!</option><option value="picked-up" ${o.status==='picked-up'?'selected':''}>Picked up</option></select><button class="delete-order" data-delete-order="${o.id}" aria-label="Delete order ${o.number}" type="button">×</button></div></article>`).join('');
}
function escapeHtml(value) { const d=document.createElement('div'); d.textContent=value; return d.innerHTML; }
function showStaff() { closeDrawer(); $('#storeView').hidden=true; $('footer').hidden=true; $('#staffView').hidden=false; $('.site-header').hidden=true; $('#caseNav').hidden=true; $('#clueHud').hidden=true; window.scrollTo(0,0); renderOrders(); updateClock(); }
function showStore() { $('#storeView').hidden=false; $('footer').hidden=false; $('#staffView').hidden=true; $('.site-header').hidden=false; $('#caseNav').hidden=false; $('#clueHud').hidden=false; window.scrollTo(0,0); }
function updateClock() { const el=$('#staffClock'); if(el) el.textContent=new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}); }

function renderClues() {
  const count = state.clues.length;
  $('#clueCount').textContent = count;
  $('#clueHud').setAttribute('aria-label', `Secret case: ${count} of 3 clues found`);
  $$('.hidden-clue').forEach(clue => {
    const found = state.clues.includes(clue.dataset.clue);
    clue.classList.toggle('found', found);
    clue.textContent = found ? '✓' : clue.dataset.clue === 'paper-mark' ? '⌁' : '✦';
    clue.setAttribute('aria-label', found ? 'Maker mark found' : 'Hidden maker mark');
  });
}

function collectClue(id) {
  if (state.clues.includes(id)) { toast('You already found this maker mark'); return; }
  state.clues.push(id); save(); renderClues();
  toast(`Clue found — ${state.clues.length}/3`);
  if (state.clues.length === 3) setTimeout(showClueBadge, 350);
}

function showClueBadge() {
  $('#clueOverlay').hidden = false;
  document.body.style.overflow = 'hidden';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['#ee672d','#fff6a9','#b8bdaa','#ffd8be','#181816'];
  for (let i=0;i<26;i++) {
    const piece=document.createElement('i'); piece.className='confetti-piece';
    piece.style.setProperty('--confetti-color', colors[i%colors.length]);
    piece.style.setProperty('--confetti-x', `${Math.round((Math.random()-.5)*650)}px`);
    piece.style.setProperty('--confetti-y', `${Math.round((Math.random()-.55)*500)}px`);
    piece.style.setProperty('--confetti-r', `${Math.round((Math.random()-.5)*800)}deg`);
    piece.style.animationDelay=`${i*13}ms`; document.body.appendChild(piece);
    piece.addEventListener('animationend',()=>piece.remove());
  }
}
function closeClueBadge() { $('#clueOverlay').hidden=true; document.body.style.overflow=''; }

function updateCatalogMetrics() {
  const catalog=$('.catalog'),stage=$('.catalog-stage'),track=$('#productGrid');
  if (!catalog || !stage || !track) return;
  if (window.innerWidth <= 950 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    catalogTravel=0; catalog.style.height=''; catalog.style.setProperty('--catalog-x','0px'); return;
  }
  catalogTravel=Math.max(0,track.scrollWidth-stage.clientWidth);
  catalog.style.height=`${Math.round(window.innerHeight+catalogTravel+window.innerHeight*.22)}px`;
}

function setupPlayfulInteractions() {
  const finePointer = window.matchMedia('(pointer:fine)').matches;
  if (finePointer) {
    $('#productGrid').addEventListener('pointermove', e => {
      const card=e.target.closest('.product-card'); if(!card) return;
      const rect=card.getBoundingClientRect(); const x=(e.clientX-rect.left)/rect.width-.5; const y=(e.clientY-rect.top)/rect.height-.5;
      card.classList.add('is-tilting');
      card.style.transform=`perspective(850px) rotateX(${y*-5.5}deg) rotateY(${x*7}deg) translateY(-5px)`;
      card.style.setProperty('--glint-x',`${(x+.5)*100}%`); card.style.setProperty('--glint-y',`${(y+.5)*100}%`);
    });
    $('#productGrid').addEventListener('pointerout', e => {
      const card=e.target.closest('.product-card'); if(!card || card.contains(e.relatedTarget)) return;
      card.classList.remove('is-tilting'); card.style.transform='';
    });

    $$('.maker-note').forEach(note => note.addEventListener('pointerdown', e => {
      e.preventDefault(); const parent=note.parentElement; const noteRect=note.getBoundingClientRect(); const parentRect=parent.getBoundingClientRect();
      const startX=e.clientX,startY=e.clientY,startLeft=noteRect.left-parentRect.left,startTop=noteRect.top-parentRect.top;
      note.style.left=`${startLeft}px`; note.style.top=`${startTop}px`; note.style.right='auto'; note.style.bottom='auto'; note.classList.add('dragging'); note.setPointerCapture(e.pointerId);
      const move=ev=>{ const maxX=window.innerWidth-parentRect.left-note.offsetWidth-18,maxY=parent.offsetHeight-note.offsetHeight; note.style.left=`${Math.max(0,Math.min(maxX,startLeft+ev.clientX-startX))}px`; note.style.top=`${Math.max(0,Math.min(maxY,startTop+ev.clientY-startY))}px`; };
      const up=()=>{ note.classList.remove('dragging'); note.removeEventListener('pointermove',move); note.removeEventListener('pointerup',up); note.removeEventListener('pointercancel',up); };
      note.addEventListener('pointermove',move); note.addEventListener('pointerup',up); note.addEventListener('pointercancel',up);
    }));
  }
}

function observeReveals(root=document) {
  const targets = $$('.product-card, .section-heading, .filter-row, .portrait-stack, .feature-copy, .steps article, .final-cta > *', root);
  targets.forEach((el,index) => {
    if (el.dataset.revealReady) return;
    el.dataset.revealReady = 'true';
    el.classList.add('reveal-on-scroll');
    if (el.matches('.portrait-stack')) el.classList.add('reveal-left');
    if (el.matches('.feature-copy')) el.classList.add('reveal-right');
    el.style.setProperty('--reveal-delay', `${(index % 3) * 90}ms`);
    revealObserver.observe(el);
  });
}

function setupScrollExperience() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealVisible = () => {
    $$('.reveal-on-scroll:not(.is-visible)').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * .94 && rect.bottom > 0) el.classList.add('is-visible');
    });
  };
  revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    });
  }, { threshold:.12, rootMargin:'0px 0px -8% 0px' });
  observeReveals();
  revealVisible();
  requestAnimationFrame(() => document.body.classList.add('page-loaded'));

  if (reduceMotion) { document.body.classList.remove('intro-active'); return; }
  let ticking = false;
  const updateScroll = () => {
    const y = window.scrollY;
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    $('#scrollProgress').style.transform = `scaleX(${Math.min(1,y/max)})`;
    $('.site-header').classList.toggle('scrolled', y > 24);
    revealVisible();
    const sectionIds=['#top','#case-files','#how-it-works'];
    let activeId='#top';
    sectionIds.forEach(id => { if ($(id).getBoundingClientRect().top < window.innerHeight*.42) activeId=id; });
    $$('#caseNav [data-jump]').forEach(button => button.classList.toggle('active',button.dataset.jump===activeId));

    const intro=$('.intro-sequence');
    const introRect=intro.getBoundingClientRect();
    const introDistance=Math.max(1,intro.offsetHeight-window.innerHeight);
    const introProgress=Math.max(0,Math.min(1,-introRect.top/introDistance));
    const introEnter=1-Math.pow(1-Math.min(1,introProgress/.38),3);
    const introGather=Math.max(0,Math.min(1,(introProgress-.24)/.38));
    const introReveal=Math.max(0,Math.min(1,(introProgress-.58)/.28));
    const introFade=Math.max(0,Math.min(1,(introProgress-.9)/.1));
    document.body.classList.toggle('intro-active',introProgress<.91);
    intro.style.setProperty('--intro-grid-y',`${18-introProgress*35}%`);
    intro.style.setProperty('--intro-title-one-x',`${-105*(1-introEnter)-introGather*35}vw`);
    intro.style.setProperty('--intro-title-two-x',`${105*(1-introEnter)+introGather*35}vw`);
    intro.style.setProperty('--intro-title-opacity',`${1-introGather}`);
    intro.style.setProperty('--orb-paper-x',`${-4*(1-introEnter)+introGather*38}vw`);
    intro.style.setProperty('--orb-paper-y',`${Math.sin(introProgress*8)*12-introGather*8}vh`);
    intro.style.setProperty('--orb-paper-r',`${-18+introProgress*65}deg`);
    intro.style.setProperty('--orb-yarn-y',`${-8*(1-introEnter)+introGather*24}vh`);
    intro.style.setProperty('--orb-yarn-r',`${13-introProgress*55}deg`);
    intro.style.setProperty('--orb-ink-x',`${4*(1-introEnter)-introGather*38}vw`);
    intro.style.setProperty('--orb-ink-y',`${Math.cos(introProgress*8)*10-introGather*4}vh`);
    intro.style.setProperty('--orb-ink-r',`${19-introProgress*70}deg`);
    intro.style.setProperty('--intro-material-opacity',`${1-Math.min(1,Math.max(0,(introProgress-.58)/.17))}`);
    intro.style.setProperty('--intro-portal-scale',`${.05+introReveal*13}`);
    intro.style.setProperty('--intro-portal-opacity',`${introReveal}`);
    intro.style.setProperty('--intro-reveal-opacity',`${introReveal*(1-introFade)}`);
    intro.style.setProperty('--intro-reveal-scale',`${.7+introReveal*.3+introFade*.15}`);
    intro.style.setProperty('--intro-reveal-rotate',`${-3+introReveal*3}deg`);
    intro.style.setProperty('--intro-scroll-opacity',`${Math.max(.12,.7-introProgress*.8)}`);

    const hero = $('.hero');
    const heroProgress = Math.min(1, Math.max(0, y / Math.max(1,hero.offsetHeight)));
    hero.style.setProperty('--hero-logo-y', `${heroProgress * 78}px`);
    hero.style.setProperty('--hero-logo-rotate', `${heroProgress * 2.2}deg`);
    hero.style.setProperty('--hero-logo-scale', `${1 - heroProgress * .055}`);
    hero.style.setProperty('--hero-copy-y', `${heroProgress * 34}px`);

    const story=$('.product-story');
    const storyRect=story.getBoundingClientRect();
    const storyDistance=Math.max(1,story.offsetHeight-window.innerHeight);
    const storyProgress=Math.max(0,Math.min(1,-storyRect.top/storyDistance));
    const storyPosition=storyProgress*(products.length-1);
    const storyIndex=Math.max(0,Math.min(products.length-1,Math.round(storyPosition)));
    const storyActive=storyRect.top<68&&storyRect.bottom>68;
    const storyStage=$('.story-stage');
    const accent=products[storyIndex].category==='crochet'?'#ffb28e':products[storyIndex].category==='art'?'#f4f0e7':'#ee672d';
    storyStage.style.setProperty('--story-accent',accent);
    storyStage.style.setProperty('--story-grid-x',`${storyProgress*-90}px`);
    storyStage.style.setProperty('--story-grid-y',`${storyProgress*-55}px`);
    storyStage.style.setProperty('--story-ring-scale',`${.72+Math.sin(storyPosition*Math.PI)*.08}`);
    storyStage.style.setProperty('--story-core-scale',`${.1+Math.abs(Math.sin(storyPosition*Math.PI))*.22}`);
    $$('.story-card').forEach((card,i)=>{
      const distance=i-storyPosition,visibility=Math.max(0,1-Math.abs(distance)*1.45);
      card.style.opacity=visibility;
      card.style.transform=`translate3d(0,${distance*64}vh,0) scale(${.82+visibility*.18}) rotate(${distance*2.5}deg)`;
      card.style.zIndex=String(10-Math.round(Math.abs(distance)));
      card.classList.toggle('is-current',i===storyIndex);
      const object=$('.story-object',card);
      object.style.setProperty('--story-object-x',`${distance*-12}vw`);
      object.style.setProperty('--story-object-y',`${distance*9}vh`);
      object.style.setProperty('--story-object-r',`${distance*-24}deg`);
      object.style.setProperty('--story-object-scale',`${.82+visibility*.18}`);
    });
    $$('.story-dot').forEach((dot,i)=>dot.classList.toggle('is-current',i===storyIndex));
    $('#storyCounter').textContent=`${String(storyIndex+1).padStart(2,'0')} / ${String(products.length).padStart(2,'0')}`;

    const catalog = $('.catalog');
    const catalogRect = catalog.getBoundingClientRect();
    const catalogDistance=Math.max(1,catalog.offsetHeight-window.innerHeight);
    const catalogProgress=Math.max(0,Math.min(1,(68-catalogRect.top)/catalogDistance));
    const catalogExit=Math.max(0,Math.min(1,(catalogProgress-.94)/.06));
    $('.catalog-stage').style.opacity=`${1-catalogExit}`;
    $('.catalog-stage').style.clipPath=`inset(0 0 ${catalogExit*100}% 0)`;
    $('.catalog-stage').style.pointerEvents=catalogExit>.9?'none':'';
    catalog.style.setProperty('--catalog-x',`${catalogProgress*catalogTravel*-1}px`);
    catalog.style.setProperty('--catalog-shift', `${-4+catalogProgress*-34}vw`);

    const transition=$('.case-transition');
    const transitionRect=transition.getBoundingClientRect();
    $('.site-header').classList.toggle('dark-scene',storyActive||(catalogProgress>.985&&transitionRect.bottom>68));
    const transitionDistance=Math.max(1,transition.offsetHeight-window.innerHeight);
    const transitionProgress=Math.max(0,Math.min(1,-transitionRect.top/transitionDistance));
    const enter=1-Math.pow(1-Math.min(1,transitionProgress/.42),3);
    const exit=Math.max(0,Math.min(1,(transitionProgress-.62)/.24));
    const iris=Math.max(0,Math.min(1,(transitionProgress-.46)/.42));
    const verdict=Math.max(0,Math.min(1,(transitionProgress-.66)/.25));
    transition.style.setProperty('--paper-x',`${-110*(1-enter)-exit*70}vw`);
    transition.style.setProperty('--yarn-x',`${110*(1-enter)+exit*70}vw`);
    transition.style.setProperty('--ink-y',`${70*(1-enter)-exit*65}vh`);
    transition.style.setProperty('--ink-rotate',`${-12+enter*12-exit*8}deg`);
    transition.style.setProperty('--materials-opacity',`${1-exit}`);
    transition.style.setProperty('--iris-scale',`${.12+iris*15}`);
    transition.style.setProperty('--verdict-opacity',`${verdict}`);
    transition.style.setProperty('--verdict-scale',`${.75+verdict*.25}`);
    transition.style.setProperty('--verdict-rotate',`${-3+verdict*3}deg`);

    const feature = $('.caricature-feature');
    const featureRect = feature.getBoundingClientRect();
    const featureProgress = Math.max(-1,Math.min(1,(window.innerHeight * .55 - featureRect.top) / window.innerHeight));
    feature.style.setProperty('--portrait-one-y', `${featureProgress * -28}px`);
    feature.style.setProperty('--portrait-two-y', `${featureProgress * 35}px`);

    const how = $('.how');
    const howRect = how.getBoundingClientRect();
    const howProgress = Math.max(0,Math.min(1,(window.innerHeight * .75 - howRect.top) / (howRect.height * .65)));
    $('.steps').style.setProperty('--steps-progress', howProgress);
    ticking = false;
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking=true; requestAnimationFrame(updateScroll); } }, { passive:true });
  window.addEventListener('resize',()=>{ updateCatalogMetrics(); updateScroll(); });
  window.addEventListener('load',()=>{
    if (location.hash) setTimeout(()=>{ try { $(location.hash)?.scrollIntoView(); } catch (_) {} updateScroll(); },120);
    requestAnimationFrame(updateScroll);
  },{once:true});
  window.addEventListener('hashchange',()=>requestAnimationFrame(updateScroll));
  updateCatalogMetrics();
  updateScroll();
  setTimeout(updateScroll,250);
}

document.addEventListener('click', e => {
  const storyJump=e.target.closest('[data-story-jump]'); if(storyJump){ const story=$('.product-story'),distance=story.offsetHeight-window.innerHeight,progress=Number(storyJump.dataset.storyJump)/(products.length-1); window.scrollTo({top:story.offsetTop+distance*progress,behavior:'smooth'}); }
  const orb=e.target.closest('[data-orb]'); if(orb){ $$('.material-orb').forEach(item=>item.classList.toggle('is-lit',item===orb)); toast(`${orb.dataset.orb} selected — keep scrolling to open the case`); }
  const clue=e.target.closest('[data-clue]'); if(clue) collectClue(clue.dataset.clue);
  const jump=e.target.closest('[data-jump]'); if(jump) $(jump.dataset.jump)?.scrollIntoView({behavior:'smooth'});
  const add=e.target.closest('[data-product]'); if(add) togglePick(add.dataset.product);
  const remove=e.target.closest('[data-remove]'); if(remove) togglePick(remove.dataset.remove);
  const filter=e.target.closest('[data-filter]'); if(filter){ $$('.filter').forEach(b=>b.classList.toggle('active',b===filter)); renderProducts(filter.dataset.filter); }
  const orderFilter=e.target.closest('[data-status]'); if(orderFilter){ state.orderFilter=orderFilter.dataset.status; $$('.order-filters button').forEach(b=>b.classList.toggle('active',b===orderFilter)); renderOrders(); }
  const del=e.target.closest('[data-delete-order]'); if(del && confirm('Delete this order?')) { state.orders=state.orders.filter(o=>o.id!==del.dataset.deleteOrder); save(); renderOrders(); }
});
document.addEventListener('change', e => {
  if(e.target.matches('[data-order-status]')) { const order=state.orders.find(o=>o.id===e.target.dataset.orderStatus); if(order){ order.status=e.target.value; save(); renderOrders(); toast(`Order #${order.number} is now ${order.status.replace('-',' ')}`); } }
});
$('#orderForm').addEventListener('submit', e => {
  e.preventDefault(); const data=new FormData(e.currentTarget); const items=data.getAll('items');
  if(!items.length) { toast('Choose at least one item'); return; }
  const order={id:crypto.randomUUID?.() || String(Date.now()),number:nextOrderNumber(),customer:data.get('customerName').trim(),items,notes:data.get('notes').trim(),status:items.includes('caricature')?'drawing':'received',createdAt:new Date().toISOString()};
  state.orders.unshift(order); save(); e.currentTarget.reset(); renderOrders(); toast(`Order #${order.number} created!`);
});
$('#caseButton').addEventListener('click',openDrawer); $('#bottomPicksBtn').addEventListener('click',openDrawer); $('#closeDrawer').addEventListener('click',closeDrawer); $('#scrim').addEventListener('click',closeDrawer);
$('#staffNavBtn').addEventListener('click',showStaff); $('#backStoreBtn').addEventListener('click',showStore);
$('#showAtStallBtn').addEventListener('click',()=>{ toast('Show this screen to us at the stall!'); });
$('#clueHud').addEventListener('click',()=> state.clues.length===3 ? showClueBadge() : toast(`${3-state.clues.length} secret maker mark${3-state.clues.length===1?'':'s'} still hiding…`));
$('#closeClueBadge').addEventListener('click',closeClueBadge); $('#clueOverlay').addEventListener('click',e=>{ if(e.target===$('#clueOverlay')) closeClueBadge(); });
$('#huntAgainBtn').addEventListener('click',()=>{ state.clues=[];save();renderClues();closeClueBadge();toast('The secret case is open again'); });
$('#clearDoneBtn').addEventListener('click',()=>{ const count=state.orders.filter(o=>o.status==='picked-up').length; if(count && confirm(`Clear ${count} picked-up order${count===1?'':'s'}?`)){ state.orders=state.orders.filter(o=>o.status!=='picked-up');save();renderOrders(); } });
document.addEventListener('keydown',e=>{ if(e.key==='Escape') { closeDrawer(); closeClueBadge(); } });
setInterval(updateClock,30000);
renderProducts(); renderProductStory(); renderDrawer(); renderStaffProducts(); renderOrders(); renderClues(); updateClock();
setupScrollExperience();
setupPlayfulInteractions();
