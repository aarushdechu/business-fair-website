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
  orderFilter: 'active'
};

const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
const save = () => { localStorage.setItem('sketchy-picks', JSON.stringify(state.picks)); localStorage.setItem('sketchy-orders', JSON.stringify(state.orders)); };
const productById = id => products.find(p => p.id === id);

function renderProducts(filter='all') {
  $('#productGrid').innerHTML = products.map((p,i) => `
    <article class="product-card ${filter !== 'all' && p.category !== filter ? 'hidden' : ''}" data-category="${p.category}">
      <div class="product-art"><span class="card-tag">File ${String(i+1).padStart(2,'0')} · ${p.category}</span><span class="emoji" aria-hidden="true">${p.icon}</span></div>
      <div class="card-body"><h3>${p.name}</h3><p>${p.blurb}</p><div class="card-bottom"><span class="price">${p.price}</span><button class="add-button ${state.picks.includes(p.id)?'added':''}" data-product="${p.id}" type="button" aria-label="${state.picks.includes(p.id)?`Remove ${p.name} from my picks`:`Add ${p.name} to my picks`}"><span class="add-label">${state.picks.includes(p.id)?'In my picks':'Add to picks'}</span><span class="add-icon" aria-hidden="true"><b class="icon-plus">＋</b><b class="icon-check">✓</b></span></button></div></div>
    </article>`).join('');
}

function togglePick(id) {
  const index = state.picks.indexOf(id);
  if (index >= 0) { state.picks.splice(index,1); toast('Removed from your picks'); }
  else { state.picks.push(id); toast(`${productById(id).name} added!`); }
  save(); renderProducts($('.filter.active')?.dataset.filter || 'all'); renderDrawer();
}

function renderDrawer() {
  $('#caseCount').textContent = state.picks.length;
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
function showStaff() { closeDrawer(); $('#storeView').hidden=true; $('footer').hidden=true; $('#staffView').hidden=false; $('.site-header').hidden=true; window.scrollTo(0,0); renderOrders(); updateClock(); }
function showStore() { $('#storeView').hidden=false; $('footer').hidden=false; $('#staffView').hidden=true; $('.site-header').hidden=false; window.scrollTo(0,0); }
function updateClock() { const el=$('#staffClock'); if(el) el.textContent=new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}); }

document.addEventListener('click', e => {
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
$('#clearDoneBtn').addEventListener('click',()=>{ const count=state.orders.filter(o=>o.status==='picked-up').length; if(count && confirm(`Clear ${count} picked-up order${count===1?'':'s'}?`)){ state.orders=state.orders.filter(o=>o.status!=='picked-up');save();renderOrders(); } });
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeDrawer(); });
setInterval(updateClock,30000);
renderProducts(); renderDrawer(); renderStaffProducts(); renderOrders(); updateClock();
