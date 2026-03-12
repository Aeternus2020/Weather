function round(value, digits = 1) {
  const m = 10 ** digits
  return Math.round(value * m) / m
}

function toDateOnlyUtc(date) {
  return date.toISOString().slice(0, 10)
}

function isMissingSecret(value) {
  const normalized = String(value || "").trim().toUpperCase()
  return !normalized || normalized === "REPLACE_ME"
}

module.exports = {
  round,
  toDateOnlyUtc,
  isMissingSecret,
}
