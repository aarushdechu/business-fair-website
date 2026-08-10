const products = [
  { id:'caricature', name:'Personalized Caricature', category:'art', mark:'YOU?', blurb:'A personalized black-and-white caricature drawn from a photo we take at the stall—and delete after drawing.', price:'$12 one person · $17 two people' },
  { id:'eagle', name:'Origami Eagle', category:'origami', image:'assets/products/origami-eagle-display.png', mark:'EAGLE', blurb:'An intricate, feathery eagle and one of our hardest folds to master.', price:'$8' },
  { id:'dragon', name:'Origami Dragon', category:'origami', image:'assets/products/origami-dragon-v3-display.png', mark:'DRAGON', blurb:'An upgraded fair-exclusive dragon with a better neck and folded wings.', price:'$5' },
  { id:'mouse', name:'Origami Mouse', category:'origami', image:'assets/products/origami-mouse-display.png', mark:'MOUSE', blurb:'A tiny, adorable mouse with very cool ears and a tail we really love.', price:'$6' },
  { id:'kangaroo', name:'Origami Kangaroo', category:'origami', image:'assets/products/origami-kangaroo-display.png', mark:'KNG', blurb:'No comment. Just KANGAROOOOO—in carefully folded paper.', price:'$5' },
  { id:'turtle', name:'Origami Turtle', category:'origami', image:'assets/products/origami-turtle-display.png', mark:'TRL', blurb:'A turtle with a dimensional shell and a satisfyingly flat top.', price:'$5' },
  { id:'crochet-bookmark', name:'Crochet Bookmark', category:'crochet', mark:'YARN', blurb:'A soft crochet bookmark available in multiple handmade designs.', price:'$5' },
  { id:'origami-bookmark', name:'Origami Corner Bookmark', category:'origami', mark:'PAGE', blurb:'A cute, simple corner bookmark that hugs the page you are saving.', price:'$2' }
];

if ('scrollRestoration' in history) history.scrollRestoration='manual';
if (!location.hash && !new URLSearchParams(location.search).has('track')) window.scrollTo(0,0);

const state = {
  picks: JSON.parse(localStorage.getItem('sketchy-picks') || '[]').filter(id=>products.some(product=>product.id===id)),
  orders: JSON.parse(localStorage.getItem('sketchy-orders') || '[]').map(order=>({ ...order,email:order.email||'',updatedAt:order.updatedAt||order.createdAt })),
  orderFilter: 'active',
  staffPin: sessionStorage.getItem('sketchy-staff-pin') || '',
  backendAvailable: true,
  user: null,
  googleEnabled: false
};
let revealObserver;
let trackingRefreshTimer;
let staffRefreshTimer;
let filmTimer;
let projectTaps=0;
let logoTaps=0;
let lastCustomerOrderNumber='';
let mobileMenuTimer;

const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
const save = () => { localStorage.setItem('sketchy-picks', JSON.stringify(state.picks)); localStorage.setItem('sketchy-orders', JSON.stringify(state.orders)); };
const productById = id => products.find(p => p.id === id);
const productVisual = (product, compact=false) => product.image
  ? `<img src="${product.image}" alt="${product.name}" loading="lazy" />`
  : `<span class="paper-art ${compact?'paper-art-small':''}" aria-hidden="true"><b>${product.mark}</b><small>${product.category==='crochet'?'HANDMADE YARN':'HANDMADE'}</small></span>`;

async function api(path,options={}) {
  const headers={ 'Content-Type':'application/json',...(options.staff&&state.staffPin?{'X-Staff-Pin':state.staffPin}:{}),...(options.headers||{}) };
  const response=await fetch(`/api${path}`,{ ...options,headers });
  const data=response.status===204?null:await response.json().catch(()=>({ error:'The server returned an unreadable response.' }));
  if(!response.ok) { const error=new Error(data?.error || 'Request failed.'); error.status=response.status; throw error; }
  return data;
}
async function loadOrders() { state.orders=await api('/orders',{staff:true}); renderOrders(); }

