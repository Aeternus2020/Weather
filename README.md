# Forecast Atlas

Forecast Atlas is a production-style weather intelligence dashboard built on Firebase.
It combines scheduled ingestion, multi-source forecast visualization, and a probability
evaluation log for two locations (`London`, `NY`) in UTC.

## Core Capabilities
- Multi-source weather observations and forecast snapshots.
- Per-source run history and visibility controls for forecast lines.
- Temperature Evaluation Log generated from Open-Meteo GFS forecast snapshots.
- Scheduled backend ingestion with API failover/retry and cache throttling.

## Architecture
- Frontend: React 19 + Vite + TypeScript + MUI + Nivo.
- Data store: Cloud Firestore.
- Backend: Firebase Cloud Functions v2 (Node 20), schedule-triggered.
- Hosting: Firebase Hosting with static multi-page entry points and a dedicated `404.html`.

Data flow:
1. Scheduled Functions pull weather data from provider APIs.
2. Functions write normalized documents to Firestore collections.
3. Frontend reads by UTC date/location using Firestore queries.
4. React Query caches queries and supports manual invalidation via `Load Data`.

## Repository Layout
- `src/`: frontend app.
- `functions/`: Cloud Functions ingestion backend.
- `firebase.json`: deploy config (hosting/functions/firestore).
- `firestore.rules`: Firestore security rules.
- `firestore.indexes.json`: required Firestore indexes.

## Firestore Collections
- `weather-observations`: observation points (`time`, `location`, `source`, `temp`).
- `weather-forecasts`: forecast runs (`timestamp`, `location`, `source`, `forecast[]`).
- `temperature-evaluation-log`: derived Open-Meteo evaluation snapshots.
- `_ingestion_cache`: internal TTL cache to avoid over-fetching providers.

`temperature-evaluation-log` is computed in backend code
(`functions/src/pipelines/openMeteoDerived.js`) by
`ingestOpenMeteoCoreForecastAndEvaluation`. It uses:
- Open-Meteo GFS distribution (`forecast` evaluator),
- a synthetic sensitivity scenario (`temperature prediction model`, +1.2°F shift),
- max bucket marker (`maxTempReached`),
- winner bucket (`certain`),
- and stores `overall` as an average of forecast + synthetic distributions.

## Prerequisites
- Node.js 20+.
- Firebase CLI (`npm i -g firebase-tools`).
- Firebase project access for `forecast-atlas`.
- Billing permissions if deploying Functions/production workloads.

## Local Setup
Install dependencies:

```bash
npm ci
cd functions && npm ci && cd ..
```

Authenticate and select project:

```bash
firebase login
firebase use forecast-atlas
```

Optional frontend env (`.env`):

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=forecast-atlas.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=forecast-atlas
VITE_FIREBASE_STORAGE_BUCKET=forecast-atlas.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
VITE_FIRESTORE_DB=(default)
VITE_GOOGLE_SITE_VERIFICATION=...
```

If you do not provide a `.env`, the frontend falls back to the live `forecast-atlas`
Firebase web config included in [`src/firebase.ts`](./src/firebase.ts). That is
convenient for demo use, but it means local frontend reads the shared demo/live
project by default.

Run local frontend:

```bash
npm run dev
```

## Function Secrets
Set provider keys used by scheduled ingestion:

```bash
firebase functions:secrets:set CHECKWX_API_KEY
firebase functions:secrets:set AVWX_API_KEY
firebase functions:secrets:set METOFFICE_API_KEY
firebase functions:secrets:set TOMORROW_API_KEY
firebase functions:secrets:set WEATHERAPI_KEY
firebase functions:secrets:set OPENWEATHER_API_KEY
firebase functions:secrets:set PIRATEWEATHER_API_KEY
firebase functions:secrets:set VISUALCROSSING_API_KEY
```

## Scheduled Jobs (UTC)
Defined in `functions/index.js`:
- `ingestObservations`: every 30 minutes.
- `ingestForecasts`: every 120 minutes.

## Production Deployment
Deploy frontend + backend + Firestore config:

```bash
npm run build
firebase deploy --only hosting,functions,firestore:rules,firestore:indexes
```

Recommended post-deploy checks:
1. Hosting URL opens correctly and client-side routes work.
2. Functions are deployed and scheduler triggers are active.
3. Firestore index for `weather-forecasts` query is ready.
4. `temperature-evaluation-log` receives new snapshots.
5. Budget alerts are configured in Cloud Billing.

## Operations and Safety
- Keep all external API keys in Functions Secrets, never in git.
- Restrict deploy permissions via IAM roles.
- Review Functions logs after each deploy:

```bash
firebase functions:log
```

- Firestore rules in this repo are read-only for public demo use:
  - reads allowed,
  - writes denied from client.

## CI/CD (GitHub Actions)
This repo includes a scheduled provider smoke workflow at
[`./.github/workflows/provider-smoke.yml`](./.github/workflows/provider-smoke.yml).
There is currently no automated deploy workflow.

Typical production CI/CD flow:
1. Push to `main`.
2. GitHub Action installs dependencies and builds app.
3. Action runs `firebase deploy --only hosting` (or full deploy).
4. Optional preview deploys per pull request.

## Useful Commands
```bash
firebase projects:list
firebase use forecast-atlas
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules,firestore:indexes
firebase functions:log
```

## License
No open-source license is included in this repository.
Unless a `LICENSE` file is added, treat the code as all rights reserved.
