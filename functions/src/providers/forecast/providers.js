const { fetchJson } = require("../../infra/http")
const { parsePercentToProbability } = require("../../parsers")
const { round, toDateOnlyUtc } = require("../../utils/common")

function toCelsius(value, unit) {
  if (!Number.isFinite(value)) return null
  if (String(unit).toUpperCase() === "F") return round((value - 32) * 5 / 9, 1)
  return value
}

async function fetchMetNoForecast(location) {
  const url =
    "https://api.met.no/weatherapi/locationforecast/2.0/compact" +
    `?lat=${location.lat}&lon=${location.lon}`

  const data = await fetchJson(url, { headers: { accept: "application/json" } })
  const series = Array.isArray(data?.properties?.timeseries) ? data.properties.timeseries : []

  const forecast = series
    .map((row) => ({
      time: { seconds: Math.floor(new Date(row?.time).getTime() / 1000) },
      temp: Number.isFinite(row?.data?.instant?.details?.air_temperature)
        ? row.data.instant.details.air_temperature
        : null,
      probability: null,
    }))
    .filter((row) => Number.isFinite(row?.time?.seconds))

  return { forecast, points: series.length }
}

function parseMetOfficeTimeSeries(payload) {
  const timeSeries = payload?.features?.[0]?.properties?.timeSeries
  return Array.isArray(timeSeries) ? timeSeries : []
}

async function fetchMetOfficeHourlyForecast(location, apiKey) {
  const url =
    "https://data.hub.api.metoffice.gov.uk/sitespecific/v0/point/hourly" +
    "?datasource=BD1&includeLocationName=true&excludeParameterMetadata=true" +
    `&latitude=${location.lat}&longitude=${location.lon}`

  const data = await fetchJson(url, {
    headers: { apikey: apiKey, accept: "application/json" },
  })

  const timeSeries = parseMetOfficeTimeSeries(data)
  const forecast = timeSeries
    .map((row) => ({
      time: { seconds: Math.floor(new Date(row?.time).getTime() / 1000) },
      temp: Number.isFinite(row?.screenTemperature) ? row.screenTemperature : null,
      probability: null,
    }))
    .filter((row) => Number.isFinite(row?.time?.seconds))

  return { forecast, points: timeSeries.length }
}

async function fetchWeatherGovHourlyForecast(location) {
  const pointsUrl = `https://api.weather.gov/points/${location.lat},${location.lon}`
  const pointsPayload = await fetchJson(pointsUrl, {
    headers: { accept: "application/geo+json" },
  })

  const forecastHourlyUrl = pointsPayload?.properties?.forecastHourly
  if (!forecastHourlyUrl) throw new Error("weather.gov did not return forecastHourly URL")

  const forecastPayload = await fetchJson(forecastHourlyUrl, {
    headers: { accept: "application/geo+json" },
  })
  const periods = Array.isArray(forecastPayload?.properties?.periods)
    ? forecastPayload.properties.periods
    : []

  const forecast = periods
    .map((period) => ({
      time: { seconds: Math.floor(new Date(period?.startTime).getTime() / 1000) },
      temp: toCelsius(Number(period?.temperature), period?.temperatureUnit),
      probability: null,
    }))
    .filter((row) => Number.isFinite(row?.time?.seconds))

  return { forecast, points: periods.length }
}

async function fetchTomorrowForecast(location, apiKey) {
  const url =
    "https://api.tomorrow.io/v4/weather/forecast" +
    `?location=${location.lat},${location.lon}&timesteps=1h&units=metric` +
    `&apikey=${encodeURIComponent(apiKey)}`

  const data = await fetchJson(url, { headers: { accept: "application/json" } })
  const hourly = Array.isArray(data?.timelines?.hourly) ? data.timelines.hourly : []

  const forecast = hourly
    .map((row) => ({
      time: { seconds: Math.floor(new Date(row?.time).getTime() / 1000) },
      temp: Number.isFinite(row?.values?.temperature) ? row.values.temperature : null,
      probability: null,
    }))
    .filter((row) => Number.isFinite(row?.time?.seconds))

  return { forecast, points: hourly.length }
}

async function fetchWeatherApiForecast(location, apiKey) {
  const url =
    "https://api.weatherapi.com/v1/forecast.json" +
    `?key=${encodeURIComponent(apiKey)}&q=${location.lat},${location.lon}` +
    "&days=2&aqi=no&alerts=no"

  const data = await fetchJson(url, { headers: { accept: "application/json" } })

  const responseLat = Number(data?.location?.lat)
  const responseLon = Number(data?.location?.lon)
  if (
    Number.isFinite(responseLat) &&
    Number.isFinite(responseLon) &&
    (Math.abs(responseLat - location.lat) > 1 || Math.abs(responseLon - location.lon) > 1)
  ) {
    throw new Error(
      `WeatherAPI location mismatch. requested=${location.lat},${location.lon} resolved=${responseLat},${responseLon}`
    )
  }

  const forecastDays = Array.isArray(data?.forecast?.forecastday) ? data.forecast.forecastday : []
  const hours = forecastDays.flatMap((day) => (Array.isArray(day?.hour) ? day.hour : []))

  const forecast = hours
    .map((row) => {
      const seconds = Number(row?.time_epoch)
      const tempC = Number.isFinite(row?.temp_c) ? row.temp_c : null

      return {
        time: { seconds },
        temp: tempC,
        probability: null,
      }
    })
    .filter((row) => Number.isFinite(row?.time?.seconds))

  return { forecast, points: hours.length }
}

