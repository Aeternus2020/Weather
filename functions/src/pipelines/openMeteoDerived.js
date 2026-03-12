const logger = require("firebase-functions/logger")
const { BUCKETS_F, LOCATIONS, CACHE_TTL_MINUTES, INGESTION_CONCURRENCY } = require("../config")
const { round } = require("../utils/common")
const { createFailure, createRunResult } = require("../utils/runResult")
const { shouldFetchByCache, writeForecast, writeTemperatureEvaluation, markCacheSuccess } = require("../repository")
const { fetchOpenMeteoForecast } = require("../providers/shared/openMeteo")
const { mapWithConcurrency } = require("../utils/concurrency")

function cToF(celsius) {
  return celsius * 9 / 5 + 32
}

function bucketKey(minF, maxF) {
  const min = minF === -999 ? "-999F" : `${minF}F`
  const max = maxF === 999 ? "999F" : `${maxF}F`
  return `${min}..${max}`
}

function buildDistributionFromTemps(temperaturesF) {
  const counts = BUCKETS_F.slice(0, -1).map(() => 0)
  let total = 0

  for (const temperatureF of temperaturesF) {
    if (!Number.isFinite(temperatureF)) continue
    total += 1
    for (let index = 0; index < BUCKETS_F.length - 1; index += 1) {
      const min = BUCKETS_F[index]
      const max = BUCKETS_F[index + 1]
      if (temperatureF >= min && temperatureF < max) {
        counts[index] += 1
        break
      }
    }
  }

  const distribution = {}
  for (let index = 0; index < counts.length; index += 1) {
    const min = BUCKETS_F[index]
    const max = BUCKETS_F[index + 1]
    distribution[bucketKey(min, max)] = total === 0 ? 0 : Number((counts[index] / total).toFixed(4))
  }

  return distribution
}

function buildMaxTempMap(maxF) {
  const maxTempMap = {}
  for (let index = 0; index < BUCKETS_F.length - 1; index += 1) {
    const min = BUCKETS_F[index]
    const max = BUCKETS_F[index + 1]
    const key = bucketKey(min, max)
    maxTempMap[key] = maxF >= min && maxF < max ? round(maxF, 1) : null
  }
  return maxTempMap
}

function buildCertainMap(distribution) {
  let bestKey = null
  let bestValue = -1
  for (const [key, value] of Object.entries(distribution)) {
    if (value > bestValue) {
      bestValue = value
      bestKey = key
    }
  }

  const certainMap = {}
  for (const key of Object.keys(distribution)) {
    certainMap[key] = key === bestKey ? 1 : 0
  }
  return certainMap
}

function averageDistributions(firstDistribution, secondDistribution) {
  const average = {}
  for (const key of Object.keys(firstDistribution)) {
    average[key] = Number(((firstDistribution[key] + (secondDistribution[key] ?? 0)) / 2).toFixed(4))
  }
  return average
}

async function ingestOpenMeteoCoreForecastAndEvaluation(runTime) {
  const result = createRunResult()

  await mapWithConcurrency(LOCATIONS, INGESTION_CONCURRENCY, async (location) => {
    try {
      const canFetch = await shouldFetchByCache({
        kind: "forecast",
        source: "open-meteo.com",
        location: location.id,
        runTime,
        ttlMinutes: CACHE_TTL_MINUTES.forecastHourly,
      })
      if (!canFetch) return

      const { forecast, temps } = await fetchOpenMeteoForecast(location)
      if (!forecast.length) return

      await writeForecast({
        source: "open-meteo.com",
        location: location.id,
        runTime,
        forecast,
      })

      const tempsF = temps.map((t) => (t == null ? null : cToF(t)))
      const finiteTempsF = tempsF.filter((v) => Number.isFinite(v))
      const dist = buildDistributionFromTemps(tempsF)
      const maxF = finiteTempsF.length ? Math.max(...finiteTempsF) : NaN
      const modelDist = buildDistributionFromTemps(
        tempsF.map((t) => (t == null ? null : t + 1.2))
      )
      const maxMap = Number.isFinite(maxF) ? buildMaxTempMap(maxF) : {}
      const certainMap = buildCertainMap(dist)
      const overall = averageDistributions(dist, modelDist)

      const basedOn = [
        {
          evaluator: "forecast",
          data: "Open-Meteo GFS",
          timestamp: { seconds: Math.floor(runTime.getTime() / 1000) },
          p: dist,
        },
        {
          evaluator: "temperature prediction model",
          data: "Synthetic scenario (+1.2°F from Open-Meteo)",
          timestamp: { seconds: Math.floor(runTime.getTime() / 1000) },
          p: modelDist,
        },
        {
          evaluator: "maxTempReached",
          data: "Forecast max",
          timestamp: { seconds: Math.floor(runTime.getTime() / 1000) },
          p: maxMap,
        },
        {
          evaluator: "certain",
          data: "Most likely bucket",
          timestamp: { seconds: Math.floor(runTime.getTime() / 1000) },
          p: certainMap,
        },
      ]

      await writeTemperatureEvaluation({
        location: location.id,
        runTime,
        basedOn,
        overall,
      })

      await markCacheSuccess({
        kind: "forecast",
        source: "open-meteo.com",
        location: location.id,
        runTime,
      })

      result.inserted += 2
    } catch (err) {
      logger.error(`Open-Meteo forecast/derived failed for ${location.id}`, err)
      result.failures.push(createFailure("open-meteo.com", err, { location: location.id }))
    }
  })
  return result
}

module.exports = {
  ingestOpenMeteoCoreForecastAndEvaluation,
}
