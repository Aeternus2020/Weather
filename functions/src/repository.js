const { INGESTION_CACHE_COLLECTION } = require("./config")
const { Timestamp, setDoc, getDoc } = require("./infra/db")
const { toDateOnlyUtc, round } = require("./utils/common")

function buildCacheDocId(kind, source, location) {
  return `${kind}_${source}_${location}`.replace(/[^a-zA-Z0-9_.-]/g, "_")
}

async function shouldFetchByCache({ kind, source, location, runTime, ttlMinutes }) {
  const docId = buildCacheDocId(kind, source, location)
  const cached = await getDoc(INGESTION_CACHE_COLLECTION, docId)
  const last = cached?.lastSuccessAt?.toDate?.()
  if (!last || !Number.isFinite(last.getTime())) return true

  const ageMs = runTime.getTime() - last.getTime()
  const ttlMs = ttlMinutes * 60 * 1000
  return ageMs >= ttlMs
}

async function markCacheSuccess({ kind, source, location, runTime }) {
  const docId = buildCacheDocId(kind, source, location)
  await setDoc(INGESTION_CACHE_COLLECTION, docId, {
    kind,
    source,
    location,
    lastSuccessAt: Timestamp.fromDate(runTime),
    updatedAt: Timestamp.fromDate(new Date()),
  })
}

async function writeObservation({ source, location, timeIso, tempC }) {
  const dt = new Date(timeIso)
  const docId = `obs_${source}_${location}_${dt.toISOString()}`
  await setDoc("weather-observations", docId, {
    date: toDateOnlyUtc(dt),
    location,
    source,
    temp: round(tempC, 1),
    time: Timestamp.fromDate(dt),
    timestamp: dt.toISOString(),
  })
}

async function writeForecast({ source, location, runTime, forecast }) {
  const docId = `fx_${source}_${location}_${runTime.toISOString()}`
  await setDoc("weather-forecasts", docId, {
    source,
    location,
    timestamp: Timestamp.fromDate(runTime),
    forecast,
  })
}

async function writeTemperatureEvaluation({ location, runTime, basedOn, overall }) {
  const docId = `te_${location}_${runTime.toISOString()}`
  await setDoc("temperature-evaluation-log", docId, {
    timestamp: Timestamp.fromDate(runTime),
    basedOn,
    p: overall,
    dateInQuestion: toDateOnlyUtc(runTime),
    location,
  })
}

module.exports = {
  shouldFetchByCache,
  markCacheSuccess,
  writeObservation,
  writeForecast,
  writeTemperatureEvaluation,
}
