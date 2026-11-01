import { randomBytes, randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { AccessToken, LiveKitAPI } from 'livekit-server-sdk'

const port = Number(process.env.PORT || 8787)
const liveKitApiUrl = process.env.LIVEKIT_API_URL
const liveKitWsUrl = process.env.LIVEKIT_WS_URL
const apiKey = process.env.LIVEKIT_API_KEY
const apiSecret = process.env.LIVEKIT_API_SECRET
const allowedOrigin = process.env.VOICE_ALLOWED_ORIGIN?.trim() || ''
const maxParticipants = 8
const rateLimitWindowMs = 60_000
const maxRequestsPerWindow = 30
const requestCounts = new Map()
const socialUsers = new Map()
const socialTokens = new Map()
const socialGroups = new Map()
const socialFriendRequests = new Map()
const socialMessages = []

if (!liveKitApiUrl || !liveKitWsUrl || !apiKey || !apiSecret) {
  throw new Error('Set LIVEKIT_API_URL, LIVEKIT_WS_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET.')
}

const liveKit = new LiveKitAPI({ host: liveKitApiUrl, apiKey, secret: apiSecret })

function sendJson(response, status, payload) {
  const headers = {
    ...(allowedOrigin ? { 'access-control-allow-origin': allowedOrigin } : {}),
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
    'x-content-type-options': 'nosniff',
  }
  response.writeHead(status, headers)
  if (status === 204) {
    response.end()
    return
  }
  response.end(JSON.stringify(payload))
}

async function readJson(request) {
  let size = 0
  const chunks = []
  for await (const chunk of request) {
    size += chunk.length
    if (size > 4096) throw Object.assign(new Error('Request body is too large.'), { status: 413 })
    chunks.push(chunk)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw Object.assign(new Error('Request body must be valid JSON.'), { status: 400 })
  }
}

function checkRateLimit(address) {
  const now = Date.now()
  const current = requestCounts.get(address)
  if (!current || current.expiresAt <= now) {
    requestCounts.set(address, { count: 1, expiresAt: now + rateLimitWindowMs })
    return true
  }
  current.count += 1
  return current.count <= maxRequestsPerWindow
}

function createRoomCode() {
  return randomBytes(5).toString('hex').toUpperCase()
}

function normalizeDisplayName(value) {
  if (typeof value !== 'string') return ''
  return value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 32)
}

async function createParticipantToken(code, displayName) {
  const token = new AccessToken(apiKey, apiSecret, {
    identity: randomUUID(),
    name: displayName,
    ttl: '15m',
  })
  token.addGrant({
    roomJoin: true,
    room: code,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  })
  return token.toJwt()
}

async function createRoom(displayName) {
  let code
  for (let attempt = 0; attempt < 3; attempt += 1) {
    code = createRoomCode()
    const existing = await liveKit.room.listRooms([code])
    if (existing.length === 0) break
    code = undefined
  }
  if (!code) throw new Error('Could not allocate a room code.')

  await liveKit.room.createRoom({
    name: code,
    maxParticipants,
    emptyTimeout: 300,
  })
  return { code, token: await createParticipantToken(code, displayName), livekitUrl: liveKitWsUrl }
}

async function joinRoom(code, displayName) {
  const rooms = await liveKit.room.listRooms([code])
  if (rooms.length === 0) return { status: 404, error: 'Room not found or already closed.' }
  const participants = await liveKit.room.listParticipants(code)
  if (participants.length >= maxParticipants) return { status: 409, error: 'Room is full.' }
  return { status: 200, payload: { code, token: await createParticipantToken(code, displayName), livekitUrl: liveKitWsUrl } }
}

function normalizeUserName(value) {
  if (typeof value !== 'string') return ''
  return value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 32)
}

function getBearerToken(request) {
  const authorization = request.headers.authorization || ''
  return authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
}

function getSocialUser(request) {
  const userId = socialTokens.get(getBearerToken(request))
  return userId ? socialUsers.get(userId) : undefined
}

function publicUser(user) {
  return user ? { id: user.id, name: user.name } : undefined
}

