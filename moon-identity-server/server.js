import { createServer } from 'node:http'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const port = Number(process.env.PORT || 8790)
const dataFile = process.env.MOON_DATA_FILE || './moon-identities.json'
const keyHash = process.env.MOON_DEVELOPER_KEY_SHA256 || ''
const allowedOrigin = process.env.MOON_ALLOWED_ORIGIN || '*'
const sessions = new Map()

if (!keyHash) throw new Error('Set MOON_DEVELOPER_KEY_SHA256.')

let database = { profiles: {} }
try {
  database = JSON.parse(await readFile(dataFile, 'utf8'))
} catch {
  await mkdir(path.dirname(dataFile), { recursive: true })
  await writeFile(dataFile, JSON.stringify(database))
}

async function save() {
  await mkdir(path.dirname(dataFile), { recursive: true })
  await writeFile(dataFile, `${JSON.stringify(database, null, 2)}\n`)
}

function send(response, status, body) {
  response.writeHead(status, {
    'access-control-allow-origin': allowedOrigin,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'authorization, content-type',
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
  })
  response.end(JSON.stringify(body))
}

async function readJson(request) {
  let size = 0
  const chunks = []
  for await (const chunk of request) {
    size += chunk.length
    if (size > 16_384) throw Object.assign(new Error('Request body is too large.'), { status: 413 })
    chunks.push(chunk)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw Object.assign(new Error('Request body must be JSON.'), { status: 400 })
  }
}

function normalizeUuid(value) {
  return typeof value === 'string' ? value.replace(/-/g, '').trim().toLowerCase() : ''
}

function normalizeText(value, maximum) {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, maximum) : ''
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function verifyDeveloperKey(value) {
  const expected = Buffer.from(keyHash.toLowerCase(), 'hex')
  const actual = Buffer.from(sha256(value), 'hex')
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

function authorized(request) {
  const authorization = request.headers.authorization || ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  return Boolean(token && sessions.has(token))
}

const server = createServer(async (request, response) => {
  if (request.method === 'OPTIONS') return send(response, 204, {})
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`)
  try {
    if (request.method === 'GET' && url.pathname === '/health') return send(response, 200, { status: 'ok' })

    if (request.method === 'POST' && url.pathname === '/v1/developer/login') {
      const { key } = await readJson(request)
      if (typeof key !== 'string' || !verifyDeveloperKey(key)) return send(response, 401, { error: 'Developer key salah.' })
      const token = randomBytes(32).toString('hex')
      sessions.set(token, { createdAt: Date.now() })
      return send(response, 200, { token })
    }

    const profileMatch = url.pathname.match(/^\/v1\/profiles\/([a-f0-9]{32})$/)
    if (request.method === 'GET' && profileMatch) {
      const profile = database.profiles[profileMatch[1]]
      return send(response, 200, profile || { uuid: profileMatch[1], nickname: '', title: '', prefix: '' })
    }

    if (!authorized(request)) return send(response, 401, { error: 'Developer login required.' })

    if (request.method === 'GET' && url.pathname === '/v1/profiles') {
      return send(response, 200, { profiles: Object.values(database.profiles) })
    }

    if (request.method === 'POST' && url.pathname === '/v1/profiles') {
      const body = await readJson(request)
      const uuid = normalizeUuid(body.uuid)
      const nickname = normalizeText(body.nickname, 16)
      const title = normalizeText(body.title, 32)
      const prefix = normalizeText(body.prefix, 64)
      if (!/^[a-f0-9]{32}$/.test(uuid)) return send(response, 400, { error: 'UUID Ely/Minecraft tidak valid.' })
      if (!nickname) return send(response, 400, { error: 'Nickname wajib diisi.' })
      database.profiles[uuid] = { uuid, nickname, title, prefix, updatedAt: Date.now() }
      await save()
      return send(response, 200, database.profiles[uuid])
    }

    return send(response, 404, { error: 'Endpoint tidak ditemukan.' })
  } catch (error) {
    const status = Number(error?.status) || 500
    console.error(error)
    return send(response, status < 500 ? status : 500, { error: error.message || 'Server Moon gagal memproses permintaan.' })
  }
})

server.listen(port, '0.0.0.0', () => console.log(`Moon identity service listening on ${port}`))
