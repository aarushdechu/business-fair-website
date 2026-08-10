# A Sketchy Business

A storefront, shared stall order board, private customer tracking page, and optional email notifications for a children's business fair.

## Project structure

```text
business-fair-website/
├── public/              Website files sent to visitors
│   ├── assets/          Logo and product pictures
│   ├── index.html       Page structure
│   ├── styles.css       Website design
│   └── app.js           Browser interactions
├── server/              Private backend code
│   ├── app.js           Express setup and static files
│   ├── auth.js          Google sign-in and admin access
│   ├── config.js        Environment settings
│   ├── database.js      PostgreSQL connection and setup
│   ├── email.js         Caricature-ready emails
│   ├── orders.js        Order and tracking API routes
│   └── utils.js         Shared helper functions
├── server.js            Starts the backend
├── .env.example         Safe template for local settings
├── package.json         Node dependencies and commands
└── render.yaml          Render deployment settings
```

## Run locally

Install Node.js 20+, create a PostgreSQL database, copy `.env.example` to `.env`, and set the values. Then run:

```bash
npm install
npm start
```

Visit `http://localhost:3000`.

Run `npm run check` after changing JavaScript to check all server and browser files for syntax errors.

## Deploy on Render

The included `render.yaml` creates a Node web service and PostgreSQL database. Create a new Render Blueprint from this repository, then provide:

- `STAFF_PIN`: the private PIN used to open the staff board.
- `GMAIL_USER`: Gmail address used for ready notifications.
- `GMAIL_APP_PASSWORD`: Google's 16-character App Password for that Gmail account.
- `RESEND_API_KEY` and `EMAIL_FROM`: optional alternative if you later use Resend with a verified domain.
- `GOOGLE_CLIENT_ID`: optional; enables Google sign-in for customers.
- `SESSION_SECRET`: a long random secret used to sign login cookies. The Render Blueprint generates this automatically.

The existing static Render service cannot become a web service in place. Create the Blueprint service, verify it works, then point your custom domain to the new service if you use one.

The server creates its `orders` table automatically. Customers track progress with their short order number. Older private tracking-code links continue to work for existing orders. The public tracking endpoint returns only the order name, items, status, and timestamps; email addresses and staff notes remain private.

## Google sign-in

Create a **Web application** OAuth client in Google Cloud Console. Add `https://a-sketchy-business-app.onrender.com` as an authorized JavaScript origin, then copy its client ID into Render as `GOOGLE_CLIENT_ID`. No client secret is placed in the browser.

Sign-in is optional. The server verifies Google's ID token, stores a signed HTTP-only session cookie, and only uses the verified email to find orders entered with the same email. Order-number tracking works for everyone.

## Installable website

The web app includes a manifest and service worker, so it can be installed from a phone browser with **Add to Home Screen**.

## Email setup

For the simplest setup without a custom domain:

1. Turn on 2-Step Verification for the Gmail sender account.
2. Create a Google App Password named `A Sketchy Business`.
3. Add `GMAIL_USER` and `GMAIL_APP_PASSWORD` to the Render web service's environment variables, then redeploy.
4. Check `/api/health`; it should report `"email":true` and `"emailProvider":"gmail"`.

The App Password is a secret: place it only in Render, never in this repository. Gmail is suitable for this small fair workflow but not bulk email. If both Gmail and Resend are configured, Gmail is used. Ready notifications are sent only for orders containing a personalized caricature when an admin changes the order status to `ready`.
