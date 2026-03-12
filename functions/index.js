const { onSchedule } = require("firebase-functions/v2/scheduler")
const logger = require("firebase-functions/logger")
const { ingestForecasts: runForecastIngestion } = require("./src/pipelines/forecast")
const { buildFailureSummary } = require("./src/utils/runResult")
const { getObservationPipelineSteps } = require("./src/pipelines/observationProviderRegistry")
const { runPipelineSteps } = require("./src/pipelines/runPipeline")

function assertSuccessfulRun(jobName, result) {
  if (!result.failures.length) return

  const summary = buildFailureSummary(result.failures)
  throw new Error(`${jobName} failed with ${result.failures.length} failures: ${summary}`)
}

async function runScheduledJob(jobName, runner, nowFactory = () => new Date()) {
  const runTime = nowFactory()
  logger.info(`${jobName} started`, { runTime: runTime.toISOString() })

  const result = await runner(runTime)
  assertSuccessfulRun(jobName, result)

  logger.info(`${jobName} completed`, {
    totalInserted: result.inserted,
    failures: result.failures.length,
  })

  return result
}

async function runObservationIngestion(runTime) {
  return runPipelineSteps(logger, getObservationPipelineSteps(runTime))
}

exports.ingestObservations = onSchedule(
  {
    schedule: "every 30 minutes",
    timeZone: "UTC",
    secrets: ["CHECKWX_API_KEY", "AVWX_API_KEY"],
  },
  async () => runScheduledJob("Observation ingestion", runObservationIngestion)
)

exports.ingestForecasts = onSchedule(
  {
    schedule: "every 120 minutes",
    timeZone: "UTC",
    secrets: [
      "METOFFICE_API_KEY",
      "TOMORROW_API_KEY",
      "WEATHERAPI_KEY",
      "OPENWEATHER_API_KEY",
      "PIRATEWEATHER_API_KEY",
      "VISUALCROSSING_API_KEY",
    ],
  },
  async () => runScheduledJob("Forecast ingestion", runForecastIngestion)
)

module.exports.assertSuccessfulRun = assertSuccessfulRun
module.exports.runScheduledJob = runScheduledJob
