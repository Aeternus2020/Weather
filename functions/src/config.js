const LOCATIONS = [
  { id: "London", lat: 51.5074, lon: -0.1278, metar: "EGLL" },
  { id: "NY", lat: 40.7128, lon: -74.006, metar: "KJFK" },
]

const BUCKETS_F = [-999, 30, 40, 50, 60, 70, 999]

const INGESTION_CACHE_COLLECTION = "_ingestion_cache"

const CACHE_TTL_MINUTES = {
  observationsFast: 28,
  observationsSlow: 58,
  forecastHourly: 115,
  forecast3h: 175,
  forecast6h: 355,
}

const HTTP_USER_AGENT = "forecast-atlas-ingestion/1.0"
const WEATHER_GOV_USER_AGENT = HTTP_USER_AGENT

const INGESTION_CONCURRENCY = 2

module.exports = {
  LOCATIONS,
  BUCKETS_F,
  INGESTION_CACHE_COLLECTION,
  CACHE_TTL_MINUTES,
  HTTP_USER_AGENT,
  WEATHER_GOV_USER_AGENT,
  INGESTION_CONCURRENCY,
}
