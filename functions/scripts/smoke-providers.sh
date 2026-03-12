#!/bin/zsh

set -u

WEATHER_GOV_USER_AGENT="forecast-atlas-ingestion/1.0"
OVERALL_STATUS=0
REQUIRE_ALL_SECRETS="${REQUIRE_ALL_SECRETS:-0}"

require_command() {
  local command_name="$1"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "FAIL missing command: $command_name"
    exit 1
  fi
}

is_missing_secret() {
  local value="${1:-}"
  local normalized="${value:u}"
  [[ -z "$value" || "$normalized" == "REPLACE_ME" ]]
}

print_ok() {
  echo "OK   $1"
}

print_skip() {
  echo "SKIP $1"
}

print_fail() {
  echo "FAIL $1"
  OVERALL_STATUS=1
}

report_missing_secret() {
  local message="$1"

  if [[ "$REQUIRE_ALL_SECRETS" == "1" ]]; then
    print_fail "$message"
    return
  fi

  print_skip "$message"
}

run_json_smoke() {
  local name="$1"
  local jq_expression="$2"
  local url="$3"
  shift 3

  local headers_file
  local body_file
  headers_file="$(mktemp /tmp/weather-smoke.headers.XXXXXX)"
  body_file="$(mktemp /tmp/weather-smoke.body.XXXXXX)"

  if ! curl --silent --show-error --connect-timeout 10 --max-time 30 \
    "$@" \
    -D "$headers_file" \
    -o "$body_file" \
    "$url"; then
    print_fail "$name: request failed"
    rm -f "$headers_file" "$body_file"
    return
  fi

  local http_status
  http_status="$(awk 'toupper($1) ~ /^HTTP\// {status=$2} END {print status}' "$headers_file")"
  if [[ "$http_status" != "200" ]]; then
    local body_preview
    body_preview="$(head -c 240 "$body_file" | tr '\n' ' ')"
    print_fail "$name: HTTP ${http_status:-unknown} ${body_preview}"
    rm -f "$headers_file" "$body_file"
    return
  fi

  if ! jq -e "$jq_expression" "$body_file" >/dev/null 2>&1; then
    local body_preview
    body_preview="$(head -c 240 "$body_file" | tr '\n' ' ')"
    print_fail "$name: unexpected payload shape ${body_preview}"
    rm -f "$headers_file" "$body_file"
    return
  fi

  print_ok "$name"
  rm -f "$headers_file" "$body_file"
}

run_text_smoke() {
  local name="$1"
  local url="$2"
  local expected_pattern="$3"

  local body_file
  body_file="$(mktemp /tmp/weather-smoke.body.XXXXXX)"

  if ! curl --silent --show-error --connect-timeout 10 --max-time 30 \
    -H "accept: text/plain" \
    -o "$body_file" \
    "$url"; then
    print_fail "$name: request failed"
    rm -f "$body_file"
    return
  fi

  if ! grep -Eq "$expected_pattern" "$body_file"; then
    local body_preview
    body_preview="$(head -c 240 "$body_file" | tr '\n' ' ')"
    print_fail "$name: unexpected text payload ${body_preview}"
    rm -f "$body_file"
    return
  fi

  print_ok "$name"
  rm -f "$body_file"
}

run_weather_gov_forecast_smoke() {
  local name="$1"
  local latitude="$2"
  local longitude="$3"

  local points_headers
  local points_body
  points_headers="$(mktemp /tmp/weather-smoke.headers.XXXXXX)"
  points_body="$(mktemp /tmp/weather-smoke.body.XXXXXX)"

  if ! curl --silent --show-error --connect-timeout 10 --max-time 30 \
    -H "accept: application/geo+json" \
    -D "$points_headers" \
    -o "$points_body" \
    "https://api.weather.gov/points/${latitude},${longitude}"; then
    print_fail "$name: points request failed"
    rm -f "$points_headers" "$points_body"
    return
  fi

  local points_status
  points_status="$(awk 'toupper($1) ~ /^HTTP\// {status=$2} END {print status}' "$points_headers")"
  if [[ "$points_status" != "200" ]]; then
    local body_preview
    body_preview="$(head -c 240 "$points_body" | tr '\n' ' ')"
    print_fail "$name: points HTTP ${points_status:-unknown} ${body_preview}"
    rm -f "$points_headers" "$points_body"
    return
  fi

  local forecast_url
  forecast_url="$(jq -r '.properties.forecastHourly // empty' "$points_body")"
  rm -f "$points_headers" "$points_body"

  if [[ -z "$forecast_url" ]]; then
    print_fail "$name: forecastHourly URL missing"
    return
  fi

  run_json_smoke \
    "$name" \
    '.properties.periods[0].startTime != null and .properties.periods[0].temperature != null' \
    "$forecast_url" \
    -H "accept: application/geo+json"
}

require_command curl
require_command jq
require_command node

TODAY_UTC="$(node -e 'console.log(new Date().toISOString().slice(0, 10))')"
TOMORROW_UTC="$(node -e 'const date = new Date(); date.setUTCDate(date.getUTCDate() + 1); console.log(date.toISOString().slice(0, 10))')"

echo "Running provider smoke checks..."

run_json_smoke \
  "api.met.no forecast" \
  '.properties.timeseries[0].time != null and .properties.timeseries[0].data.instant.details.air_temperature != null' \
  "https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=51.5074&lon=-0.1278" \
  -H "accept: application/json"

if is_missing_secret "${METOFFICE_API_KEY:-}"; then
  report_missing_secret "metoffice.gov.uk forecast: METOFFICE_API_KEY missing"