function socialState(user) {
  const friends = [...user.friendIds].map((id) => socialUsers.get(id)).filter(Boolean).map(publicUser)
  const pending = [...socialFriendRequests.values()]
    .filter((request) => request.toId === user.id && request.status === 'pending')
    .map((request) => ({ id: request.id, from: publicUser(socialUsers.get(request.fromId)) }))
  const groups = [...socialGroups.values()]
    .filter((group) => group.memberIds.includes(user.id))
    .map((group) => ({
      id: group.id,
      name: group.name,
      members: group.memberIds.map((id) => socialUsers.get(id)).filter(Boolean).map(publicUser),
    }))
  return {
    user: publicUser(user),
    friends,
    pending,
    groups,
    users: [...socialUsers.values()].filter((candidate) => candidate.id !== user.id).map(publicUser),
  }
}

async function handleSocialRequest(request, response) {
  const url = new URL(request.url, 'http://localhost')
  if (!url.pathname.startsWith('/api/social')) return undefined
  const address = request.socket.remoteAddress || 'unknown'
  if (!checkRateLimit(address)) {
    sendJson(response, 429, { error: 'Too many requests. Try again shortly.' })
    return true
  }

  try {
    if (request.method === 'POST' && url.pathname === '/api/social/register') {
      const body = await readJson(request)
      const name = normalizeUserName(body.name)
      if (!name) throw Object.assign(new Error('Enter a display name.'), { status: 400 })
      const existing = [...socialUsers.values()].find((user) => user.name.toLowerCase() === name.toLowerCase())
      if (existing) throw Object.assign(new Error('That display name is already in use.'), { status: 409 })
      const id = randomUUID()
      const token = randomBytes(32).toString('hex')
      socialUsers.set(id, { id, name, friendIds: new Set() })
      socialTokens.set(token, id)
      sendJson(response, 201, { token, ...publicUser(socialUsers.get(id)) })
      return true
    }

    const user = getSocialUser(request)
    if (!user) {
      sendJson(response, 401, { error: 'Sign in again.' })
      return true
    }
    if (request.method === 'GET' && url.pathname === '/api/social/state') {
      sendJson(response, 200, socialState(user))
      return true
    }
    if (request.method === 'POST' && url.pathname === '/api/social/friends/request') {
      const { userId } = await readJson(request)
      const target = socialUsers.get(userId)
      if (!target || target.id === user.id) throw Object.assign(new Error('Choose another user.'), { status: 400 })
      const duplicate = [...socialFriendRequests.values()].some((item) =>
        item.status === 'pending' && ((item.fromId === user.id && item.toId === target.id) || (item.fromId === target.id && item.toId === user.id)))
      if (duplicate || user.friendIds.has(target.id)) throw Object.assign(new Error('Friend request already exists.'), { status: 409 })
      const id = randomUUID()
      socialFriendRequests.set(id, { id, fromId: user.id, toId: target.id, status: 'pending' })
      sendJson(response, 201, { id })
      return true
    }
    if (request.method === 'POST' && url.pathname === '/api/social/friends/respond') {
      const { requestId, accept } = await readJson(request)
      const friendship = socialFriendRequests.get(requestId)
      if (!friendship || friendship.toId !== user.id || friendship.status !== 'pending') throw Object.assign(new Error('Friend request not found.'), { status: 404 })
      friendship.status = accept ? 'accepted' : 'declined'
      if (accept) {
        socialUsers.get(friendship.fromId).friendIds.add(user.id)
        user.friendIds.add(friendship.fromId)
      }
      sendJson(response, 200, { ok: true })
      return true
    }
    if (request.method === 'POST' && url.pathname === '/api/social/groups') {
      const body = await readJson(request)
      const name = normalizeUserName(body.name)
      const memberIds = Array.isArray(body.memberIds)
        ? [...new Set([user.id, ...body.memberIds.map(String)])].filter((id) => socialUsers.has(id))
        : [user.id]
      if (!name || memberIds.length < 2) throw Object.assign(new Error('Enter a group name and select a member.'), { status: 400 })
      const id = randomUUID()
      socialGroups.set(id, { id, name, memberIds })
      sendJson(response, 201, { id, name })
      return true
    }
    if (request.method === 'POST' && url.pathname === '/api/social/groups/invite') {
      const { groupId, userId } = await readJson(request)
      const group = socialGroups.get(groupId)
      if (!group || !group.memberIds.includes(user.id)) throw Object.assign(new Error('Group not found.'), { status: 404 })
      if (!socialUsers.has(userId)) throw Object.assign(new Error('User not found.'), { status: 404 })
      if (!group.memberIds.includes(userId)) group.memberIds.push(userId)
      sendJson(response, 200, { ok: true })
      return true
    }
    if (request.method === 'POST' && url.pathname === '/api/social/messages') {
      const body = await readJson(request)
      const text = typeof body.text === 'string' ? body.text.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 2000) : ''
      const conversationType = body.conversationType === 'group' ? 'group' : 'private'
      const conversationId = typeof body.conversationId === 'string' ? body.conversationId : ''
      if (!text || !conversationId) throw Object.assign(new Error('Enter a message and conversation.'), { status: 400 })
      if (conversationType === 'group') {
        const group = socialGroups.get(conversationId)
        if (!group?.memberIds.includes(user.id)) throw Object.assign(new Error('Group not found.'), { status: 404 })
      } else if (!user.friendIds.has(conversationId)) throw Object.assign(new Error('Private chat is available only between friends.'), { status: 403 })
      const message = { id: randomUUID(), conversationType, conversationId, fromId: user.id, fromName: user.name, text, createdAt: Date.now() }
      socialMessages.push(message)
      while (socialMessages.length > 5000) socialMessages.shift()
      sendJson(response, 201, message)
      return true
    }
    if (request.method === 'GET' && url.pathname === '/api/social/messages') {
      const conversationType = url.searchParams.get('type') === 'group' ? 'group' : 'private'
      const conversationId = url.searchParams.get('conversation') || ''
      const after = Number(url.searchParams.get('after') || 0)
      if (conversationType === 'group') {
        const group = socialGroups.get(conversationId)
        if (!group?.memberIds.includes(user.id)) throw Object.assign(new Error('Group not found.'), { status: 404 })
      } else if (!user.friendIds.has(conversationId)) throw Object.assign(new Error('Private chat is available only between friends.'), { status: 403 })
      const messages = socialMessages.filter((message) =>
        message.conversationType === conversationType && message.conversationId === conversationId && message.createdAt > after)
      sendJson(response, 200, { messages })
      return true
    }
    sendJson(response, 404, { error: 'Not found.' })
    return true
  } catch (error) {
    const status = Number(error?.status) || 502
    if (status < 500) sendJson(response, status, { error: error.message })
    else {
      console.error('Moon social request failed:', error instanceof Error ? error.message : 'Unknown error')
      sendJson(response, 502, { error: 'Social service is temporarily unavailable.' })
    }
    return true
  }
}

