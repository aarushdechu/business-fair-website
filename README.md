# A Sketchy Business

A storefront, shared stall order board, private customer tracking page, and optional email notifications for a children's business fair.

## Run locally

Install Node.js 20+, create a PostgreSQL database, copy `.env.example` to `.env`, and set the values. Then run:

```bash
npm install
npm start
```

Visit `http://localhost:3000`.

## Deploy on Render

The included `render.yaml` creates a Node web service and PostgreSQL database. Create a new Render Blueprint from this repository, then provide:

- `STAFF_PIN`: the private PIN used to open the staff board.
- `RESEND_API_KEY`: optional; enables status emails.
- `EMAIL_FROM`: optional; for example `A Sketchy Business <orders@your-verified-domain.com>`.

The existing static Render service cannot become a web service in place. Create the Blueprint service, verify it works, then point your custom domain to the new service if you use one.

The server creates its `orders` table automatically. Customers receive a random private tracking code. The public tracking endpoint returns only the order name, items, status, and timestamps; email addresses and staff notes remain private.

## Email setup

Create a Resend account, verify a sending domain, and add the API key and sender to Render's environment variables. Without those two values, order tracking still works and staff can copy the tracking code for the customer, but emails are skipped.
