# Functions

Firebase Cloud Functions v2 scheduled jobs for weather ingestion and derived evaluation writes.

## Scope

- `ingestObservations`: pulls observation sources and writes `weather-observations`
- `ingestForecasts`: pulls forecast sources and writes `weather-forecasts`
- `ingestOpenMeteoCoreForecastAndEvaluation`: also writes `temperature-evaluation-log`

The current product configuration targets two locations defined in
[`src/config.js`](./src/config.js): `London` and `NY`.

## Commands

Run backend tests from the repo root:

```bash
npm --prefix functions test
```

Run live provider smoke checks from the repo root:

```bash
npm --prefix functions run smoke:providers
```

The repository also includes a weekly GitHub Actions workflow in
[`../.github/workflows/provider-smoke.yml`](../.github/workflows/provider-smoke.yml).
To make that workflow cover all active providers, add these repository secrets in GitHub:

- `METOFFICE_API_KEY`
- `TOMORROW_API_KEY`
- `WEATHERAPI_KEY`
- `OPENWEATHER_API_KEY`
- `PIRATEWEATHER_API_KEY`
- `VISUALCROSSING_API_KEY`
- `CHECKWX_API_KEY`
- `AVWX_API_KEY`

Run the Firebase Functions emulator from the repo root:

```bash
firebase emulators:start --only functions
```

Deploy only backend functions from the repo root:

```bash
firebase deploy --only functions
```

## Required Secrets

Observation providers:

- `CHECKWX_API_KEY`
- `AVWX_API_KEY`

Forecast providers:

- `METOFFICE_API_KEY`
- `TOMORROW_API_KEY`
- `WEATHERAPI_KEY`
- `OPENWEATHER_API_KEY`
- `PIRATEWEATHER_API_KEY`
- `VISUALCROSSING_API_KEY`

The smoke script skips secret-backed providers if their env vars are missing or set to `REPLACE_ME`.
If you want to populate the current shell from Firebase secrets first:

```bash
export METOFFICE_API_KEY="$(firebase functions:secrets:access METOFFICE_API_KEY --project forecast-atlas)"
export TOMORROW_API_KEY="$(firebase functions:secrets:access TOMORROW_API_KEY --project forecast-atlas)"
export WEATHERAPI_KEY="$(firebase functions:secrets:access WEATHERAPI_KEY --project forecast-atlas)"
export OPENWEATHER_API_KEY="$(firebase functions:secrets:access OPENWEATHER_API_KEY --project forecast-atlas)"
export PIRATEWEATHER_API_KEY="$(firebase functions:secrets:access PIRATEWEATHER_API_KEY --project forecast-atlas)"
export VISUALCROSSING_API_KEY="$(firebase functions:secrets:access VISUALCROSSING_API_KEY --project forecast-atlas)"
export CHECKWX_API_KEY="$(firebase functions:secrets:access CHECKWX_API_KEY --project forecast-atlas)"
export AVWX_API_KEY="$(firebase functions:secrets:access AVWX_API_KEY --project forecast-atlas)"
```

## Collections Written

- `weather-observations`
- `weather-forecasts`
- `temperature-evaluation-log`
- `_ingestion_cache`

## Operational Notes

- Schedules are defined in [`index.js`](./index.js)
- External provider failures are logged and now fail the scheduler run after aggregation
- Some providers are intentionally throttled by TTL or hour-based guards to stay within free-tier limits
