const { LOCATIONS, CACHE_TTL_MINUTES } = require("../config")
const { markCacheSuccess, writeObservation } = require("../repository")
const { isMissingSecret } = require("../utils/common")
const { createRunResult } = require("../utils/runResult")
const {
  fetchCheckWxDecoded,
  fetchAviationWeatherObservations,
  fetchAvwxObservation,
  fetchTgftpObservation,
  fetchWeatherGovLatestObservation,
} = require("../providers/observation/providers")
const { fetchOpenMeteoForecast } = require("../providers/shared/openMeteo")
const {
  appendMissingBatchFailures,
  getDueLocations,
  ingestPerLocationObservations,
} = require("./observationIngestion")

async function ingestCheckWxObservations(runTime) {
  const apiKey = process.env.CHECKWX_API_KEY
  if (isMissingSecret(apiKey)) return createRunResult()

  const dueLocations = await getDueLocations({
    source: "checkwx.com",
    runTime,
    ttlMinutes: CACHE_TTL_MINUTES.observationsSlow,
  })
  if (!dueLocations.length) return createRunResult()

  const stationCodes = dueLocations.map((location) => location.metar).join(",")
  const observations = await fetchCheckWxDecoded(stationCodes, apiKey)
  const locationByMetar = new Map(dueLocations.map((location) => [location.metar, location.id]))

  const result = createRunResult()
  const seenStations = new Set()
  for (const observation of observations) {
    const location = locationByMetar.get(observation.station)
    if (!location) continue
    seenStations.add(observation.station)

    await writeObservation({
      source: "checkwx.com",
      location,
      timeIso: observation.timeIso,
      tempC: observation.tempC,
    })
    await markCacheSuccess({
      kind: "observation",
      source: "checkwx.com",
      location,
      runTime,
    })
    result.inserted += 1
  }

  appendMissingBatchFailures({
    source: "checkwx.com",
    dueLocations,
    seenStations,
    result,
  })
  return result
}

async function ingestAviationWeatherObservations(runTime) {
  const dueLocations = await getDueLocations({
    source: "aviationweather.gov",
    runTime,
    ttlMinutes: CACHE_TTL_MINUTES.observationsSlow,
  })
  if (!dueLocations.length) return createRunResult()

  const stationCodes = dueLocations.map((location) => location.metar).join(",")
  const observations = await fetchAviationWeatherObservations(stationCodes)
  const locationByMetar = new Map(dueLocations.map((location) => [location.metar, location.id]))

  const result = createRunResult()
  const seenStations = new Set()
  for (const observation of observations) {
    const location = locationByMetar.get(observation.station)
    if (!location) continue
    seenStations.add(observation.station)

    await writeObservation({
      source: "aviationweather.gov",
      location,
      timeIso: observation.timeIso,
      tempC: observation.tempC,
    })
    await markCacheSuccess({
      kind: "observation",
      source: "aviationweather.gov",
      location,
      runTime,
    })
    result.inserted += 1
  }

  appendMissingBatchFailures({
    source: "aviationweather.gov",
    dueLocations,
    seenStations,
    result,
  })
  return result
}

async function ingestTgftpObservations(runTime) {
  return ingestPerLocationObservations({
    source: "tgftp.nws.noaa.gov",
    runTime,
    ttlMinutes: CACHE_TTL_MINUTES.observationsSlow,
    fetcher: (location) => fetchTgftpObservation(location),
  })
}

async function ingestWeatherGovObservations(runTime) {
  return ingestPerLocationObservations({
    source: "weather.gov",
    runTime,
    ttlMinutes: CACHE_TTL_MINUTES.observationsSlow,
    fetcher: (location) => fetchWeatherGovLatestObservation(location),
    targets: LOCATIONS.filter((location) => location.id === "NY"),
  })
}

async function ingestAvwxObservations(runTime) {
  const apiKey = process.env.AVWX_API_KEY
  if (isMissingSecret(apiKey)) return createRunResult()

  return ingestPerLocationObservations({
    source: "avwx",
    runTime,
    ttlMinutes: CACHE_TTL_MINUTES.observationsSlow,
    fetcher: (location) => fetchAvwxObservation(location, apiKey),
  })
}

async function ingestOpenMeteoObservations(runTime) {
  return ingestPerLocationObservations({
    source: "open-meteo.com",
    runTime,
    ttlMinutes: CACHE_TTL_MINUTES.observationsFast,
    fetcher: async (location) => {
      const { times, temps } = await fetchOpenMeteoForecast(location)
      if (!times.length) return null

      const now = runTime.getTime()
      let bestIdx = 0
      let bestDiff = Infinity
      for (let i = 0; i < times.length; i += 1) {
        const diff = Math.abs(new Date(times[i]).getTime() - now)
        if (diff < bestDiff) {
          bestDiff = diff
          bestIdx = i
        }
      }

      const timeIso = new Date(times[bestIdx]).toISOString()
      const tempC = temps[bestIdx]
      if (tempC == null) return null

      return { timeIso, tempC }
    },
  })
}

function getObservationPipelineSteps(runTime) {
  return [
    {
      name: "CheckWX observations",
      run: () => ingestCheckWxObservations(runTime),
    },
    {
      name: "AviationWeather observations",
      run: () => ingestAviationWeatherObservations(runTime),
    },
    {
      name: "TGFTP observations",
      run: () => ingestTgftpObservations(runTime),
    },
    {
      name: "weather.gov observations",
      run: () => ingestWeatherGovObservations(runTime),
    },
    {
      name: "AVWX observations",
      run: () => ingestAvwxObservations(runTime),
    },
    {
      name: "Open-Meteo observations",
      run: () => ingestOpenMeteoObservations(runTime),
    },
  ]
}

module.exports = {
  getObservationPipelineSteps,
}
