const { fetchJson } = require("../../infra/http")

async function fetchOpenMeteoForecast(location) {
  const url =
    "https://api.open-meteo.com/v1/gfs" +
    `?latitude=${location.lat}&longitude=${location.lon}` +
    "&hourly=temperature_2m&forecast_days=2&timezone=UTC"

  const data = await fetchJson(url)
  const times = data?.hourly?.time || []
  const temps = data?.hourly?.temperature_2m || []

  const forecast = times.map((t, idx) => ({
    time: { seconds: Math.floor(new Date(t).getTime() / 1000) },
    temp: temps[idx] ?? null,
    probability: null,
  }))

  return { forecast, times, temps, points: times.length }
}

module.exports = {
  fetchOpenMeteoForecast,
}
