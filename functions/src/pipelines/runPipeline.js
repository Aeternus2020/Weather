const { createFailure, createRunResult, mergeRunResult } = require("../utils/runResult")

async function safeRun(logger, name, fn) {
  try {
    return await fn()
  } catch (err) {
    logger.error(`${name} failed`, err)
    return {
      inserted: 0,
      failures: [createFailure(name, err)],
    }
  }
}

async function runPipelineSteps(logger, steps) {
  const result = createRunResult()

  for (const step of steps) {
    mergeRunResult(result, await safeRun(logger, step.name, step.run))
  }

  return result
}

module.exports = {
  runPipelineSteps,
  safeRun,
}
