function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
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
      return jsonResponse({ ok:true,quota:quota });
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
    return jsonResponse({ ok:true,quota:quota - 1 });
  } catch(error) {
    console.error(error);
    return jsonResponse({ ok:false,code:'send-failed',error:'Email send failed' });
  }
}
