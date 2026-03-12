const logger = require("firebase-functions/logger")
const { LOCATIONS, INGESTION_CONCURRENCY } = require("../config")
const { mapWithConcurrency } = require("../utils/concurrency")
const { createFailure, createRunResult } = require("../utils/runResult")
const { shouldFetchByCache, markCacheSuccess, writeObservation } = require("../repository")

async function getDueLocations({
  source,
  runTime,
  ttlMinutes,
  targets = LOCATIONS,
}) {
  const dueLocations = []

  await mapWithConcurrency(targets, INGESTION_CONCURRENCY, async (location) => {
    const canFetch = await shouldFetchByCache({
      kind: "observation",
      source,
      location: location.id,
      runTime,
      ttlMinutes,
    })

    if (canFetch) dueLocations.push(location)
  })

  return dueLocations
}

function appendMissingBatchFailures({
  source,
  dueLocations,
  seenStations,
  result,
  log = logger,
}) {
  for (const location of dueLocations) {
    if (seenStations.has(location.metar)) continue

    const error = new Error("Requested station missing from batch response")
    log.error(`${source} observations missing for ${location.id}`, error)
    result.failures.push(
      createFailure(source, error, {
        location: location.id,
        station: location.metar,
      })
    )
  }
}

async function ingestPerLocationObservations({
  source,
  runTime,
  ttlMinutes,
  fetcher,
  targets = LOCATIONS,
  log = logger,
}) {
  const result = createRunResult()

  await mapWithConcurrency(targets, INGESTION_CONCURRENCY, async (location) => {
    try {
      const canFetch = await shouldFetchByCache({
        kind: "observation",
        source,
        location: location.id,
        runTime,
        ttlMinutes,
      })
      if (!canFetch) return

      const observation = await fetcher(location)
      if (!observation?.timeIso || observation?.tempC == null) {
        const error = new Error("Incomplete observation payload")
        result.failures.push(createFailure(source, error, { location: location.id }))
        return
      }

      await writeObservation({
        source,
        location: location.id,
        timeIso: observation.timeIso,
        tempC: observation.tempC,
      })
      await markCacheSuccess({
        kind: "observation",
        source,
        location: location.id,
        runTime,
      })
      result.inserted += 1
    } catch (err) {
      log.error(`${source} observations failed for ${location.id}`, err)
      result.failures.push(createFailure(source, err, { location: location.id }))
    }
  })
  return result
}

module.exports = {
  appendMissingBatchFailures,
  getDueLocations,
  ingestPerLocationObservations,
}
