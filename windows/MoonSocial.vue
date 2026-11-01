<template>
  <section class="moon-social">
    <header>
      <div>
        <h2>Friends & Groups</h2>
        <p>Chat, invite friends, and start private calls.</p>
      </div>
      <button v-if="!account" type="button" @click="login">Sign in to Moon Social</button>
      <strong v-else>{{ account.name }}</strong>
    </header>

    <div v-if="account" class="moon-social__grid">
      <aside>
        <label>Moon Social server<input v-model="serviceUrl" placeholder="https://voice.example.com" /></label>
        <h3>Friends</h3>
        <button v-for="friend in state.friends" :key="friend.id" :class="{ active: conversation.type === 'private' && conversation.id === friend.id }" @click="openPrivate(friend)">
          {{ friend.name }}
        </button>
        <h3>Groups</h3>
        <button v-for="group in state.groups" :key="group.id" :class="{ active: conversation.type === 'group' && conversation.id === group.id }" @click="openGroup(group)">
          {{ group.name }}
        </button>
        <button class="moon-social__new" type="button" @click="newGroup = true">Create group</button>
      </aside>

      <main>
        <template v-if="conversation.id">
          <div class="moon-social__conversation">
            <strong>{{ conversation.name }}</strong>
            <button type="button" @click="startCall">Start private call</button>
          </div>
          <div class="moon-social__messages">
            <div v-for="message in messages" :key="message.id" :class="{ mine: message.fromId === account.id }">
              <small>{{ message.fromName }}</small>
              <span>{{ message.text }}</span>
            </div>
          </div>
          <form @submit.prevent="sendMessage">
            <input v-model="draft" maxlength="2000" placeholder="Message" />
            <button type="submit">Send</button>
          </form>
        </template>
        <p v-else class="moon-social__empty">Choose a friend or group to chat.</p>
      </main>

      <aside class="moon-social__people">
        <h3>Add people</h3>
        <input v-model="search" placeholder="Search name" />
        <button v-for="person in people" :key="person.id" @click="addFriend(person)">Add {{ person.name }}</button>
        <h3>Requests</h3>
        <div v-for="request in state.pending" :key="request.id">
          <span>{{ request.from.name }}</span>
          <button @click="respond(request.id, true)">Accept</button>
          <button @click="respond(request.id, false)">Decline</button>
        </div>
      </aside>
    </div>

    <div v-if="newGroup" class="moon-social__dialog">
      <h3>Create group</h3>
      <input v-model="groupName" placeholder="Group name" />
      <label v-for="friend in state.friends" :key="friend.id">
        <input v-model="groupMembers" type="checkbox" :value="friend.id" /> {{ friend.name }}
      </label>
      <div><button @click="createGroup">Create</button><button @click="newGroup = false">Cancel</button></div>
    </div>
    <p v-if="error" role="alert">{{ error }}</p>
  </section>
</template>

<script setup lang="ts">
const serviceUrl = ref(localStorage.getItem('moon.social.serviceUrl') || 'https://vannilasmp.my.id')
const account = ref(JSON.parse(localStorage.getItem('moon.social.account') || 'null'))
const state = ref({ friends: [], groups: [], pending: [], users: [] })
const conversation = ref({ type: 'private', id: '', name: '' })
const messages = ref([])
const draft = ref('')
const search = ref('')
const error = ref('')
const newGroup = ref(false)
const groupName = ref('')
const groupMembers = ref([])
let pollTimer: number | undefined

const people = computed(() => state.value.users.filter((person) =>
  !state.value.friends.some((friend) => friend.id === person.id) &&
  person.name.toLowerCase().includes(search.value.trim().toLowerCase())))

async function api(path: string, options: RequestInit = {}) {
  const base = serviceUrl.value.trim().replace(/\/+$/, '')
  localStorage.setItem('moon.social.serviceUrl', base)
  const headers = new Headers(options.headers || {})
  headers.set('content-type', 'application/json')
  if (account.value?.token) headers.set('authorization', `Bearer ${account.value.token}`)
  const response = await fetch(`${base}${path}`, { ...options, headers })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || `Request failed (${response.status})`)
  return result
}

async function login() {
  try {
    const name = window.prompt('Choose your Moon Social name:')
    if (!name) return
    account.value = await api('/api/social/register', { method: 'POST', body: JSON.stringify({ name }) })
    localStorage.setItem('moon.social.account', JSON.stringify(account.value))
    await refresh()
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Could not sign in.'
  }
}

