const { fetchJson, fetchText } = require("../../infra/http")
const {
  parseAviationObservation,
  parseFlexibleDate,
  parseTgftpObservation,
} = require("../../parsers")
const { WEATHER_GOV_USER_AGENT } = require("../../config")

async function fetchCheckWxDecoded(stationCodes, apiKey) {
  const url = `https://api.checkwx.com/metar/${stationCodes}/decoded`
  const data = await fetchJson(url, {
    headers: { "X-API-Key": apiKey },
  })

  const entries = Array.isArray(data?.data) ? data.data : []
  return entries
    .map((entry) => {
      const station = String(entry?.icao || "").toUpperCase()
      const tempC = entry?.temperature?.celsius
      const observed = entry?.observed
      if (!station || tempC == null || !observed) return null

      return {
        station,
        timeIso: new Date(observed).toISOString(),
        tempC,
      }
    })
    .filter(Boolean)
}

async function fetchAviationWeatherObservations(stationCodes) {
  const url =
    "https://aviationweather.gov/api/data/metar" +
    `?ids=${encodeURIComponent(stationCodes)}&format=json`

  const payload = await fetchJson(url, { headers: { accept: "application/json" } })
  const entries = Array.isArray(payload) ? payload : []
  return entries.map(parseAviationObservation).filter(Boolean)
}

async function fetchAvwxObservation(location, apiKey) {
  const url = `https://avwx.rest/api/metar/${encodeURIComponent(location.metar)}`
  const data = await fetchJson(url, {
    headers: {
      accept: "application/json",
      authorization: apiKey,
    },
  })

  const tempC = Number.isFinite(data?.temperature?.value) ? data.temperature.value : null
  if (tempC == null) throw new Error(`AVWX did not return temperature for ${location.metar}`)

  const dt = parseFlexibleDate(data?.time?.dt)
  if (!dt) throw new Error(`AVWX did not return observation timestamp for ${location.metar}`)

  return {
    station: location.metar,
    timeIso: dt.toISOString(),
    tempC,
  }
}

async function fetchTgftpObservation(location) {
  const url =
    "https://tgftp.nws.noaa.gov/data/observations/metar/stations/" +
    `${encodeURIComponent(location.metar)}.TXT`

  const text = await fetchText(url, { headers: { accept: "text/plain" } })
  const parsed = parseTgftpObservation(text)
  if (!parsed) throw new Error(`TGFTP parse failed for ${location.metar}`)
  return parsed
}

async function fetchWeatherGovLatestObservation(location) {
  const url = `https://api.weather.gov/stations/${encodeURIComponent(location.metar)}/observations/latest`
  const data = await fetchJson(url, {
    headers: {
      accept: "application/geo+json",
      "user-agent": WEATHER_GOV_USER_AGENT,
    },
  })

  const tempC = Number.isFinite(data?.properties?.temperature?.value)
    ? data.properties.temperature.value
    : null
  const dt = parseFlexibleDate(data?.properties?.timestamp)

  if (tempC == null || !dt) {
    throw new Error(`weather.gov latest observation incomplete for ${location.metar}`)
  }

  return {
    station: location.metar,
    timeIso: dt.toISOString(),
    tempC,
  }
}

module.exports = {
  fetchCheckWxDecoded,
  fetchAviationWeatherObservations,
  fetchAvwxObservation,
  fetchTgftpObservation,
  fetchWeatherGovLatestObservation,
}
