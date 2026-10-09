# BrandShield AI

BrandShield AI is a digital risk protection prototype focused on social-media and mobile-app impersonation: fake profiles, fraudulent brand pages, scam accounts, and suspicious apps.

## Run locally

Requires Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
```

Create a production build with `npm run build`; preview it with `npm run preview`.

## Prototype scope

- Editable brand profile: official logo URL, social accounts, apps, publishers, and identifiers
- Social and app-store sample detections with look-alike name matching
- Official handle, package ID, and publisher allowlisting to avoid flagging configured official assets
- Explainable risk scores, source/risk filters, and a responsive review dashboard
- Architecture diagram and a short demo script in [ARCHITECTURE.md](./ARCHITECTURE.md) and [DEMO.md](./DEMO.md)

All findings and source records are synthetic fixtures in `src/detection.ts`. The prototype does not connect to external platforms, threat feeds, or a backend. The browser stores the editable brand profile in local storage; it does not transmit profile data.

The risk score is a transparent demonstration heuristic, not a production classifier or proof of malicious activity. Review [ARCHITECTURE.md](./ARCHITECTURE.md) for the data flow, allowlisting behavior, and production limitations; use [DEMO.md](./DEMO.md) for a concise walkthrough.
