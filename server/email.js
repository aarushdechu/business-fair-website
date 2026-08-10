import nodemailer from 'nodemailer';
import {
  brevoApiKey,
  brevoSenderEmail,
  emailFrom,
  emailProvider,
  gmailAppPassword,
  gmailUser,
  publicUrl,
  resendApiKey
} from './config.js';
import { escapeHtml } from './utils.js';

let gmailTransporter;
let gmailVerification;
let brevoVerification;

function getGmailTransporter() {
  gmailTransporter ||= nodemailer.createTransport({
    host:'smtp.gmail.com',
    port:465,
    secure:true,
    family:4,
    auth:{ user:gmailUser, pass:gmailAppPassword },
    connectionTimeout:10_000,
    greetingTimeout:10_000,
    socketTimeout:15_000
  });
  return gmailTransporter;
}

export function describeEmailError(error) {
  if(error?.provider==='brevo' && error?.responseCode===401) return 'Brevo rejected the API key.';
  if(error?.provider==='brevo' && error?.responseCode===400) return 'Brevo rejected the sender or recipient.';
  if(error?.provider==='brevo') return 'Brevo could not send the message.';
  if(error?.code==='EAUTH' || error?.responseCode===535) return 'Gmail rejected the address or App Password.';
  if(['ECONNECTION','ETIMEDOUT','ESOCKET','EDNS'].includes(error?.code)) return 'The server could not connect to Gmail.';
  if(error?.responseCode===550) return 'Gmail rejected the recipient address.';
  return 'Gmail could not send the message.';
}

export async function getEmailDiagnostics() {
  if(!emailProvider)return { configured:false,ready:false,provider:null,problem:'Email credentials are missing.' };
  if(emailProvider==='brevo'){
    brevoVerification ||= fetch('https://api.brevo.com/v3/account',{
      headers:{ accept:'application/json','api-key':brevoApiKey },
      signal:AbortSignal.timeout(10_000)
    }).then(response=>response.ok
      ? { configured:true,ready:true,provider:'brevo',problem:null }
      : { configured:true,ready:false,provider:'brevo',problem:response.status===401?'Brevo rejected the API key.':'Brevo account verification failed.' })
      .catch(()=>({ configured:true,ready:false,provider:'brevo',problem:'The server could not connect to Brevo.' }));
    return brevoVerification;
  }
  if(emailProvider==='resend')return { configured:true,ready:true,provider:'resend',problem:null };
  gmailVerification ||= getGmailTransporter().verify()
    .then(()=>({ configured:true,ready:true,provider:'gmail',problem:null }))
    .catch(error=>({ configured:true,ready:false,provider:'gmail',problem:describeEmailError(error) }));
  return gmailVerification;
}

function readyMessage(order, requestOrigin) {
  const trackingUrl = `${publicUrl || requestOrigin}/?track=${encodeURIComponent(order.number)}`;
  return {
    subject:`Order #${order.number}: Your order is ready!`,
    html:`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#181816"><h1 style="font-size:30px">Your order is ready!</h1><p>Hi ${escapeHtml(order.customer_name)},</p><p>Your A Sketchy Business order <strong>#${order.number}</strong> is now <strong>ready</strong>.</p><p><a href="${trackingUrl}" style="display:inline-block;background:#ee672d;color:white;padding:13px 18px;text-decoration:none;font-weight:bold">Check your order</a></p><p style="color:#666">Order number: #${order.number}</p></div>`
  };
}

async function sendWithGmail(order, message) {
  await getGmailTransporter().sendMail({
    from:`A Sketchy Business <${gmailUser}>`,
    to:order.customer_email,
    ...message
  });
}

async function sendWithBrevo(order, message) {
  const response=await fetch('https://api.brevo.com/v3/smtp/email',{
    method:'POST',
    headers:{
      accept:'application/json',
      'api-key':brevoApiKey,
      'content-type':'application/json'
    },
    body:JSON.stringify({
      sender:{ name:'A Sketchy Business',email:brevoSenderEmail },
      to:[{ email:order.customer_email,name:order.customer_name }],
      subject:message.subject,
      htmlContent:message.html
    })
  });
  if(!response.ok){
    const error=new Error(`Brevo returned ${response.status}`);
    error.provider='brevo';
    error.responseCode=response.status;
    throw error;
  }
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
  if(emailProvider==='brevo')await sendWithBrevo(order,message);
  else if(emailProvider==='gmail')await sendWithGmail(order,message);
  else await sendWithResend(order,message);
  return { sent:true, provider:emailProvider };
}
