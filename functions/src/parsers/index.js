function parsePercentToProbability(value) {
  if (value == null) return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  if (parsed <= 1) return Math.max(0, parsed)
  return Math.max(0, Math.min(1, parsed / 100))
}

function parseFlexibleDate(value) {
  if (value == null) return null
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null

  if (typeof value === "number" && Number.isFinite(value)) {
    const millis = value < 1e12 ? value * 1000 : value
    const dt = new Date(millis)
    return Number.isFinite(dt.getTime()) ? dt : null
  }

  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return null
    if (/^\d+$/.test(trimmed)) return trimmed.length >= 10 ? parseFlexibleDate(Number(trimmed)) : null

    const dt = new Date(trimmed)
    return Number.isFinite(dt.getTime()) ? dt : null
  }

  return null
}

function parseMetarSignedInt(token) {
  if (typeof token !== "string") return null
  const trimmed = token.trim().toUpperCase()
  const negative = trimmed.startsWith("M")
  const digits = negative ? trimmed.slice(1) : trimmed
  if (!/^\d{2}$/.test(digits)) return null
  const value = Number(digits)
  return negative ? -value : value
}

function parseMetarTempCFromRaw(raw) {
  if (typeof raw !== "string") return null
  const match = raw.match(/(?:^|\s)(M?\d{2})\/(?:M?\d{2}|\/\/)(?:\s|$)/i)
  if (!match) return null
  return parseMetarSignedInt(match[1])
}

function parseTgftpObservation(text) {
  if (typeof text !== "string") return null

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length < 2) return null

  const tsLine = lines[0]
  const metarRaw = lines[1]

  let dt = null
  const match = tsLine.match(/^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})$/)
  if (match) {
    dt = new Date(
      Date.UTC(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3]),
        Number(match[4]),
        Number(match[5]),
        0
      )
    )
  } else {
    dt = parseFlexibleDate(tsLine)
  }

  if (!dt || !Number.isFinite(dt.getTime())) return null

  const station = metarRaw.split(/\s+/)[0]?.toUpperCase()
  const tempC = parseMetarTempCFromRaw(metarRaw)
  if (!station || tempC == null) return null

  return {
    station,
    timeIso: dt.toISOString(),
    tempC,
  }
}

function parseAviationObservation(entry) {
  const station = typeof entry?.icaoId === "string" ? entry.icaoId.toUpperCase() : null
  const tempC = Number.isFinite(entry?.temp) ? entry.temp : null
  const dt = parseFlexibleDate(entry?.obsTime)

  if (!station || tempC == null || !dt) return null

  return {
    station,
    timeIso: dt.toISOString(),
    tempC,
  }
}

module.exports = {
  parsePercentToProbability,
  parseFlexibleDate,
  parseMetarSignedInt,
  parseMetarTempCFromRaw,
  parseTgftpObservation,
  parseAviationObservation,
}