function renderProductStory() {
  $('#storyCards').innerHTML=products.map((p,i)=>`
    <article class="story-card${i===0?' is-current':''}${p.id==='caricature'?' featured-story':''}" data-story-index="${i}">
      <span class="story-number" aria-hidden="true">${String(i+1).padStart(2,'0')}</span>
      <button class="story-object${p.image?' has-photo':''}" data-product-surprise="${p.id}" type="button" aria-label="Play with the ${p.name}">${productVisual(p)}</button>
      <div class="story-copy">
        <p class="eyebrow">${p.id==='caricature'?'★ Featured case':`Case ${String(i+1).padStart(2,'0')} · ${p.category}`}</p>
        <h2>${p.name}<em>${p.category==='origami'?'One sheet. A lot of personality.':p.category==='crochet'?'Soft, useful, and made by hand.':'Your face. Our funniest lines.'}</em></h2>
        <p>${p.blurb}</p><div class="story-actions"><span class="story-price">${p.price}</span><button class="story-add${state.picks.includes(p.id)?' added':''}" data-product="${p.id}" type="button">${state.picks.includes(p.id)?'✓ In my picks':'+ Add to picks'}</button></div>
      </div>
    </article>`).join('');
  $('#storyRail').innerHTML=products.map((p,i)=>`<button class="story-dot${i===0?' is-current':''}" type="button" data-story-jump="${i}" aria-label="Show ${p.name}"></button>`).join('');
}

function togglePick(id) {
  const index = state.picks.indexOf(id);
  if (index >= 0) { state.picks.splice(index,1); toast('Removed from your picks'); }
  else { state.picks.push(id); toast(`${productById(id).name} added!`); }
  save(); syncPickButtons(); renderDrawer();
}

function syncPickButtons() {
  $$('[data-product]').forEach(button=>{ const added=state.picks.includes(button.dataset.product);button.classList.toggle('added',added);if(button.classList.contains('story-add'))button.textContent=added?'✓ In my picks':'+ Add to picks'; });
  $('#mobilePickCount').textContent=state.picks.length;
}

function renderDrawer() {
  $('#caseCount').textContent = state.picks.length;
  $('#caseCount').dataset.count = state.picks.length;
  const box = $('#drawerItems');
  if (!state.picks.length) box.innerHTML = `<div class="empty-case"><span>＋</span><h3>No picks yet!</h3><p>Browse the collection and add anything that catches your eye.</p></div>`;
  else box.innerHTML = state.picks.map(id => { const p=productById(id); return `<div class="drawer-item"><div class="mini-art${p.image?' has-photo':''}">${productVisual(p,true)}</div><div><h3>${p.name}</h3><p>${p.price}</p></div><button class="remove-item" data-remove="${id}" aria-label="Remove ${p.name}" type="button">×</button></div>`; }).join('');
  $('#showAtStallBtn').disabled = !state.picks.length;
  $('#showAtStallBtn').style.opacity = state.picks.length ? '1' : '.45';
  $('#mobilePickCount').textContent=state.picks.length;
}

function openDrawer() { $('#caseDrawer').classList.add('open'); $('#caseDrawer').setAttribute('aria-hidden','false'); $('#scrim').hidden=false; document.body.style.overflow='hidden'; }
function closeDrawer() { $('#caseDrawer').classList.remove('open'); $('#caseDrawer').setAttribute('aria-hidden','true'); $('#scrim').hidden=true; document.body.style.overflow=''; }
function openCustomerOrder() {
  if(!state.picks.length){toast('Add something to My Picks first');return;}
  closeDrawer();
  const selected=state.picks.map(productById).filter(Boolean),hasCaricature=state.picks.includes('caricature');
  $('#customerOrderSummary').innerHTML=selected.map(product=>`<div><span>${escapeHtml(product.name)}</span><b>${escapeHtml(product.price)}</b></div>`).join('');
  $('#customerOrderEntry').hidden=false;$('#customerOrderSuccess').hidden=true;
  const name=$('#publicCustomerName'),email=$('#publicCustomerEmail');
  if(state.user){name.value=state.user.name||'';email.value=state.user.email||'';}
  email.required=hasCaricature;
  $('#publicEmailHint').textContent=hasCaricature?'Required for caricatures':'Optional';
  $('#customerOrderOverlay').hidden=false;document.body.style.overflow='hidden';
  setTimeout(()=>name.focus(),50);
}
function closeCustomerOrder() { $('#customerOrderOverlay').hidden=true;document.body.style.overflow=''; }
let toastTimer;
function toast(message) { const el=$('#toast'); el.textContent=message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),2200); }