else
  run_json_smoke \
    "metoffice.gov.uk forecast" \
    '.features[0].properties.timeSeries[0].time != null and .features[0].properties.timeSeries[0].screenTemperature != null' \
    "https://data.hub.api.metoffice.gov.uk/sitespecific/v0/point/hourly?datasource=BD1&includeLocationName=true&excludeParameterMetadata=true&latitude=51.5074&longitude=-0.1278" \
    -H "accept: application/json" \
    -H "apikey: ${METOFFICE_API_KEY}"
fi

run_weather_gov_forecast_smoke "weather.gov forecast" "40.7128" "-74.006"

if is_missing_secret "${TOMORROW_API_KEY:-}"; then
  report_missing_secret "tomorrow.io forecast: TOMORROW_API_KEY missing"
else
  run_json_smoke \
    "tomorrow.io forecast" \
    '.timelines.hourly[0].time != null and .timelines.hourly[0].values.temperature != null' \
    "https://api.tomorrow.io/v4/weather/forecast?location=51.5074,-0.1278&timesteps=1h&units=metric&apikey=${TOMORROW_API_KEY}" \
    -H "accept: application/json"
fi

if is_missing_secret "${WEATHERAPI_KEY:-}"; then
  report_missing_secret "weatherapi.com forecast: WEATHERAPI_KEY missing"
else
  run_json_smoke \
    "weatherapi.com forecast" \
    '.forecast.forecastday[0].hour[0].time_epoch != null and .forecast.forecastday[0].hour[0].temp_c != null' \
    "https://api.weatherapi.com/v1/forecast.json?key=${WEATHERAPI_KEY}&q=51.5074,-0.1278&days=2&aqi=no&alerts=no" \
    -H "accept: application/json"
fi

if is_missing_secret "${OPENWEATHER_API_KEY:-}"; then
  report_missing_secret "openweather.org forecast: OPENWEATHER_API_KEY missing"
else
  run_json_smoke \
    "openweather.org forecast" \
    '.list[0].dt != null and .list[0].main.temp != null' \
    "https://api.openweathermap.org/data/2.5/forecast?lat=51.5074&lon=-0.1278&units=metric&appid=${OPENWEATHER_API_KEY}" \
    -H "accept: application/json"
fi

run_json_smoke \
  "ecmwf.int forecast" \
  '.hourly.time[0] != null and .hourly.temperature_2m[0] != null' \
  "https://api.open-meteo.com/v1/ecmwf?latitude=51.5074&longitude=-0.1278&hourly=temperature_2m,precipitation_probability&forecast_days=2&timezone=UTC" \
  -H "accept: application/json"

if is_missing_secret "${PIRATEWEATHER_API_KEY:-}"; then
  report_missing_secret "pirateweather.net forecast: PIRATEWEATHER_API_KEY missing"
else
  run_json_smoke \
    "pirateweather.net forecast" \
    '.hourly.data[0].time != null and .hourly.data[0].temperature != null' \
    "https://api.pirateweather.net/forecast/${PIRATEWEATHER_API_KEY}/51.5074,-0.1278?units=si&exclude=currently,minutely,daily,alerts" \
    -H "accept: application/json"
fi

if is_missing_secret "${VISUALCROSSING_API_KEY:-}"; then
  report_missing_secret "visualcrossing.com forecast: VISUALCROSSING_API_KEY missing"
else
  run_json_smoke \
    "visualcrossing.com forecast" \
    '.days[0].hours[0].datetimeEpoch != null and .days[0].hours[0].temp != null' \
    "https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/51.5074,-0.1278/${TODAY_UTC}/${TOMORROW_UTC}?unitGroup=metric&include=hours&elements=datetimeEpoch,temp,precipprob&key=${VISUALCROSSING_API_KEY}&contentType=json" \
    -H "accept: application/json"
fi

if is_missing_secret "${CHECKWX_API_KEY:-}"; then
  report_missing_secret "checkwx observations: CHECKWX_API_KEY missing"
else
  run_json_smoke \
    "checkwx observations" \
    '.data[0].icao != null and .data[0].temperature.celsius != null and .data[0].observed != null' \
    "https://api.checkwx.com/metar/EGLL,KJFK/decoded" \
    -H "X-API-Key: ${CHECKWX_API_KEY}"
fi

run_json_smoke \
  "aviationweather observations" \
  '.[0].icaoId != null and .[0].obsTime != null and .[0].temp != null' \
  "https://aviationweather.gov/api/data/metar?ids=EGLL,KJFK&format=json" \
  -H "accept: application/json"

run_text_smoke \
  "tgftp observation" \
  "https://tgftp.nws.noaa.gov/data/observations/metar/stations/EGLL.TXT" \
  'EGLL'

run_json_smoke \
  "weather.gov latest observation" \
  '.properties.timestamp != null and .properties.temperature.value != null' \
  "https://api.weather.gov/stations/KJFK/observations/latest" \
  -H "accept: application/geo+json" \
  -H "user-agent: ${WEATHER_GOV_USER_AGENT}"

if is_missing_secret "${AVWX_API_KEY:-}"; then
  report_missing_secret "avwx observation: AVWX_API_KEY missing"
else
  run_json_smoke \
    "avwx observation" \
    '.station != null and .time.dt != null and .temperature.value != null' \
    "https://avwx.rest/api/metar/EGLL" \
    -H "accept: application/json" \
    -H "authorization: ${AVWX_API_KEY}"
fi

run_json_smoke \
  "open-meteo shared forecast" \
  '.hourly.time[0] != null and .hourly.temperature_2m[0] != null' \
  "https://api.open-meteo.com/v1/gfs?latitude=51.5074&longitude=-0.1278&hourly=temperature_2m&forecast_days=2&timezone=UTC" \
  -H "accept: application/json"

exit "$OVERALL_STATUS"
