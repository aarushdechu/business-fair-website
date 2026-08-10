import crypto from 'node:crypto';
import { orderStatuses, productIds } from './config.js';
import { requireStaff, requireUser } from './auth.js';
import { pool, requireDatabase } from './database.js';
import { sendReadyEmail } from './email.js';
import { clean } from './utils.js';

function rowToOrder(row) {
  return {
    id:row.id,
    number:String(row.number),
    customer:row.customer_name,
    email:row.customer_email || '',
    items:row.items,
    notes:row.notes || '',
    status:row.status,
    trackCode:row.tracking_code,
    createdAt:row.created_at,
    updatedAt:row.updated_at
  };
}

function readOrderInput(body = {}) {
  return {
    customer:clean(body.customer, 80),
    email:clean(body.email, 180).toLowerCase(),
    items:[...new Set(Array.isArray(body.items) ? body.items.filter(id => productIds.has(id)) : [])],
    notes:clean(body.notes, 1000)
  };
}

function validateOrder({ customer, email, items }) {
  if (!customer || !items.length) return 'Enter your name and choose at least one item.';
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return 'Enter a valid email address.';
  if (items.includes('caricature') && !email) {
    return 'Add an email so we can tell you when your caricature is ready.';
  }
  return '';
}

async function insertOrder({ customer, email, items, notes }) {
  const id = crypto.randomUUID();
  const trackingCode = crypto.randomBytes(9).toString('base64url');
  const result = await pool.query(
    'INSERT INTO orders (id,customer_name,customer_email,items,notes,status,tracking_code) VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7) RETURNING *',
    [id, customer, email || null, JSON.stringify(items), notes, 'received', trackingCode]
  );
  return result.rows[0];
}

export function registerOrderRoutes(app, limits) {
  app.get('/api/health', async (_req, res) => {
    if (!pool) return res.status(503).json({ ok:false, database:false });
    try {
      await pool.query('SELECT 1');
      res.json({
        ok:true,
        database:true,
        email:Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)
      });
    } catch {
      res.status(503).json({ ok:false, database:false });
    }
  });

  app.get('/api/my-orders', limits.tracking, requireUser, async (req, res, next) => {
    if (!requireDatabase(res)) return;
    try {
      const result = await pool.query(
        'SELECT number,items,status,tracking_code,created_at,updated_at FROM orders WHERE LOWER(customer_email)=$1 ORDER BY created_at DESC LIMIT 30',
        [req.user.email]
      );
      res.json(result.rows.map(row => ({
        number:String(row.number),
        items:row.items,
        status:row.status,
        trackCode:row.tracking_code,
        createdAt:row.created_at,
        updatedAt:row.updated_at
      })));
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/public-orders', limits.publicOrders, async (req, res, next) => {
    if (!requireDatabase(res)) return;
    const input = readOrderInput(req.body);
    const error = validateOrder(input);
    if (error) return res.status(400).json({ error });

    try {
      res.status(201).json(rowToOrder(await insertOrder(input)));
    } catch (requestError) {
      next(requestError);
    }
  });

  app.get('/api/orders', limits.staff, requireStaff, async (_req, res, next) => {
    if (!requireDatabase(res)) return;
    try {
      const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
      res.json(result.rows.map(rowToOrder));
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/orders', limits.staff, requireStaff, async (req, res, next) => {
    if (!requireDatabase(res)) return;
    const input = readOrderInput(req.body);
    const error = validateOrder(input);
    if (error) return res.status(400).json({ error });

    try {
      const order = await insertOrder(input);
      res.status(201).json({ ...rowToOrder(order), emailSent:false });
    } catch (requestError) {
      next(requestError);
    }
  });

  app.patch('/api/orders/:id', limits.staff, requireStaff, async (req, res, next) => {
    if (!requireDatabase(res)) return;
    const status = clean(req.body.status, 20);
    if (!orderStatuses.has(status)) return res.status(400).json({ error:'Unknown order status.' });

    try {
      const result = await pool.query(
        'UPDATE orders SET status=$1,updated_at=NOW() WHERE id=$2 RETURNING *',
        [status, req.params.id]
      );
      if (!result.rowCount) return res.status(404).json({ error:'Order not found.' });

      const order = result.rows[0];
      let emailSent = false;
      try {
        emailSent = (await sendReadyEmail(order, `${req.protocol}://${req.get('host')}`)).sent;
      } catch (emailError) {
        console.error('Email failed:', emailError.message);
      }
      res.json({ ...rowToOrder(order), emailSent });
    } catch (error) {
      next(error);
    }
  });

  app.delete('/api/orders/picked-up', limits.staff, requireStaff, async (_req, res, next) => {
    if (!requireDatabase(res)) return;
    try {
      const result = await pool.query("DELETE FROM orders WHERE status='picked-up'");
      res.json({ deleted:result.rowCount });
    } catch (error) {
      next(error);
    }
  });

  app.delete('/api/orders/:id', limits.staff, requireStaff, async (req, res, next) => {
    if (!requireDatabase(res)) return;
    try {
      const result = await pool.query('DELETE FROM orders WHERE id=$1', [req.params.id]);
      if (!result.rowCount) return res.status(404).json({ error:'Order not found.' });
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/track/:code', limits.tracking, async (req, res, next) => {
    if (!requireDatabase(res)) return;
    const code = clean(req.params.code, 30);
    try {
      const result = await pool.query(
        'SELECT number,customer_name,items,status,created_at,updated_at FROM orders WHERE tracking_code=$1',
        [code]
      );
      if (!result.rowCount) {
        return res.status(404).json({ error:'We could not find that tracking code.' });
      }

      const row = result.rows[0];
      res.json({
        number:String(row.number),
        customer:row.customer_name,
        items:row.items,
        status:row.status,
        createdAt:row.created_at,
        updatedAt:row.updated_at
      });
    } catch (error) {
      next(error);
    }
  });
}
