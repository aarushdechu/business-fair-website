var RELAY_VERSION='2026-08-12.1';

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

// Opening the deployed /exec URL in a browser runs this self-test.
function doGet() {
  return jsonResponse({
    ok:true,
    service:'A Sketchy Business email relay',
    version:RELAY_VERSION,
    authorized:ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL).getAuthorizationStatus() === ScriptApp.AuthorizationStatus.NOT_REQUIRED
  });
}

// Run this once from the Apps Script editor before deploying the web app.
function authorizeEmail() {
  var quota=MailApp.getRemainingDailyQuota();
  console.log('Email permission granted. Remaining daily quota: ' + quota);
  return quota;
}

function doPost(event) {
  try {
    var payload=JSON.parse((event.postData && event.postData.contents) || '{}');
    var expectedSecret=PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET');

    if(!expectedSecret || payload.secret !== expectedSecret){
      return jsonResponse({ ok:false,code:'unauthorized',error:'Unauthorized' });
    }

    var quota=MailApp.getRemainingDailyQuota();
    if(payload.action === 'health'){
      return jsonResponse({ ok:true,quota:quota,version:RELAY_VERSION });
    }
    if(payload.action !== 'send'){
      return jsonResponse({ ok:false,code:'unknown-action',error:'Unknown action' });
    }
    if(!/^\S+@\S+\.\S+$/.test(String(payload.to || ''))){
      return jsonResponse({ ok:false,code:'invalid-recipient',error:'Invalid recipient' });
    }
    if(quota < 1){
      return jsonResponse({ ok:false,code:'quota-exhausted',error:'Daily email quota exhausted' });
    }

    MailApp.sendEmail({
      to:String(payload.to),
      subject:String(payload.subject || 'Your order is ready').slice(0,250),
      body:String(payload.text || 'Your A Sketchy Business order is ready.'),
      htmlBody:String(payload.html || ''),
      name:'A Sketchy Business'
    });
    return jsonResponse({ ok:true,quota:quota - 1,version:RELAY_VERSION });
  } catch(error) {
    console.error(error);
    return jsonResponse({ ok:false,code:'send-failed',error:'Email send failed' });
  }
}
