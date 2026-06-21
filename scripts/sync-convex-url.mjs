import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const DEFAULT_WEB_SITE_URL = "http://localhost:3000"
const SOURCE_ENV = path.join(ROOT, "packages/backend/.env.local")
const TARGET_ENVS_BY_FILE = [
  {
    file: path.join(ROOT, "apps/web/.env.local"),
    vars: [
      {
        key: "VITE_CONVEX_URL",
        sourceKey: "CONVEX_URL",
      },
      {
        key: "VITE_CONVEX_SITE_URL",
        sourceKey: "CONVEX_SITE_URL",
      },
      {
        key: "VITE_SITE_URL",
        value: DEFAULT_WEB_SITE_URL,
      },
    ],
  },
  {
    file: path.join(ROOT, "apps/mobile/.env.local"),
    vars: [
      {
        key: "EXPO_PUBLIC_CONVEX_URL",
        sourceKey: "CONVEX_URL",
      },
    ],
  },
]

function relative(file) {
  return path.relative(ROOT, file)
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function getEnvValue(contents, key) {
  const keyPattern = new RegExp(
    `^\\s*(?:export\\s+)?${escapeRegExp(key)}\\s*=\\s*(.*)$`
  )

  for (const line of contents.split(/\r?\n/)) {
    if (line.trimStart().startsWith("#")) {
      continue
    }

    const match = line.match(keyPattern)

    if (match) {
      return normalizeEnvValue(match[1])
    }
  }

  return null
}

function normalizeEnvValue(rawValue) {
  const value = rawValue.trim()
  const quote = value[0]

  if (
    (quote === `"` || quote === `'`) &&
    value.length >= 2 &&
    value.endsWith(quote)
  ) {
    return value.slice(1, -1)
  }

  const commentIndex = value.search(/\s#/)

  if (commentIndex === -1) {
    return value
  }

  return value.slice(0, commentIndex).trim()
}

function formatEnvValue(value) {
  if (/^[\w./:@+-]+$/.test(value)) {
    return value
  }

  return JSON.stringify(value)
}

function upsertEnvValue(contents, key, value) {
  const keyPattern = new RegExp(`^\\s*(?:export\\s+)?${escapeRegExp(key)}\\s*=`)
  const formatted = `${key}=${formatEnvValue(value)}`
  const lines = contents.split(/\r?\n/)
  let updated = false

  const nextLines = lines.map((line) => {
    if (line.trimStart().startsWith("#") || !keyPattern.test(line)) {
      return line
    }

    updated = true
    return formatted
  })

  if (updated) {
    return nextLines.join("\n")
  }

  const separator = contents.length === 0 || contents.endsWith("\n") ? "" : "\n"

  return `${contents}${separator}${formatted}\n`
}

async function readOptionalFile(file) {
  try {
    return await readFile(file, "utf8")
  } catch (error) {
    if (error?.code === "ENOENT") {
      return ""
    }

    throw error
  }
}

const sourceContents = await readFile(SOURCE_ENV, "utf8")

await Promise.all(
  TARGET_ENVS_BY_FILE.map(async (target) => {
    const contents = await readOptionalFile(target.file)
    const nextContents = target.vars.reduce((currentContents, variable) => {
      const value =
        "value" in variable
          ? variable.value
          : getEnvValue(sourceContents, variable.sourceKey)

      if (!value) {
        throw new Error(
          `Missing ${variable.sourceKey} in ${relative(SOURCE_ENV)}`
        )
      }

      return upsertEnvValue(currentContents, variable.key, value)
    }, contents)

    await mkdir(path.dirname(target.file), { recursive: true })
    await writeFile(target.file, nextContents)
    console.log(`Synced ${relative(target.file)}`)
  })
)
