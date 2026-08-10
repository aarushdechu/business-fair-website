export const clean = (value, max = 500) => String(value || '').trim().slice(0, max);

export function escapeHtml(value) {
  const characters = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };
  return String(value).replace(/[&<>"']/g, character => characters[character]);
}

export function createRateLimit(bucket, limit, windowMs) {
  const requests = new Map();

  return (req, res, next) => {
    const key = `${req.ip}:${bucket}`;
    const now = Date.now();
    let entry = requests.get(key);

    if (!entry || now - entry.started > windowMs) entry = { started:now, count:0 };
    entry.count += 1;
    requests.set(key, entry);

    if (entry.count > limit) {
      return res.status(429).json({ error:'Too many attempts. Please wait a minute and try again.' });
    }

    next();
  };
}
