async function mapWithConcurrency(items, limit, worker) {
  if (!Array.isArray(items) || items.length === 0) return []
  const effectiveLimit = Math.max(1, Math.floor(limit) || 1)
  const results = new Array(items.length)
  let nextIndex = 0

  async function runWorker() {
    while (true) {
      const current = nextIndex
      nextIndex += 1
      if (current >= items.length) return
      results[current] = await worker(items[current], current)
    }
  }

  const workers = Array.from({ length: Math.min(effectiveLimit, items.length) }, () => runWorker())
  await Promise.all(workers)
  return results
}

module.exports = {
  mapWithConcurrency,
}
