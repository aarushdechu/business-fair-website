import crypto from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import {
  adminEmails,
  googleClientId,
  isProduction,
  publicUrl,
  sessionSecret,
  staffPin
} from './config.js';
import { clean } from './utils.js';

const googleAuth = new OAuth2Client();

function isAdmin(user) {
  return Boolean(user?.email && adminEmails.has(String(user.email).toLowerCase()));
}

function publicUser(user) {
  return {
    email:user.email,
    name:user.name,
    picture:user.picture || '',
    isAdmin:isAdmin(user)
  };
}

function sessionSignature(payload) {
  return crypto.createHmac('sha256', sessionSecret).update(payload).digest('base64url');
}

function createSession(user) {
  const payload = Buffer.from(JSON.stringify({
    email:user.email,
    name:user.name,
    picture:user.picture || '',
    exp:Date.now() + 7 * 24 * 60 * 60 * 1000
  })).toString('base64url');

  return `${payload}.${sessionSignature(payload)}`;
}

export function readSession(req) {
  if (!sessionSecret) return null;

  const cookie = String(req.headers.cookie || '')
    .split(';')
    .map(part => part.trim())
    .find(part => part.startsWith('sketchy_session='));
  const raw = cookie?.slice(16);
  if (!raw) return null;

  const [payload, signature] = raw.split('.');
  if (!payload || !signature) return null;

  const expected = sessionSignature(payload);
  const suppliedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (suppliedBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(suppliedBuffer, expectedBuffer)) return null;

  try {
    const user = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return user.exp > Date.now() ? user : null;
  } catch {
    return null;
  }
}

function sessionCookie(value, maxAge = 604800) {
  const secure = isProduction ? '; Secure' : '';
  return `sketchy_session=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function hasStaffPin(req) {
  const supplied = Buffer.from(String(req.get('x-staff-pin') || ''));
  const expected = Buffer.from(staffPin);
  return expected.length >= 4
    && supplied.length === expected.length
    && crypto.timingSafeEqual(supplied, expected);
}

export function requireUser(req, res, next) {
  const user = readSession(req);
  if (!user) return res.status(401).json({ error:'Sign in to see your orders.' });
  req.user = user;
  next();
}

export function requireStaff(req, res, next) {
  if (!isAdmin(readSession(req)) && !hasStaffPin(req)) {
    return res.status(401).json({ error:'Sign in with an admin account or enter the staff PIN.' });
  }
  next();
}

async function verifyGoogleCredential(credential) {
  if (!googleClientId || sessionSecret.length < 24) {
    throw new Error('Google sign-in is not configured.');
  }

  const ticket = await googleAuth.verifyIdToken({ idToken:credential, audience:googleClientId });
  const profile = ticket.getPayload();
  if (!profile?.email || !profile.email_verified) {
    throw new Error('Google sign-in verification failed.');
  }

  return {
    email:clean(profile.email, 180).toLowerCase(),
    name:clean(profile.name || profile.given_name, 80),
    picture:clean(profile.picture, 500)
  };
}

export function registerAuthRoutes(app, limitAuth) {
  app.get('/api/config', (_req, res) => {
    res.json({ googleClientId:googleClientId && sessionSecret.length >= 24 ? googleClientId : '' });
  });

  app.get('/api/auth/me', (req, res) => {
    const user = readSession(req);
    if (!user) return res.status(401).json({ error:'Not signed in.' });
    res.json({ user:publicUser(user) });
  });

  app.post('/api/auth/google', limitAuth, async (req, res) => {
    const origin = req.get('origin');
    const expectedOrigin = `${req.protocol}://${req.get('host')}`;
    if (origin && origin !== expectedOrigin && origin !== publicUrl) {
      return res.status(403).json({ error:'This sign-in request came from an unexpected site.' });
    }

    try {
      const user = await verifyGoogleCredential(clean(req.body.credential, 5000));
      res.setHeader('Set-Cookie', sessionCookie(createSession(user)));
      res.json({ user:publicUser(user) });
    } catch (error) {
      res.status(401).json({ error:error.message });
    }
  });

  app.post('/api/auth/logout', (_req, res) => {
    res.setHeader('Set-Cookie', sessionCookie('', 0));
    res.status(204).end();
  });
}