async function fetchOpenWeatherForecast(location, apiKey) {
  const url =
    "https://api.openweathermap.org/data/2.5/forecast" +
    `?lat=${location.lat}&lon=${location.lon}` +
    "&units=metric" +
    `&appid=${encodeURIComponent(apiKey)}`

  const data = await fetchJson(url, { headers: { accept: "application/json" } })
  const rows = Array.isArray(data?.list) ? data.list : []

  const forecast = rows
    .map((row) => ({
      time: { seconds: Number(row?.dt) },
      temp: Number.isFinite(row?.main?.temp) ? row.main.temp : null,
      probability: Number.isFinite(row?.pop) ? row.pop : null,
    }))
    .filter((row) => Number.isFinite(row?.time?.seconds))

  return { forecast, points: rows.length }
}

async function fetchEcmwfOpenDataForecast(location) {
  const url =
    "https://api.open-meteo.com/v1/ecmwf" +
    `?latitude=${location.lat}&longitude=${location.lon}` +
    "&hourly=temperature_2m,precipitation_probability&forecast_days=2&timezone=UTC"

  const data = await fetchJson(url, { headers: { accept: "application/json" } })

  const times = Array.isArray(data?.hourly?.time) ? data.hourly.time : []
  const temps = Array.isArray(data?.hourly?.temperature_2m) ? data.hourly.temperature_2m : []
  const probs = Array.isArray(data?.hourly?.precipitation_probability)
    ? data.hourly.precipitation_probability
    : []

  const forecast = times
    .map((t, idx) => ({
      time: { seconds: Math.floor(new Date(t).getTime() / 1000) },
      temp: Number.isFinite(temps[idx]) ? temps[idx] : null,
      probability: parsePercentToProbability(probs[idx]),
    }))
    .filter((row) => Number.isFinite(row?.time?.seconds))

  return { forecast, points: times.length }
}

async function fetchPirateWeatherForecast(location, apiKey) {
  const url =
    `https://api.pirateweather.net/forecast/${encodeURIComponent(apiKey)}` +
    `/${location.lat},${location.lon}` +
    "?units=si&exclude=currently,minutely,daily,alerts"

  const data = await fetchJson(url, { headers: { accept: "application/json" } })
  const rows = Array.isArray(data?.hourly?.data) ? data.hourly.data : []

  const forecast = rows
    .map((row) => ({
      time: { seconds: Number(row?.time) },
      temp: Number.isFinite(row?.temperature) ? row.temperature : null,
      probability: parsePercentToProbability(row?.precipProbability),
    }))
    .filter((row) => Number.isFinite(row?.time?.seconds))

  return { forecast, points: rows.length }
}

async function fetchVisualCrossingForecast(location, apiKey, runTime) {
  const locationParam = `${location.lat},${location.lon}`
  const startDate = toDateOnlyUtc(runTime)
  const endDate = toDateOnlyUtc(new Date(runTime.getTime() + 24 * 60 * 60 * 1000))

  const url =
    "https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/" +
    `${encodeURIComponent(locationParam)}/${startDate}/${endDate}` +
    `?unitGroup=metric&include=hours&elements=datetimeEpoch,temp,precipprob&key=${encodeURIComponent(
      apiKey
    )}&contentType=json`

  const data = await fetchJson(url, { headers: { accept: "application/json" } })
  const days = Array.isArray(data?.days) ? data.days : []
  const rows = days.flatMap((day) => (Array.isArray(day?.hours) ? day.hours : []))

  const forecast = rows
    .map((row) => ({
      time: { seconds: Number(row?.datetimeEpoch) },
      temp: Number.isFinite(row?.temp) ? row.temp : null,
      probability: parsePercentToProbability(row?.precipprob),
    }))
    .filter((row) => Number.isFinite(row?.time?.seconds))

  return { forecast, points: rows.length }
}

module.exports = {
  fetchMetNoForecast,
  fetchMetOfficeHourlyForecast,
  fetchWeatherGovHourlyForecast,
  fetchTomorrowForecast,
  fetchWeatherApiForecast,
  fetchOpenWeatherForecast,
  fetchEcmwfOpenDataForecast,
  fetchPirateWeatherForecast,
  fetchVisualCrossingForecast,
}
