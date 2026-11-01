<template>
  <section class="moon-developer-panel">
    <header>
      <div>
        <h2>Moon Developer Panel</h2>
        <p>Atur title akun berdasarkan nickname dan UUID Ely/Minecraft.</p>
      </div>
    </header>

    <form v-if="!token" @submit.prevent="login">
      <label>Developer key<input v-model="key" type="password" autocomplete="current-password" /></label>
      <button type="submit" :disabled="!key">Masuk</button>
    </form>

    <template v-else>
      <form class="moon-developer-panel__form" @submit.prevent="save">
        <label>Nickname<input v-model="nickname" maxlength="16" /></label>
        <label>UUID akun Ely/Minecraft<input v-model="uuid" placeholder="Tanpa tanda strip" /></label>
        <label>Title<input v-model="title" maxlength="32" placeholder="Developer, Owner, Staff" /></label>
        <label>LuckPerms prefix<input v-model="prefix" maxlength="64" placeholder="[Developer] " /></label>
        <button type="submit">Simpan title</button>
      </form>
      <table>
        <thead><tr><th>Nickname</th><th>UUID</th><th>Title</th><th>Prefix</th></tr></thead>
        <tbody><tr v-for="profile in profiles" :key="profile.uuid"><td>{{ profile.nickname }}</td><td>{{ profile.uuid }}</td><td>{{ profile.title }}</td><td>{{ profile.prefix }}</td></tr></tbody>
      </table>
    </template>
    <p v-if="error" role="alert">{{ error }}</p>
  </section>
</template>

<script setup lang="ts">
const apiUrl = ref('https://api.alwination.id')
const token = ref('')
const key = ref('')
const nickname = ref('')
const uuid = ref('')
const title = ref('')
const prefix = ref('')
const profiles = ref([])
const error = ref('')

async function api(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {})
  headers.set('content-type', 'application/json')
  if (token.value) headers.set('authorization', `Bearer ${token.value}`)
  const response = await fetch(`${apiUrl.value}${path}`, { ...options, headers })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || `Server returned ${response.status}`)
  return result
}

async function login() {
  try {
    const result = await api('/v1/developer/login', { method: 'POST', body: JSON.stringify({ key: key.value }) })
    token.value = result.token
    key.value = ''
    await refresh()
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Developer login gagal.'
  }
}

async function refresh() {
  try {
    const result = await api('/v1/profiles')
    profiles.value = result.profiles
    error.value = ''
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Daftar title gagal dimuat.'
  }
}

async function save() {
  try {
    await api('/v1/profiles', {
      method: 'POST',
      body: JSON.stringify({ nickname: nickname.value, uuid: uuid.value, title: title.value, prefix: prefix.value }),
    })
    nickname.value = ''
    uuid.value = ''
    title.value = ''
    prefix.value = ''
    await refresh()
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Title gagal disimpan.'
  }
}
</script>

<style scoped>
.moon-developer-panel { display: grid; gap: 16px; padding: 18px; }
.moon-developer-panel form { display: grid; gap: 10px; max-width: 520px; }
.moon-developer-panel__form { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.moon-developer-panel label { display: grid; gap: 5px; }
.moon-developer-panel input { min-height: 38px; }
.moon-developer-panel button { min-height: 38px; }
.moon-developer-panel table { width: 100%; border-collapse: collapse; }
.moon-developer-panel th, .moon-developer-panel td { padding: 8px; border-bottom: 1px solid rgba(var(--v-theme-on-surface), .12); text-align: left; }
</style>