async function handleRequest(request, response) {
  if (request.method === 'OPTIONS') return sendJson(response, 204, {})
  if (request.method === 'GET' && request.url === '/health') return sendJson(response, 200, { status: 'ok' })
  const socialResponse = await handleSocialRequest(request, response)
  if (socialResponse) return socialResponse
  if (request.method !== 'POST' || !['/api/rooms', '/api/rooms/join'].includes(request.url)) {
    return sendJson(response, 404, { error: 'Not found.' })
  }

  const address = request.socket.remoteAddress || 'unknown'
  if (!checkRateLimit(address)) return sendJson(response, 429, { error: 'Too many requests. Try again shortly.' })

  try {
    const body = await readJson(request)
    const displayName = normalizeDisplayName(body.displayName)
    if (!displayName) return sendJson(response, 400, { error: 'Enter a display name.' })

    if (request.url === '/api/rooms') {
      return sendJson(response, 201, await createRoom(displayName))
    }

    const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : ''
    if (!/^[A-F0-9]{10}$/.test(code)) return sendJson(response, 400, { error: 'Enter a valid 10-character invite code.' })
    const result = await joinRoom(code, displayName)
    if (result.status !== 200) return sendJson(response, result.status, { error: result.error })
    return sendJson(response, 200, result.payload)
  } catch (error) {
    const status = Number(error?.status) || 502
    if (status < 500) return sendJson(response, status, { error: error.message })
    console.error('LiveKit request failed:', error instanceof Error ? error.message : 'Unknown error')
    return sendJson(response, 502, { error: 'Voice service is temporarily unavailable.' })
  }
}

const server = createServer((request, response) => {
  void handleRequest(request, response)
})

server.listen(port, '0.0.0.0', () => {
  console.log(`Moon Voice Room service listening on port ${port}`)
})
