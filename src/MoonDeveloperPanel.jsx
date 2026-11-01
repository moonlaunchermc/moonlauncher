import { useState } from 'react';

const API_URL = 'https://api.alwination.id';

export default function MoonDeveloperPanel() {
  const [key, setKey] = useState('');
  const [token, setToken] = useState('');
  const [uuid, setUuid] = useState('');
  const [nickname, setNickname] = useState('');
  const [title, setTitle] = useState('');
  const [prefix, setPrefix] = useState('');
  const [message, setMessage] = useState('');

  async function request(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Permintaan server gagal.');
    return result;
  }

  async function login(event) {
    event.preventDefault();
    try {
      const result = await request('/v1/developer/login', { method: 'POST', body: JSON.stringify({ key }) });
      setToken(result.token);
      setKey('');
      setMessage('Panel developer aktif.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function save(event) {
    event.preventDefault();
    try {
      await request('/v1/profiles', {
        method: 'POST',
        body: JSON.stringify({ uuid, nickname, title, prefix }),
      });
      setUuid('');
      setNickname('');
      setTitle('');
      setPrefix('');
      setMessage('Title berhasil disimpan.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  if (!token) {
    return <div className="page simple-page"><form className="moon-developer-card" onSubmit={login}>
      <div className="section-kicker">MOON DEVELOPER</div><h1>Developer Panel</h1>
      <label>Developer key<input type="password" value={key} onChange={(event) => setKey(event.target.value)} /></label>
      <button className="install-button" type="submit">Masuk panel</button>{message && <p>{message}</p>}
    </form></div>;
  }

  return <div className="page simple-page"><form className="moon-developer-card" onSubmit={save}>
    <div className="section-kicker">MOON DEVELOPER</div><h1>Atur title akun</h1>
    <label>Nickname<input value={nickname} maxLength={16} onChange={(event) => setNickname(event.target.value)} /></label>
    <label>UUID Ely/Minecraft<input value={uuid} onChange={(event) => setUuid(event.target.value)} /></label>
    <label>Title<input value={title} maxLength={32} onChange={(event) => setTitle(event.target.value)} /></label>
    <label>LuckPerms prefix<input value={prefix} maxLength={64} onChange={(event) => setPrefix(event.target.value)} /></label>
    <button className="install-button" type="submit">Simpan title</button>{message && <p>{message}</p>}
  </form></div>;
}
