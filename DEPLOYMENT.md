# Forecast Atlas Deployment Guide

Repeatable production deployment flow for this project.

## 1) Prerequisites
- Node.js 20+ installed.
- Firebase CLI installed: `npm i -g firebase-tools`.
- Access to Firebase project `forecast-atlas`.
- Project billing on Blaze for Cloud Functions production usage.

## 2) Install dependencies
```bash
npm ci
cd functions && npm ci && cd ..
```

## 3) Login and select project
```bash
firebase login
firebase use forecast-atlas
```

## 4) Set backend secrets (first deploy or key rotation)
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

## 5) Build and deploy
```bash
npm run build
firebase deploy --only hosting,functions,firestore:rules,firestore:indexes
```

## 6) Smoke check
- Open hosting URL and verify charts load.
- Confirm latest scheduled runs exist (`ingestObservations`, `ingestForecasts`).
- Confirm `temperature-evaluation-log` updates for current UTC date.
- Review logs:

```bash
firebase functions:log
```

## 7) Optional production hardening
- Configure Cloud Billing budget alerts.
- Connect custom domain in Firebase Hosting and verify SSL issued.
- Add a dedicated GitHub Actions deploy workflow if you want automated deploys on merge.
- Keep the existing provider smoke workflow separate from deployment.
