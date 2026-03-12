const logger = require("firebase-functions/logger")
const { LOCATIONS, CACHE_TTL_MINUTES, INGESTION_CONCURRENCY } = require("../config")
const { isMissingSecret } = require("../utils/common")
const { mapWithConcurrency } = require("../utils/concurrency")
const { createFailure, createRunResult } = require("../utils/runResult")
const { shouldFetchByCache, markCacheSuccess, writeForecast } = require("../repository")
const { ingestOpenMeteoCoreForecastAndEvaluation } = require("./openMeteoDerived")
const { runPipelineSteps } = require("./runPipeline")
const {
  fetchMetNoForecast,
  fetchMetOfficeHourlyForecast,
  fetchWeatherGovHourlyForecast,
  fetchTomorrowForecast,
  fetchWeatherApiForecast,
  fetchOpenWeatherForecast,
  fetchEcmwfOpenDataForecast,
  fetchPirateWeatherForecast,
  fetchVisualCrossingForecast,
} = require("../providers/forecast/providers")

function getForecastProviderRegistry(runTime) {
  return [
    {
      source: "api.met.no",
      ttlMinutes: CACHE_TTL_MINUTES.forecastHourly,
      fetcher: (location) => fetchMetNoForecast(location),
    },
    {
      source: "metoffice.gov.uk",
      ttlMinutes: CACHE_TTL_MINUTES.forecast3h,
      requiredEnv: ["METOFFICE_API_KEY"],
      fetcher: (location) => fetchMetOfficeHourlyForecast(location, process.env.METOFFICE_API_KEY),
    },
    {
      source: "weather.gov",
      ttlMinutes: CACHE_TTL_MINUTES.forecast3h,
      targets: LOCATIONS.filter((location) => location.id === "NY"),
      fetcher: (location) => fetchWeatherGovHourlyForecast(location),
    },
    {
      source: "tomorrow.io",
      ttlMinutes: CACHE_TTL_MINUTES.forecast3h,
      requiredEnv: ["TOMORROW_API_KEY"],
      fetcher: (location) => fetchTomorrowForecast(location, process.env.TOMORROW_API_KEY),
    },
    {
      source: "weatherapi.com",
      ttlMinutes: CACHE_TTL_MINUTES.forecast3h,
      requiredEnv: ["WEATHERAPI_KEY"],
      fetcher: (location) => fetchWeatherApiForecast(location, process.env.WEATHERAPI_KEY),
    },
    {
      source: "openweather.org",
      ttlMinutes: CACHE_TTL_MINUTES.forecast3h,
      requiredEnv: ["OPENWEATHER_API_KEY"],
      fetcher: (location) => fetchOpenWeatherForecast(location, process.env.OPENWEATHER_API_KEY),
    },
    {
      source: "ecmwf.int",
      ttlMinutes: CACHE_TTL_MINUTES.forecast6h,
      fetcher: (location) => fetchEcmwfOpenDataForecast(location),
    },
    {
      source: "pirateweather.net",
      ttlMinutes: CACHE_TTL_MINUTES.forecast6h,
      requiredEnv: ["PIRATEWEATHER_API_KEY"],
      fetcher: (location) => fetchPirateWeatherForecast(location, process.env.PIRATEWEATHER_API_KEY),
    },
    {
      source: "visualcrossing.com",
      ttlMinutes: CACHE_TTL_MINUTES.forecast6h,
      requiredEnv: ["VISUALCROSSING_API_KEY"],
      fetcher: (location) =>
        fetchVisualCrossingForecast(location, process.env.VISUALCROSSING_API_KEY, runTime),
    },
  ]
}

function shouldSkipProvider(provider) {
  const required = provider.requiredEnv || []
  if (required.some((name) => isMissingSecret(process.env[name]))) return true

  if (provider.runGuard && !provider.runGuard()) {
    return true
  }

  return false
}

async function ingestProviderForecast(runTime, provider) {
  if (shouldSkipProvider(provider)) return createRunResult()

  const targets = provider.targets || LOCATIONS
  const result = createRunResult()

  await mapWithConcurrency(targets, INGESTION_CONCURRENCY, async (location) => {
    try {
      const canFetch = await shouldFetchByCache({
        kind: "forecast",
        source: provider.source,
        location: location.id,
        runTime,
        ttlMinutes: provider.ttlMinutes,
      })
      if (!canFetch) return

      const { forecast } = await provider.fetcher(location)
      if (!forecast?.length) {
        result.failures.push(
          createFailure(provider.source, new Error("Empty forecast payload"), {
            location: location.id,
          })
        )
        return
      }

      await writeForecast({
        source: provider.source,
        location: location.id,
        runTime,
        forecast,
      })
      await markCacheSuccess({
        kind: "forecast",
        source: provider.source,
        location: location.id,
        runTime,
      })

      result.inserted += 1
    } catch (err) {
      logger.error(`${provider.source} forecast failed for ${location.id}`, err)
      result.failures.push(createFailure(provider.source, err, { location: location.id }))
    }
  })
  return result
}

async function ingestForecasts(runTime) {
  const providers = getForecastProviderRegistry(runTime)
  const steps = [
    {
      name: "Open-Meteo core forecast/derived",
      run: () => ingestOpenMeteoCoreForecastAndEvaluation(runTime),
    },
    ...providers.map((provider) => ({
      name: `${provider.source} forecast`,
      run: () => ingestProviderForecast(runTime, provider),
    })),
  ]

  const result = await runPipelineSteps(logger, steps)
  return result
}

module.exports = {
  ingestForecasts,
}
