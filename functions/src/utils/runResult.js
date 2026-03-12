function toErrorMessage(err) {
  if (err instanceof Error && err.message) return err.message
  return String(err || "Unknown error")
}

function createRunResult() {
  return {
    inserted: 0,
    failures: [],
  }
}

function createFailure(scope, err, details = {}) {
  return {
    scope,
    message: toErrorMessage(err),
    ...details,
  }
}

function mergeRunResult(target, source) {
  target.inserted += source.inserted
  target.failures.push(...source.failures)
  return target
}

function buildFailureSummary(failures, limit = 5) {
  return failures
    .slice(0, limit)
    .map((failure) => {
      const location = failure.location ? ` (${failure.location})` : ""
      return `${failure.scope}${location}: ${failure.message}`
    })
    .join(" | ")
}

module.exports = {
  createRunResult,
  createFailure,
  mergeRunResult,
  buildFailureSummary,
}
