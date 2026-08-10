import nodemailer from 'nodemailer';
import {
  emailFrom,
  emailProvider,
  gmailAppPassword,
  gmailUser,
  publicUrl,
  resendApiKey
} from './config.js';
import { escapeHtml } from './utils.js';

let gmailTransporter;

function readyMessage(order, requestOrigin) {
  const trackingUrl = `${publicUrl || requestOrigin}/?track=${encodeURIComponent(order.number)}`;
  return {
    subject:`Order #${order.number}: Your order is ready!`,
    html:`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#181816"><h1 style="font-size:30px">Your order is ready!</h1><p>Hi ${escapeHtml(order.customer_name)},</p><p>Your A Sketchy Business order <strong>#${order.number}</strong> is now <strong>ready</strong>.</p><p><a href="${trackingUrl}" style="display:inline-block;background:#ee672d;color:white;padding:13px 18px;text-decoration:none;font-weight:bold">Check your order</a></p><p style="color:#666">Order number: #${order.number}</p></div>`
  };
}

async function sendWithGmail(order, message) {
  gmailTransporter ||= nodemailer.createTransport({
    service:'gmail',
    auth:{ user:gmailUser, pass:gmailAppPassword },
    connectionTimeout:10_000,
    greetingTimeout:10_000,
    socketTimeout:15_000
  });
  await gmailTransporter.sendMail({
    from:`A Sketchy Business <${gmailUser}>`,
    to:order.customer_email,
    ...message
  });
}

async function sendWithResend(order, message) {
  const response = await fetch('https://api.resend.com/emails', {
    method:'POST',
    headers:{
      Authorization:`Bearer ${resendApiKey}`,
      'Content-Type':'application/json',
      'User-Agent':'a-sketchy-business/1.0',
      'Idempotency-Key':`${order.id}-${order.status}-${new Date(order.updated_at).getTime()}`
    },
    body:JSON.stringify({ from:emailFrom, to:[order.customer_email], ...message })
  });
  if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
}

export async function sendReadyEmail(order, requestOrigin) {
  if (!order.items?.includes('caricature') || order.status !== 'ready') {
    return { sent:false, reason:'A ready email is only sent for caricatures.' };
  }
  if (!order.customer_email || !emailProvider) {
    return { sent:false, reason:'Email is not configured.' };
  }

  const message=readyMessage(order,requestOrigin);
  if(emailProvider==='gmail')await sendWithGmail(order,message);
  else await sendWithResend(order,message);
  return { sent:true, provider:emailProvider };
}