async function refresh() {
  if (!account.value) return
  try {
    state.value = await api('/api/social/state')
    await loadMessages()
    error.value = ''
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Could not refresh.'
  }
}

async function loadMessages() {
  if (!conversation.value.id) return
  try {
    const after = messages.value.at(-1)?.createdAt || 0
    const result = await api(`/api/social/messages?type=${conversation.value.type}&conversation=${encodeURIComponent(conversation.value.id)}&after=${after}`)
    if (result.messages.length) messages.value.push(...result.messages)
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Could not load messages.'
  }
}

function openPrivate(friend) {
  conversation.value = { type: 'private', id: friend.id, name: friend.name }
  messages.value = []
  void loadMessages()
}

function openGroup(group) {
  conversation.value = { type: 'group', id: group.id, name: group.name }
  messages.value = []
  void loadMessages()
}

async function sendMessage() {
  if (!draft.value.trim() || !conversation.value.id) return
  try {
    const message = await api('/api/social/messages', {
      method: 'POST',
      body: JSON.stringify({ conversationType: conversation.value.type, conversationId: conversation.value.id, text: draft.value }),
    })
    messages.value.push(message)
    draft.value = ''
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Could not send message.'
  }
}

async function addFriend(person) {
  await api('/api/social/friends/request', { method: 'POST', body: JSON.stringify({ userId: person.id }) })
  await refresh()
}

async function respond(requestId: string, accept: boolean) {
  await api('/api/social/friends/respond', { method: 'POST', body: JSON.stringify({ requestId, accept }) })
  await refresh()
}

async function createGroup() {
  await api('/api/social/groups', { method: 'POST', body: JSON.stringify({ name: groupName.value, memberIds: groupMembers.value }) })
  groupName.value = ''
  groupMembers.value = []
  newGroup.value = false
  await refresh()
}

async function startCall() {
  const result = await api('/api/rooms', { method: 'POST', body: JSON.stringify({ displayName: account.value.name }) })
  await navigator.clipboard.writeText(result.code)
  await api('/api/social/messages', {
    method: 'POST',
    body: JSON.stringify({
      conversationType: conversation.value.type,
      conversationId: conversation.value.id,
      text: `Moon call invite: ${result.code}`,
    }),
  })
  window.prompt('Call room code (copied to clipboard). Share this code with the people you want to call:', result.code)
}

onMounted(() => {
  void refresh()
  pollTimer = window.setInterval(() => void refresh(), 2000)
})
onBeforeUnmount(() => {
  if (pollTimer) window.clearInterval(pollTimer)
})
</script>

<style scoped>
.moon-social { padding: 18px; border: 1px solid rgba(var(--v-theme-on-surface), .14); border-radius: 6px; }
.moon-social header, .moon-social__conversation, .moon-social form { display: flex; align-items: center; gap: 10px; }
.moon-social header { justify-content: space-between; }
.moon-social h2 { margin: 0; }
.moon-social__grid { display: grid; grid-template-columns: 180px minmax(240px, 1fr) 220px; gap: 12px; margin-top: 16px; min-height: 360px; }
.moon-social aside, .moon-social main { padding: 12px; border: 1px solid rgba(var(--v-theme-on-surface), .12); border-radius: 6px; }
.moon-social aside { display: flex; flex-direction: column; gap: 7px; }
.moon-social button, .moon-social input { min-height: 34px; border-radius: 4px; }
.moon-social button.active { border-color: rgb(var(--v-theme-primary)); }
.moon-social__messages { display: flex; flex-direction: column; gap: 8px; height: 260px; overflow-y: auto; padding: 12px 0; }
.moon-social__messages div { display: grid; width: fit-content; max-width: 80%; padding: 7px 10px; border-radius: 6px; background: rgba(var(--v-theme-on-surface), .08); }
.moon-social__messages div.mine { align-self: flex-end; background: rgba(var(--v-theme-primary), .18); }
.moon-social__messages small { opacity: .72; }
.moon-social form { position: sticky; bottom: 0; }
.moon-social form input { flex: 1; }
.moon-social__dialog { position: fixed; z-index: 10; right: 24px; bottom: 24px; display: grid; gap: 8px; min-width: 280px; padding: 16px; background: rgb(var(--v-theme-surface)); border: 1px solid rgba(var(--v-theme-on-surface), .18); border-radius: 8px; box-shadow: 0 12px 40px rgba(0,0,0,.3); }
.moon-social__empty { opacity: .65; }
@media (max-width: 900px) { .moon-social__grid { grid-template-columns: 160px 1fr; } .moon-social__people { grid-column: 1 / -1; } }
</style>
