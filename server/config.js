import 'dotenv/config';

const cleanEnv = value => String(value || '').trim();

export const port = Number(process.env.PORT || 3000);
export const isProduction = process.env.NODE_ENV === 'production';
export const databaseUrl = cleanEnv(process.env.DATABASE_URL);
export const googleClientId = cleanEnv(process.env.GOOGLE_CLIENT_ID);
export const sessionSecret = cleanEnv(process.env.SESSION_SECRET);
export const staffPin = cleanEnv(process.env.STAFF_PIN);
export const publicUrl = cleanEnv(process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_URL).replace(/\/$/, '');
export const resendApiKey = cleanEnv(process.env.RESEND_API_KEY);
export const emailFrom = cleanEnv(process.env.EMAIL_FROM);

export const adminEmails = new Set([
  'dechu.avengers@gmail.com',
  'anika.dechu@gmail.com',
  ...cleanEnv(process.env.ADMIN_EMAILS)
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean)
]);

export const orderStatuses = new Set(['received', 'drawing', 'ready', 'picked-up']);
export const productIds = new Set([
  'eagle',
  'dragon',
  'mouse',
  'kangaroo',
  'turtle',
  'origami-bookmark',
  'crochet-bookmark',
  'caricature'
]);