function openMobileMenu() {
  clearTimeout(mobileMenuTimer);
  $('#mobileMenu').hidden=false;
  $('#mobileMenuToggle').setAttribute('aria-expanded','true');
  $('#mobileMenuToggle').setAttribute('aria-label','Close menu');
  document.body.classList.add('mobile-menu-open');
  requestAnimationFrame(()=>$('#mobileMenu').classList.add('is-open'));
}
function closeMobileMenu(immediate=false) {
  clearTimeout(mobileMenuTimer);
  const menu=$('#mobileMenu');
  menu.classList.remove('is-open');
  $('#mobileMenuToggle').setAttribute('aria-expanded','false');
  $('#mobileMenuToggle').setAttribute('aria-label','Open menu');
  document.body.classList.remove('mobile-menu-open');
  if(immediate)menu.hidden=true;
  else mobileMenuTimer=setTimeout(()=>{if(!menu.classList.contains('is-open'))menu.hidden=true;},520);
}
function toggleMobileMenu() { $('#mobileMenu').classList.contains('is-open')?closeMobileMenu():openMobileMenu(); }

function applyRoleUI() {
  const admin=Boolean(state.user?.isAdmin);
  document.body.classList.toggle('admin-mode',admin);
  $('#mobileAdminBtn').hidden=!admin;
  if(admin&&$('#caseDrawer').classList.contains('open'))closeDrawer();
  if(admin&&!$('#trackingOverlay').hidden)closeTracking();
}

