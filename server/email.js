import { emailFrom, publicUrl, resendApiKey } from './config.js';
import { escapeHtml } from './utils.js';

export async function sendReadyEmail(order, requestOrigin) {
  if (!order.items?.includes('caricature') || order.status !== 'ready') {
    return { sent:false, reason:'A ready email is only sent for caricatures.' };
  }
  if (!order.customer_email || !resendApiKey || !emailFrom) {
    return { sent:false, reason:'Email is not configured.' };
  }

  const trackingUrl = `${publicUrl || requestOrigin}/?track=${encodeURIComponent(order.tracking_code)}`;
  const response = await fetch('https://api.resend.com/emails', {
    method:'POST',
    headers:{
      Authorization:`Bearer ${resendApiKey}`,
      'Content-Type':'application/json',
      'User-Agent':'a-sketchy-business/1.0',
      'Idempotency-Key':`${order.id}-${order.status}-${new Date(order.updated_at).getTime()}`
    },
    body:JSON.stringify({
      from:emailFrom,
      to:[order.customer_email],
      subject:`Order #${order.number}: Your order is ready!`,
      html:`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#181816"><h1 style="font-size:30px">Your order is ready!</h1><p>Hi ${escapeHtml(order.customer_name)},</p><p>Your A Sketchy Business order <strong>#${order.number}</strong> is now <strong>ready</strong>.</p><p><a href="${trackingUrl}" style="display:inline-block;background:#ee672d;color:white;padding:13px 18px;text-decoration:none;font-weight:bold">Check your order</a></p><p style="color:#666">Private tracking code: ${order.tracking_code}</p></div>`
    })
  });

  if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
  return { sent:true };
}
