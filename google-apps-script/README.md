# Google Apps Script email relay

This small private relay lets the Render server send ready notifications through Gmail over HTTPS. It does not expose Gmail credentials to the website.

## Set it up

1. Sign into the Gmail account that should send notifications and open <https://script.google.com>.
2. Create a **New project**, name it `A Sketchy Business Email`, and replace the editor contents with `Code.gs` from this folder.
3. Open **Project Settings** > **Script properties** and add:
   - Property: `WEBHOOK_SECRET`
   - Value: a unique random string at least 32 characters long
4. In the function menu above the editor, select `authorizeEmail`, click **Run**, and approve the MailApp permission. For this private script owned by your account, use **Advanced** > **Go to A Sketchy Business Email (unsafe)** on Google's unverified-app screen, then click **Allow**.
5. Click **Deploy** > **New deployment** > **Web app**.
6. Set **Execute as** to `Me` and **Who has access** to `Anyone`.
7. Click **Deploy** and copy the URL ending in `/exec`.
8. Open that `/exec` URL in a private/incognito browser window. The correct public deployment returns JSON containing `"version":"2026-08-12.1"`. If it shows a login, error page, or a different version, fix the Apps Script deployment before continuing.
9. In the Render web service, add:
   - `GOOGLE_EMAIL_WEB_APP_URL`: the `/exec` deployment URL
   - `GOOGLE_EMAIL_WEB_APP_SECRET`: exactly the same value as `WEBHOOK_SECRET`
10. Save and deploy the Render service. `/api/health` should then report `emailProvider: "google-apps-script"` and `emailReady: true`.

Never commit or share the webhook secret. If `Code.gs` changes later, create a new Apps Script deployment version for the change to become live.
