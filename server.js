import 'dotenv/config';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import pg from 'pg';

const { Pool } = pg;
const app = express();
const port = Number(process.env.PORT || 3000);
const root = path.dirname(fileURLToPath(import.meta.url));
const statuses = new Set(['received', 'drawing', 'ready', 'picked-up']);
const productIds = new Set(['eagle','dragon','mouse','kangaroo','turtle','origami-bookmark','crochet-bookmark','caricature']);
const pool = process.env.DATABASE_URL ? new Pool({ connectionString:process.env.DATABASE_URL, ssl:process.env.NODE_ENV==='production'?{rejectUnauthorized:false}:false }) : null;
const requestWindows = new Map();
const googleClientId = cleanEnv(process.env.GOOGLE_CLIENT_ID);
const sessionSecret = cleanEnv(process.env.SESSION_SECRET);
const googleAuth = new OAuth2Client();

app.disable('x-powered-by');
app.set('trust proxy',1);
app.use(express.json({ limit:'32kb' }));
app.use((_req,res,next)=>{ res.set({ 'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'strict-origin-when-cross-origin','Cross-Origin-Opener-Policy':'same-origin-allow-popups' });next(); });

const clean = (value, max=500) => String(value || '').trim().slice(0,max);
function cleanEnv(value) { return String(value || '').trim(); }
const rowToOrder = row => ({
  id:row.id, number:String(row.number), customer:row.customer_name, email:row.customer_email || '',
  items:row.items, notes:row.notes || '', status:row.status, trackCode:row.tracking_code,
  createdAt:row.created_at, updatedAt:row.updated_at
});

function isStaff(req) {
  const supplied=Buffer.from(String(req.get('x-staff-pin') || ''));
  const expected=Buffer.from(String(process.env.STAFF_PIN || ''));
  return expected.length>=4 && supplied.length===expected.length && crypto.timingSafeEqual(supplied,expected);
}
function requireStaff(req,res,next) {
  if (!isStaff(req)) return res.status(401).json({ error:'Staff PIN is incorrect.' });
  next();
}
function requireDatabase(res) {
  if (pool) return true;
  res.status(503).json({ error:'Order tracking is not configured yet.' });
  return false;
}
function sessionSignature(payload) { return crypto.createHmac('sha256',sessionSecret).update(payload).digest('base64url'); }
function createSession(user) {
  const payload=Buffer.from(JSON.stringify({ email:user.email,name:user.name,picture:user.picture||'',exp:Date.now()+7*24*60*60*1000 })).toString('base64url');
  return `${payload}.${sessionSignature(payload)}`;
}
function readSession(req) {
  if(!sessionSecret)return null;
  const raw=String(req.headers.cookie||'').split(';').map(part=>part.trim()).find(part=>part.startsWith('sketchy_session='))?.slice(16);
  if(!raw)return null;
  const [payload,signature]=raw.split('.');if(!payload||!signature)return null;
  const expected=sessionSignature(payload),left=Buffer.from(signature),right=Buffer.from(expected);
  if(left.length!==right.length||!crypto.timingSafeEqual(left,right))return null;
  try { const user=JSON.parse(Buffer.from(payload,'base64url').toString());return user.exp>Date.now()?user:null; } catch { return null; }
}
function requireUser(req,res,next) { const user=readSession(req);if(!user)return res.status(401).json({error:'Sign in to see your orders.'});req.user=user;next(); }
function sessionCookie(value,maxAge=604800) { return `sketchy_session=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${process.env.NODE_ENV==='production'?'; Secure':''}`; }
function rateLimit(limit,windowMs) {
  return (req,res,next) => {
    const key=`${req.ip}:${req.path.startsWith('/api/track')?'track':'staff'}`,now=Date.now();
    let entry=requestWindows.get(key);
    if(!entry || now-entry.started>windowMs) entry={started:now,count:0};
    entry.count+=1;requestWindows.set(key,entry);
    if(entry.count>limit) return res.status(429).json({ error:'Too many attempts. Please wait a minute and try again.' });
    next();
  };
}
const limitStaff=rateLimit(40,60_000),limitTracking=rateLimit(25,60_000),limitAuth=rateLimit(12,60_000);

async function verifyGoogleCredential(credential) {
  if(!googleClientId||sessionSecret.length<24)throw new Error('Google sign-in is not configured.');
  const ticket=await googleAuth.verifyIdToken({idToken:credential,audience:googleClientId});
  const profile=ticket.getPayload();
  if(!profile?.email||!profile.email_verified)throw new Error('Google sign-in verification failed.');
  return { email:clean(profile.email,180).toLowerCase(),name:clean(profile.name||profile.given_name,80),picture:clean(profile.picture,500) };
}

async function sendOrderEmail(order, origin) {
  if (!order.customer_email || !process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return { sent:false, reason:'Email is not configured.' };
  const labels={received:'Order received',drawing:'Your caricature is being drawn',ready:'Your order is ready!', 'picked-up':'Order picked up'};
  const trackingUrl=`${process.env.PUBLIC_URL || origin}/?track=${encodeURIComponent(order.tracking_code)}`;
  const response=await fetch('https://api.resend.com/emails',{
    method:'POST',
    headers:{ Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','User-Agent':'a-sketchy-business/1.0','Idempotency-Key':`${order.id}-${order.status}-${new Date(order.updated_at).getTime()}` },
    body:JSON.stringify({
      from:process.env.EMAIL_FROM,
      to:[order.customer_email],
      subject:`Order #${order.number}: ${labels[order.status]}`,
      html:`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#181816"><h1 style="font-size:30px">${labels[order.status]}</h1><p>Hi ${escapeEmail(order.customer_name)},</p><p>Your A Sketchy Business order <strong>#${order.number}</strong> is now <strong>${labels[order.status].toLowerCase()}</strong>.</p><p><a href="${trackingUrl}" style="display:inline-block;background:#ee672d;color:white;padding:13px 18px;text-decoration:none;font-weight:bold">Check your order</a></p><p style="color:#666">Private tracking code: ${order.tracking_code}</p></div>`
    })
  });
  if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
  return { sent:true };
}
function escapeEmail(value) { return String(value).replace(/[&<>"']/g,char=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char])); }

app.get('/api/health', async (_req,res) => {
  if (!pool) return res.status(503).json({ ok:false, database:false });
  try { await pool.query('SELECT 1'); res.json({ ok:true, database:true, email:Boolean(process.env.RESEND_API_KEY&&process.env.EMAIL_FROM) }); }
  catch { res.status(503).json({ ok:false, database:false }); }
});

app.get('/api/config',(_req,res)=>res.json({ googleClientId:googleClientId&&sessionSecret.length>=24?googleClientId:'' }));
app.get('/api/auth/me',(req,res)=>{ const user=readSession(req);if(!user)return res.status(401).json({error:'Not signed in.'});res.json({user}); });
app.post('/api/auth/google',limitAuth,async(req,res)=>{
  const origin=req.get('origin'),expected=`${req.protocol}://${req.get('host')}`;
  if(origin&&origin!==expected)return res.status(403).json({error:'This sign-in request came from an unexpected site.'});
  try { const user=await verifyGoogleCredential(clean(req.body.credential,5000));res.setHeader('Set-Cookie',sessionCookie(createSession(user)));res.json({user}); }
  catch(error) { res.status(401).json({error:error.message}); }
});
app.post('/api/auth/logout',(_req,res)=>{ res.setHeader('Set-Cookie',sessionCookie('',0));res.status(204).end(); });
app.get('/api/my-orders',limitTracking,requireUser,async(req,res,next)=>{
  if(!requireDatabase(res))return;
  try {
    const result=await pool.query('SELECT number,items,status,tracking_code,created_at,updated_at FROM orders WHERE LOWER(customer_email)=$1 ORDER BY created_at DESC LIMIT 30',[req.user.email]);
    res.json(result.rows.map(row=>({number:String(row.number),items:row.items,status:row.status,trackCode:row.tracking_code,createdAt:row.created_at,updatedAt:row.updated_at})));
  } catch(error) { next(error); }
});

app.get('/api/orders', limitStaff, requireStaff, async (_req,res,next) => {
  if (!requireDatabase(res)) return;
  try { const result=await pool.query('SELECT * FROM orders ORDER BY created_at DESC'); res.json(result.rows.map(rowToOrder)); } catch(error) { next(error); }
});

app.post('/api/orders', limitStaff, requireStaff, async (req,res,next) => {
  if (!requireDatabase(res)) return;
  const customer=clean(req.body.customer,80), email=clean(req.body.email,180).toLowerCase(), notes=clean(req.body.notes,1000);
  const items=Array.isArray(req.body.items)?req.body.items.filter(id=>productIds.has(id)):[];
  if (!customer || !items.length) return res.status(400).json({ error:'A customer and at least one item are required.' });
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error:'Enter a valid email address.' });
  const id=crypto.randomUUID(), trackingCode=crypto.randomBytes(9).toString('base64url');
  const initialStatus=items.includes('caricature')?'drawing':'received';
  try {
    const result=await pool.query('INSERT INTO orders (id,customer_name,customer_email,items,notes,status,tracking_code) VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7) RETURNING *',[id,customer,email||null,JSON.stringify(items),notes,initialStatus,trackingCode]);
    const order=result.rows[0]; let emailSent=false;
    try { emailSent=(await sendOrderEmail(order,`${req.protocol}://${req.get('host')}`)).sent; } catch(error) { console.error('Email failed:',error.message); }
    res.status(201).json({ ...rowToOrder(order), emailSent });
  } catch(error) { next(error); }
});

app.patch('/api/orders/:id', limitStaff, requireStaff, async (req,res,next) => {
  if (!requireDatabase(res)) return;
  const status=clean(req.body.status,20);
  if (!statuses.has(status)) return res.status(400).json({ error:'Unknown order status.' });
  try {
    const result=await pool.query('UPDATE orders SET status=$1,updated_at=NOW() WHERE id=$2 RETURNING *',[status,req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error:'Order not found.' });
    const order=result.rows[0]; let emailSent=false;
    try { emailSent=(await sendOrderEmail(order,`${req.protocol}://${req.get('host')}`)).sent; } catch(error) { console.error('Email failed:',error.message); }
    res.json({ ...rowToOrder(order), emailSent });
  } catch(error) { next(error); }
});

app.delete('/api/orders/picked-up', limitStaff, requireStaff, async (_req,res,next) => {
  if (!requireDatabase(res)) return;
  try { const result=await pool.query("DELETE FROM orders WHERE status='picked-up'"); res.json({ deleted:result.rowCount }); } catch(error) { next(error); }
});
app.delete('/api/orders/:id', limitStaff, requireStaff, async (req,res,next) => {
  if (!requireDatabase(res)) return;
  try { const result=await pool.query('DELETE FROM orders WHERE id=$1',[req.params.id]); if(!result.rowCount)return res.status(404).json({error:'Order not found.'}); res.status(204).end(); } catch(error) { next(error); }
});

app.get('/api/track/:code', limitTracking, async (req,res,next) => {
  if (!requireDatabase(res)) return;
  const code=clean(req.params.code,30);
  try {
    const result=await pool.query('SELECT number,customer_name,items,status,created_at,updated_at FROM orders WHERE tracking_code=$1',[code]);
    if (!result.rowCount) return res.status(404).json({ error:'We could not find that tracking code.' });
    const row=result.rows[0];
    res.json({ number:String(row.number), customer:row.customer_name, items:row.items, status:row.status, createdAt:row.created_at, updatedAt:row.updated_at });
  } catch(error) { next(error); }
});

app.use('/assets',express.static(path.join(root,'assets'),{ maxAge:process.env.NODE_ENV==='production'?'7d':0 }));
app.get('/styles.css',(_req,res)=>res.sendFile(path.join(root,'styles.css')));
app.get('/app.js',(_req,res)=>res.sendFile(path.join(root,'app.js')));
app.get('/manifest.webmanifest',(_req,res)=>res.type('application/manifest+json').sendFile(path.join(root,'manifest.webmanifest')));
app.get('/service-worker.js',(_req,res)=>res.set('Cache-Control','no-cache').type('application/javascript').sendFile(path.join(root,'service-worker.js')));
app.get(['/', '/index.html'],(_req,res)=>res.sendFile(path.join(root,'index.html')));
app.use((error,_req,res,_next)=>{ console.error(error); res.status(500).json({ error:'Something went wrong. Please try again.' }); });

async function start() {
  if (pool) {
    await pool.query(`CREATE SEQUENCE IF NOT EXISTS order_number_seq START 101;
      CREATE TABLE IF NOT EXISTS orders (
        id text PRIMARY KEY,
        number integer UNIQUE NOT NULL DEFAULT nextval('order_number_seq'),
        customer_name varchar(80) NOT NULL,
        customer_email varchar(180),
        items jsonb NOT NULL,
        notes text NOT NULL DEFAULT '',
        status varchar(20) NOT NULL CHECK (status IN ('received','drawing','ready','picked-up')),
        tracking_code varchar(30) UNIQUE NOT NULL,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );`);
  } else console.warn('DATABASE_URL is missing. Static site works, but order APIs are disabled.');
  app.listen(port,()=>console.log(`A Sketchy Business running on port ${port}`));
}
start().catch(error=>{ console.error(error); process.exit(1); });