function renderStaffProducts() {
  $('#staffProducts').innerHTML = products.map(p => `<label class="staff-product"><input type="checkbox" name="items" value="${p.id}" />${p.name}</label>`).join('');
}
function nextOrderNumber() { return String(Math.max(100,...state.orders.map(o=>Number(o.number)).filter(Number.isFinite))+1); }
function renderStats() {
  const active=state.orders.filter(o=>!['picked-up'].includes(o.status)).length;
  const drawing=state.orders.filter(o=>o.status==='drawing').length;
  const ready=state.orders.filter(o=>o.status==='ready').length;
  const done=state.orders.filter(o=>o.status==='picked-up').length;
  $('#staffStats').innerHTML = [[active,'Active orders'],[drawing,'Being made'],[ready,'Ready now'],[done,'Picked up']].map(([n,l])=>`<div class="stat"><strong>${n}</strong><span>${l}</span></div>`).join('');
}
function filteredOrders() {
  if(state.orderFilter==='ready') return state.orders.filter(o=>o.status==='ready');
  if(state.orderFilter==='active') return state.orders.filter(o=>o.status!=='picked-up');
  return state.orders;
}
function renderOrders() {
  renderStats(); const orders=filteredOrders(); const box=$('#ordersList');
  if(!orders.length) { box.innerHTML=`<div class="empty-orders"><span>✓</span><h3>All clear!</h3><p>No orders in this view.</p></div>`; return; }
  box.innerHTML=orders.map(o=>`<article class="order-card status-${o.status}"><div class="order-number"><div><small>ORDER</small><strong>#${o.number}</strong></div></div><div class="order-info"><h3>${escapeHtml(o.customer)}</h3><p><b>${o.items.map(id=>productById(id)?.name).filter(Boolean).join(' · ')}</b></p>${o.email?`<p>Updates: ${escapeHtml(o.email)}</p>`:''}${o.notes?`<p>Note: ${escapeHtml(o.notes)}</p>`:''}<p>${new Date(o.createdAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}</p></div><div class="order-actions"><select data-order-status="${o.id}" aria-label="Status for order ${o.number}"><option value="received" ${o.status==='received'?'selected':''}>Received</option><option value="drawing" ${o.status==='drawing'?'selected':''}>Making</option><option value="ready" ${o.status==='ready'?'selected':''}>Ready!</option><option value="picked-up" ${o.status==='picked-up'?'selected':''}>Picked up</option></select><button class="delete-order" data-delete-order="${o.id}" aria-label="Delete order ${o.number}" type="button">×</button></div></article>`).join('');
}
function escapeHtml(value) { const d=document.createElement('div'); d.textContent=value; return d.innerHTML; }
async function showStaff() {
  const signedInAdmin=Boolean(state.user?.isAdmin);
  if(!signedInAdmin&&!state.staffPin) state.staffPin=prompt('Sign in with an admin Google account, or enter the staff PIN:')?.trim() || '';
  if(!signedInAdmin&&!state.staffPin) return;
  try { await loadOrders();state.backendAvailable=true; }
  catch(error) {
    if(error.status===401){
      if(signedInAdmin) { state.user=null;renderAccount();toast('Your admin session expired. Sign in again.'); }
      else { state.staffPin='';sessionStorage.removeItem('sketchy-staff-pin');toast(error.message); }
      return;
    }
    state.backendAvailable=false;renderOrders();toast('Backend not deployed yet — using this device only');
  }
  if(state.staffPin)sessionStorage.setItem('sketchy-staff-pin',state.staffPin);
  closeDrawer();closeMobileMenu(true); $('#storeView').hidden=true; $('footer').hidden=true; $('#staffView').hidden=false; $('.site-header').hidden=true; $('#caseNav').hidden=true; $('#trackingFab').hidden=true; window.scrollTo(0,0); updateClock();
  clearInterval(staffRefreshTimer);if(state.backendAvailable)staffRefreshTimer=setInterval(()=>loadOrders().catch(()=>{}),15000);
}
function showStore() { clearInterval(staffRefreshTimer);$('#storeView').hidden=false; $('footer').hidden=false; $('#staffView').hidden=true; $('.site-header').hidden=false; $('#caseNav').hidden=false; $('#trackingFab').hidden=false;applyRoleUI();window.scrollTo(0,0); }
function updateClock() { const el=$('#staffClock'); if(el) el.textContent=new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}); }

function openTracking(orderNumber='') {
  $('#trackingOverlay').hidden=false; document.body.style.overflow='hidden';
  $('#trackingNumber').value=orderNumber; $('#trackingResult').hidden=true;
  if(orderNumber) lookupOrder(orderNumber); else setTimeout(()=>$('#trackingNumber').focus(),50);
}
function closeTracking() { clearInterval(trackingRefreshTimer);$('#trackingOverlay').hidden=true;document.body.style.overflow=''; }
async function lookupOrder(orderNumber,silent=false) {
  const result=$('#trackingResult'); result.hidden=false; if(!silent)result.innerHTML='<p>Checking the evidence…</p>';
  try {
    const order=await api(`/track/${encodeURIComponent(orderNumber.trim())}`);
    const steps=['received','drawing','ready','picked-up'],current=Math.max(0,steps.indexOf(order.status));
    const labels={received:'Order received',drawing:'Being made',ready:'Ready to collect!', 'picked-up':'Picked up'};
    result.innerHTML=`<div class="tracking-head"><div><p class="eyebrow">Order #${order.number}</p><h3>Hi, ${escapeHtml(order.customer)}!</h3></div><span class="tracking-status">${labels[order.status]}</span></div><div class="status-track" aria-label="Order progress">${steps.map((step,i)=>`<span class="${i<=current?'done':''}" title="${labels[step]}"></span>`).join('')}</div><p><b>${order.items.map(id=>productById(id)?.name).filter(Boolean).join(' · ')}</b></p><p>${order.status==='ready'?'Your order is ready—come back to the stall and show us this screen.':order.status==='picked-up'?'Case closed. Thanks for visiting A Sketchy Business!':'We’ll update this page as your order moves along.'}</p><p class="tracking-updated">Last updated ${new Date(order.updatedAt).toLocaleString([],{hour:'numeric',minute:'2-digit',month:'short',day:'numeric'})}</p>`;
    history.replaceState(null,'',`${location.pathname}?track=${encodeURIComponent(orderNumber.trim())}`);
    clearInterval(trackingRefreshTimer);trackingRefreshTimer=setInterval(()=>lookupOrder(orderNumber,true),15000);
  } catch(error) { if(!silent)result.innerHTML=`<p><b>Case not found.</b><br>${escapeHtml(error.message)}</p>`; }
}

