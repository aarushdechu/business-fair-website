import {
  emailProvider,
  googleEmailWebAppSecret,
  googleEmailWebAppUrl,
  publicUrl
} from './config.js';
import { escapeHtml } from './utils.js';

let emailVerification;
let emailVerificationExpires=0;

function relayError(message, code = 'relay-failed') {
  const error=new Error(message);
  error.provider='google-apps-script';
  error.emailCode=code;
  return error;
}

function invalidRelayResponse(response, body) {
  const normalized=String(body || '').toLowerCase();
  if(response.url.includes('accounts.google.com') || normalized.includes('sign in with google')){
    return relayError('The Google email relay requires a Google login.','access-denied');
  }
  if(normalized.includes('script function not found') && normalized.includes('dopost')){
    return relayError('The deployed script does not contain doPost.','missing-do-post');
  }
  if(normalized.includes('page not found') || normalized.includes('unable to open the file')){
    return relayError('The Google email relay URL is invalid.','invalid-url');
  }
  return relayError('Google returned an invalid email-relay response.','invalid-response');
}

async function callEmailRelay(payload) {
  let response;
  try {
    response=await fetch(googleEmailWebAppUrl,{
      method:'POST',
      headers:{ 'Content-Type':'text/plain;charset=utf-8' },
      body:JSON.stringify({ secret:googleEmailWebAppSecret,...payload }),
      redirect:'follow',
      signal:AbortSignal.timeout(15_000)
    });
  } catch {
    throw relayError('Could not connect to the Google email relay.','connection-failed');
  }

  const body=await response.text();
  let result;
  try { result=JSON.parse(body); }
  catch { throw invalidRelayResponse(response,body); }
  if(!response.ok || !result.ok)throw relayError(result.error || 'Google rejected the email request.',result.code);
  return result;
}

export function describeEmailError(error) {
  if(error?.emailCode==='unauthorized')return 'The Google email relay secrets do not match.';
  if(error?.emailCode==='quota-exhausted')return 'The Gmail daily sending limit has been reached.';
  if(error?.emailCode==='invalid-recipient')return 'Google rejected the customer email address.';
  if(error?.emailCode==='connection-failed')return 'The server could not reach the Google email relay.';
  if(error?.emailCode==='access-denied')return 'The Google email relay is not shared with Anyone.';
  if(error?.emailCode==='missing-do-post')return 'The deployed Apps Script version is missing the email code.';
  if(error?.emailCode==='invalid-url')return 'The Apps Script deployment URL is incorrect.';
  if(error?.emailCode==='invalid-response')return 'The Google email relay URL is not publicly accessible.';
  if(error?.emailCode==='send-failed')return 'The Google email relay needs permission to send email.';
  return 'Google could not send the message.';
}

export async function getEmailDiagnostics() {
  if(!emailProvider)return { configured:false,ready:false,provider:null,problem:'Email relay settings are missing.' };
  if(!emailVerification || Date.now() >= emailVerificationExpires){
    emailVerificationExpires=Date.now() + 60_000;
    emailVerification=callEmailRelay({ action:'health' })
      .then(result=>({ configured:true,ready:true,provider:emailProvider,problem:null,quota:result.quota }))
      .catch(error=>({ configured:true,ready:false,provider:emailProvider,problem:describeEmailError(error),code:error.emailCode || 'unknown' }));
  }
  return emailVerification;
}

function readyMessage(order, requestOrigin) {
  const trackingUrl=`${publicUrl || requestOrigin}/?track=${encodeURIComponent(order.number)}`;
  return {
    subject:`Order #${order.number}: Your order is ready!`,
    text:`Hi ${order.customer_name}, your A Sketchy Business order #${order.number} is ready. Track it here: ${trackingUrl}`,
    html:`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#181816"><h1 style="font-size:30px">Your order is ready!</h1><p>Hi ${escapeHtml(order.customer_name)},</p><p>Your A Sketchy Business order <strong>#${order.number}</strong> is now <strong>ready</strong>.</p><p><a href="${trackingUrl}" style="display:inline-block;background:#ee672d;color:white;padding:13px 18px;text-decoration:none;font-weight:bold">Check your order</a></p><p style="color:#666">Order number: #${order.number}</p></div>`
  };
}

export async function sendReadyEmail(order, requestOrigin) {
  if(!order.items?.includes('caricature') || order.status!=='ready'){
    return { sent:false,reason:'A ready email is only sent for caricatures.' };
  }
  if(!order.customer_email || !emailProvider){
    return { sent:false,reason:'Email is not configured.' };
  }

  const message=readyMessage(order,requestOrigin);
  await callEmailRelay({
    action:'send',
    to:order.customer_email,
    customer:order.customer_name,
    ...message
  });
  return { sent:true,provider:emailProvider };
}
