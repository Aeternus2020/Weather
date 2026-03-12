const { HTTP_USER_AGENT } = require("../config")

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function request(url, options = {}, expectJson = true) {
  const maxAttempts = 3
  const timeoutMs = 20000

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          "User-Agent": HTTP_USER_AGENT,
          ...(options.headers || {}),
        },
      })
      clearTimeout(timer)

      if (res.status === 204) return expectJson ? null : ""

      if (!res.ok) {
        const text = await res.text()
        const retryable = res.status >= 500 || res.status === 429
        if (retryable && attempt < maxAttempts) {
          await sleep(400 * attempt)
          continue
        }
        throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`)
      }

      const body = await res.text()
      if (!body) return expectJson ? null : ""
      return expectJson ? JSON.parse(body) : body
    } catch (err) {
      clearTimeout(timer)
      if (attempt < maxAttempts) {
        await sleep(400 * attempt)
        continue
      }
      throw err
    }
  }

  throw new Error("Unexpected fetch retry state")
}

async function fetchJson(url, options = {}) {
  return request(url, options, true)
}

async function fetchText(url, options = {}) {
  return request(url, options, false)
}

module.exports = {
  fetchJson,
  fetchText,
}