function openAccount() {
  $('#accountOverlay').hidden=false;
  document.body.style.overflow='hidden';
  if(state.user&&!state.user.isAdmin) loadMyOrders();
}
function closeAccount() { $('#accountOverlay').hidden=true;document.body.style.overflow=''; }
function renderAccount() {
  const signedIn=Boolean(state.user);
  applyRoleUI();
  $('#accountSignedOut').hidden=signedIn;
  $('#accountSignedIn').hidden=!signedIn;
  $('#accountNavBtn').lastChild.textContent=signedIn?'Account':'Sign in';
  $('#mobileAccountBtn').classList.toggle('signed-in',signedIn);
  if(!signedIn)return;
  $('#accountName').textContent=state.user.name;
  $('#accountEmail').textContent=state.user.email;
  $('#accountAvatar').src=state.user.picture||'assets/logo.png';
  $('#accountSignedIn .account-person').classList.toggle('is-admin',Boolean(state.user.isAdmin));
  $('#accountAdminBtn').hidden=!state.user.isAdmin;
  $('#accountOrders').hidden=Boolean(state.user.isAdmin);
}
async function loadMyOrders() {
  const box=$('#accountOrders');
  box.innerHTML='<p class="account-empty">Looking for your orders…</p>';
  try {
    const orders=await api('/my-orders');
    if(!orders.length) { box.innerHTML='<p class="account-empty">No orders are connected to this Google email yet. Ask us to use this email when we enter your order at the stall.</p>';return; }
    const labels={received:'Received',drawing:'Being made',ready:'Ready!', 'picked-up':'Picked up'};
    box.innerHTML=orders.map(order=>`<button class="account-order" data-account-track="${order.number}" type="button"><strong>#${order.number}</strong><span>${order.items.map(id=>productById(id)?.name).filter(Boolean).join(' · ')}</span><b>${labels[order.status]}</b></button>`).join('');
  } catch(error) { box.innerHTML=`<p class="account-empty">${escapeHtml(error.message)}</p>`; }
}
function loadGoogleScript() {
  if(window.google?.accounts?.id)return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;script.defer=true;
    script.onload=resolve;script.onerror=()=>reject(new Error('Google sign-in could not load.'));
    document.head.appendChild(script);
  });
}
async function setupGoogleSignIn() {
  try {
    const config=await api('/config');state.googleEnabled=Boolean(config.googleClientId);
    try { const session=await api('/auth/me');state.user=session.user; } catch(error) { if(error.status!==401)throw error; }
    renderAccount();
    if(!state.googleEnabled) { $('#googleSignInNote').textContent='Google sign-in needs a client ID in Render before it can appear here.';return; }
    await loadGoogleScript();
    google.accounts.id.initialize({client_id:config.googleClientId,callback:async response=>{
      try { const session=await api('/auth/google',{method:'POST',body:JSON.stringify({credential:response.credential})});state.user=session.user;renderAccount();if(!state.user.isAdmin)loadMyOrders();toast(`Signed in as ${state.user.name}`); }
      catch(error) { toast(error.message); }
    }});
    google.accounts.id.renderButton($('#googleSignInButton'),{theme:'filled_black',size:'large',shape:'rectangular',text:'signin_with',logo_alignment:'left',width:Math.min(360,window.innerWidth-72)});
    $('#googleSignInNote').textContent='We only use your name and email to match your fair orders.';
  } catch(error) { $('#googleSignInNote').textContent='Sign-in is temporarily unavailable. Order-number tracking still works.'; }
}
async function signOut() {
  try { await api('/auth/logout',{method:'POST'}); } catch (_) {}
  window.google?.accounts?.id?.disableAutoSelect();state.user=null;renderAccount();toast('Signed out');
}

