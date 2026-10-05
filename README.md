# LuckyPlay Kenya — Final Sandbox Package

This package contains the LuckyPlay Kenya demo website and a server-side Safaricom Daraja B2C sandbox integration scaffold.

## Included
- `index.html` — LuckyPlay Kenya responsive demo website
- `server.js` — server-side Daraja OAuth + B2C request + callback endpoints
- `package.json` — Node/Express dependencies
- `.env.example` — private configuration template
- `README.md` — setup notes

## Already completed
- LuckyPlay Kenya responsive website and branding
- Demo registration/login and local demo wallet
- Games, daily rewards, points and transaction history
- Demo redemption flow
- Kenyan phone validation and points-to-KSh conversion
- Server-side Daraja OAuth authentication
- B2C sandbox request endpoint
- ResultURL and QueueTimeOutURL callback endpoints
- Secret values kept out of browser code
- Health/configuration status endpoints that do not reveal secrets

## What David must add later
These values belong to David's own Daraja/hosting accounts and should never be sent in chat:
1. Daraja Consumer Key
2. Daraja Consumer Secret
3. Daraja Initiator Name
4. Daraja Security Credential
5. Daraja B2C sandbox shortcode/test shortcode
6. A public HTTPS address for the deployed server

The first five go into the server's private `.env` file. The callback URLs then use the public HTTPS address.

## Local test
Requires Node.js 18+.

```bash
npm install
copy .env.example .env
npm start
```

Then open `http://localhost:3000`.

On Linux/macOS, use `cp .env.example .env` instead of `copy`.

## Security
Never put Consumer Secret, Security Credential, passwords, PINs or OTPs into `index.html`, screenshots, GitHub, public files, or chat.

## Important sandbox note
The website can be opened as a static file for the demo UI, but the **Daraja withdrawal button requires the Node server** because secrets must stay on the server.

## Production readiness
This is a sandbox scaffold, not a production gambling/payment system. Before real-money operation, the system needs a proper authenticated user system, database/ledger, idempotency, audit logging, fraud/risk controls, secure secret storage, HTTPS, monitoring, and all required regulatory/business approvals.
