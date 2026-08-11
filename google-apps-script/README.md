# Google Apps Script email relay

This small private relay lets the Render server send ready notifications through Gmail over HTTPS. It does not expose Gmail credentials to the website.

## Set it up

1. Sign into the Gmail account that should send notifications and open <https://script.google.com>.
2. Create a **New project**, name it `A Sketchy Business Email`, and replace the editor contents with `Code.gs` from this folder.
3. Open **Project Settings** > **Script properties** and add:
   - Property: `WEBHOOK_SECRET`
   - Value: a unique random string at least 32 characters long
4. Click **Deploy** > **New deployment** > **Web app**.
5. Set **Execute as** to `Me` and **Who has access** to `Anyone`.
6. Click **Deploy**, approve the MailApp permission, and copy the URL ending in `/exec`.
7. In the Render web service, add:
   - `GOOGLE_EMAIL_WEB_APP_URL`: the `/exec` deployment URL
   - `GOOGLE_EMAIL_WEB_APP_SECRET`: exactly the same value as `WEBHOOK_SECRET`
8. Save and deploy the Render service. `/api/health` should then report `emailProvider: "google-apps-script"` and `emailReady: true`.

Never commit or share the webhook secret. If `Code.gs` changes later, create a new Apps Script deployment version for the change to become live.