function burstConfetti() {
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

function setupPlayfulInteractions() {
  const finePointer = window.matchMedia('(pointer:fine)').matches;
  if (finePointer) {
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
  const targets = $$('.project-copy, .project-index, .portrait-stack, .feature-copy, .steps article, .final-cta > *', root);
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

function finishOpeningFilm() {
  clearTimeout(filmTimer);
  const film=$('#openingFilm');
  if(!film || film.classList.contains('is-finished')) return;
  film.classList.add('is-finished');document.body.classList.remove('film-playing');
  setTimeout(()=>film.hidden=true,700);
}
function setupOpeningFilm() {
  const film=$('#openingFilm');
  if(!film)return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches || new URLSearchParams(location.search).has('track')) { finishOpeningFilm();return; }
  film.classList.add('is-playing');
  film.addEventListener('wheel',event=>event.preventDefault(),{passive:false});
  filmTimer=setTimeout(finishOpeningFilm,8200);
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

  if (reduceMotion) return;
  let ticking = false;
  const updateScroll = () => {
    const y = window.scrollY;
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    $('#scrollProgress').style.transform = `scaleX(${Math.min(1,y/max)})`;
    $('.site-header').classList.toggle('scrolled', y > 24);
    revealVisible();
    const sectionIds=['#top','#project','#case-files','#how-it-works'];
    let activeId='#top';
    sectionIds.forEach(id => { if ($(id).getBoundingClientRect().top < window.innerHeight*.42) activeId=id; });
    $$('#caseNav [data-jump]').forEach(button => button.classList.toggle('active',button.dataset.jump===activeId));

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
    story.classList.toggle('story-started',storyRect.top<window.innerHeight*.72);
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
    $('.site-header').classList.toggle('dark-scene',storyActive);

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
  window.addEventListener('resize',updateScroll);
  window.addEventListener('load',()=>{
    if (location.hash) setTimeout(()=>{ try { $(location.hash)?.scrollIntoView(); } catch (_) {} updateScroll(); },120);
    requestAnimationFrame(updateScroll);
  },{once:true});
  window.addEventListener('hashchange',()=>requestAnimationFrame(updateScroll));
  updateScroll();
  setTimeout(updateScroll,250);
}

document.addEventListener('click', async e => {
  if(e.target.closest('#mobileMenu [data-jump]'))closeMobileMenu();
  const storyJump=e.target.closest('[data-story-jump]'); if(storyJump){ const story=$('.product-story'),distance=story.offsetHeight-window.innerHeight,progress=Number(storyJump.dataset.storyJump)/(products.length-1); window.scrollTo({top:story.offsetTop+distance*progress,behavior:'smooth'}); }
  const surprise=e.target.closest('[data-product-surprise]'); if(surprise){ const product=productById(surprise.dataset.productSurprise);surprise.classList.remove('is-booping');void surprise.offsetWidth;surprise.classList.add('is-booping');toast(`${product.name}: ${['highly suspicious craftsmanship.','definitely handmade evidence.','tiny object, huge personality.'][Math.floor(Math.random()*3)]}`); }
  const jump=e.target.closest('[data-jump]'); if(jump){ e.preventDefault();$(jump.dataset.jump)?.scrollIntoView({behavior:'smooth'}); }
  const add=e.target.closest('[data-product]'); if(add) togglePick(add.dataset.product);
  const remove=e.target.closest('[data-remove]'); if(remove) togglePick(remove.dataset.remove);
  const orderFilter=e.target.closest('[data-status]'); if(orderFilter){ state.orderFilter=orderFilter.dataset.status; $$('.order-filters button').forEach(b=>b.classList.toggle('active',b===orderFilter)); renderOrders(); }
  const copy=e.target.closest('[data-copy-value]'); if(copy){ await navigator.clipboard?.writeText(copy.dataset.copyValue); toast('Order number copied'); }
  const accountOrder=e.target.closest('[data-account-track]'); if(accountOrder){ closeAccount();openTracking(accountOrder.dataset.accountTrack); }
  const del=e.target.closest('[data-delete-order]'); if(del && confirm('Delete this order?')) { try { if(state.backendAvailable)await api(`/orders/${del.dataset.deleteOrder}`,{method:'DELETE',staff:true}); state.orders=state.orders.filter(o=>o.id!==del.dataset.deleteOrder);save();renderOrders(); } catch(error){ toast(error.message); } }
});
document.addEventListener('change', async e => {
  if(e.target.matches('[data-order-status]')) {
    const order=state.orders.find(o=>o.id===e.target.dataset.orderStatus); if(!order)return;
    const previous=order.status;e.target.disabled=true;
    try { const updated=state.backendAvailable?await api(`/orders/${order.id}`,{method:'PATCH',staff:true,body:JSON.stringify({status:e.target.value})}):{...order,status:e.target.value,emailSent:false}; Object.assign(order,updated);save();renderOrders();toast(`Order #${order.number} updated${updated.emailSent?' and emailed':''}`); }
    catch(error){ order.status=previous;renderOrders();toast(error.message); }
  }
});
$('#orderForm').addEventListener('submit', async e => {
  e.preventDefault(); const data=new FormData(e.currentTarget); const items=data.getAll('items');
  if(!items.length) { toast('Choose at least one item'); return; }
  const submit=e.currentTarget.querySelector('[type="submit"]');submit.disabled=true;
  try {
    const payload={customer:data.get('customerName').trim(),email:data.get('customerEmail').trim(),items,notes:data.get('notes').trim()};
    const order=state.backendAvailable?await api('/orders',{method:'POST',staff:true,body:JSON.stringify(payload)}):{id:crypto.randomUUID?.()||String(Date.now()),number:nextOrderNumber(),...payload,status:'received',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),emailSent:false};
    state.orders.unshift(order);save();e.currentTarget.reset();renderOrders();toast(`Order #${order.number} created${order.emailSent?' and emailed':''}!`);
  } catch(error) { toast(error.message); } finally { submit.disabled=false; }
});
$('#customerOrderForm').addEventListener('submit',async e=>{
  e.preventDefault();
  if(!state.picks.length){closeCustomerOrder();toast('Your picks are empty');return;}
  const submit=e.currentTarget.querySelector('[type="submit"]'),data=new FormData(e.currentTarget);submit.disabled=true;
  try {
    const order=await api('/public-orders',{method:'POST',body:JSON.stringify({customer:data.get('customer').trim(),email:data.get('email').trim(),notes:data.get('notes').trim(),items:[...state.picks]})});
    lastCustomerOrderNumber=order.number;
    $('#customerOrderNumber').textContent=`#${order.number}`;
    $('#customerOrderNumberCopy').textContent=`Order number: #${order.number}`;
    $('#customerOrderNumberCopy').dataset.copyValue=order.number;
    $('#customerOrderEntry').hidden=true;$('#customerOrderSuccess').hidden=false;
    state.picks=[];save();syncPickButtons();renderDrawer();e.currentTarget.reset();
    if(state.user&&!state.user.isAdmin)loadMyOrders();
  } catch(error){toast(error.message);} finally {submit.disabled=false;}
});
$('#caseButton').addEventListener('click',openDrawer); $('#bottomPicksBtn').addEventListener('click',openDrawer); $('#closeDrawer').addEventListener('click',closeDrawer); $('#scrim').addEventListener('click',closeDrawer);
$('#mobileMenuToggle').addEventListener('click',toggleMobileMenu);
$('#mobilePicksBtn').addEventListener('click',()=>{closeMobileMenu();openDrawer();}); $('#mobileTrackBtn').addEventListener('click',()=>{closeMobileMenu();openTracking();});
$('#mobileAccountBtn').addEventListener('click',()=>{closeMobileMenu();openAccount();});$('#accountNavBtn').addEventListener('click',openAccount);$('#closeAccount').addEventListener('click',closeAccount);$('#accountOverlay').addEventListener('click',e=>{if(e.target===$('#accountOverlay'))closeAccount();});$('#accountLogout').addEventListener('click',signOut);
$('#mobileAdminBtn').addEventListener('click',()=>{closeMobileMenu(true);showStaff();});
$('#accountAdminBtn').addEventListener('click',()=>{ closeAccount();showStaff(); });
$('#staffNavBtn').addEventListener('click',showStaff); $('#backStoreBtn').addEventListener('click',showStore);
$('#trackNavBtn').addEventListener('click',()=>openTracking()); $('#trackingFab').addEventListener('click',()=>openTracking()); $('#closeTracking').addEventListener('click',closeTracking); $('#trackingOverlay').addEventListener('click',e=>{if(e.target===$('#trackingOverlay'))closeTracking();});
$('#trackingForm').addEventListener('submit',e=>{e.preventDefault();lookupOrder(new FormData(e.currentTarget).get('orderNumber'));});
$('#showAtStallBtn').addEventListener('click',openCustomerOrder);$('#closeCustomerOrder').addEventListener('click',closeCustomerOrder);$('#customerOrderOverlay').addEventListener('click',e=>{if(e.target===$('#customerOrderOverlay'))closeCustomerOrder();});
$('#customerTrackBtn').addEventListener('click',()=>{closeCustomerOrder();openTracking(lastCustomerOrderNumber);});
$('#skipFilm').addEventListener('click',finishOpeningFilm);
$('#projectStamp').addEventListener('click',()=>{ const messages=['Summer project classified.','Built with paper, yarn, ink, and snacks.','Two young makers. Zero boring products.','Secret unlocked: creativity is the whole operation.'];toast(messages[projectTaps%messages.length]);projectTaps+=1;if(projectTaps%4===0)burstConfetti(); });
$('.brand').addEventListener('click',()=>{logoTaps+=1;if(logoTaps===3){toast('Logo tapped 3× — extremely sketchy behavior.');burstConfetti();logoTaps=0;} });
$('#clearDoneBtn').addEventListener('click',async()=>{ const count=state.orders.filter(o=>o.status==='picked-up').length; if(count && confirm(`Clear ${count} picked-up order${count===1?'':'s'}?`)){ try { if(state.backendAvailable)await api('/orders/picked-up',{method:'DELETE',staff:true});state.orders=state.orders.filter(o=>o.status!=='picked-up');save();renderOrders(); } catch(error){toast(error.message);} } });
document.addEventListener('keydown',e=>{ if(e.key==='Escape') { closeMobileMenu();closeDrawer();closeTracking();closeCustomerOrder();closeAccount();finishOpeningFilm(); } });
setInterval(updateClock,30000);
renderProductStory(); renderDrawer(); syncPickButtons(); renderStaffProducts(); renderOrders(); updateClock();
setupOpeningFilm();
setupScrollExperience();
setupPlayfulInteractions();
setupGoogleSignIn();
const trackingFromUrl=new URLSearchParams(location.search).get('track'); if(trackingFromUrl) openTracking(trackingFromUrl);
if(location.hash==='#account') openAccount();
if(location.hash==='#case-files') $('#case-files').classList.add('story-started');
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) window.addEventListener('load',()=>navigator.serviceWorker.register('/service-worker.js').catch(()=>{}),{once:true});
