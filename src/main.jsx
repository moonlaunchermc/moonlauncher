import { useEffect, useState } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { createRoot } from 'react-dom/client';
import moonLogo from './assets/moon-logo.png';
import DownloadPortal from './DownloadPortal.jsx';
import { exportMoonDatabase, getMoonDatabase, importMoonDatabase, setMoonSetting, updateMoonDatabase } from './moonDatabase.js';
import {
  ArrowDownToLine, ArrowLeft, ArrowUpRight, Blocks, Check, ChevronDown,
  CircleHelp, Compass, Cpu, Download, Gamepad2, HardDrive, Layers3, LoaderCircle,
  LogOut, Plus, Search, Settings2, ShieldCheck, Sparkles,
  UserRound, X
} from 'lucide-react';
import './styles.css';

const pages = [
  { id: 'home', label: 'Beranda', icon: Gamepad2 },
  { id: 'mods', label: 'Jelajahi mod', icon: Compass },
  { id: 'instances', label: 'Instalasi', icon: Layers3 },
];

const fallbackMinecraftVersions = ['1.21.4', '1.21.1', '1.20.1', '1.19.4'];
const modLoaders = ['Fabric', 'Forge', 'NeoForge'];
const contentTypes = [
  { id: 'mod', label: 'Mod' },
  { id: 'modpack', label: 'Modpack' },
  { id: 'resourcepack', label: 'Resource pack' },
  { id: 'shader', label: 'Shader' },
  { id: 'datapack', label: 'Data pack' },
  { id: 'world', label: 'World' },
];
const NoomAndroid = registerPlugin('NoomAndroid');
const isNativePlatform = Capacitor.isNativePlatform();
if (!isNativePlatform) document.documentElement.classList.add('download-portal');

function App() {
  const [page, setPage] = useState('home');
  const [initialDatabase] = useState(() => getMoonDatabase());
  const [initialVersion] = useState(() => initialDatabase.minecraftVersion || '');
  const [version, setVersion] = useState(initialVersion || fallbackMinecraftVersions[0]);
  const [minecraftVersions, setMinecraftVersions] = useState(fallbackMinecraftVersions);
  const [versionsLoading, setVersionsLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [query, setQuery] = useState('');
  const [loader, setLoader] = useState(modLoaders[0]);
  const [contentType, setContentType] = useState('mod');
  const [mods, setMods] = useState([]);
  const [modsLoading, setModsLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [modsFolderConfigured, setModsFolderConfigured] = useState(false);
  const [offlineProfiles, setOfflineProfiles] = useState(() => initialDatabase.profiles);
  const [activeOfflineProfile, setActiveOfflineProfile] = useState(() => initialDatabase.activeOfflineProfile);

  useEffect(() => {
    updateMoonDatabase((database) => ({ ...database, profiles: offlineProfiles }));
  }, [offlineProfiles]);

  useEffect(() => {
    updateMoonDatabase((database) => ({ ...database, activeOfflineProfile }));
  }, [activeOfflineProfile]);

  useEffect(() => {
    let cancelled = false;
    fetch('https://launchermeta.mojang.com/mc/game/version_manifest_v2.json')
      .then((response) => {
        if (!response.ok) throw new Error('Manifest versi Minecraft tidak tersedia.');
        return response.json();
      })
      .then((manifest) => {
        if (cancelled) return;
        const versions = manifest.versions?.map((entry) => entry.id).filter(Boolean) ?? [];
        if (versions.length === 0) throw new Error('Manifest versi Minecraft kosong.');
        setMinecraftVersions(versions);
        setVersion((current) => {
          if (initialVersion && versions.includes(initialVersion)) return initialVersion;
          if (versions.includes(manifest.latest?.release)) return manifest.latest.release;
          return versions.includes(current) ? current : versions[0];
        });
      })
      .catch(() => {
        if (!cancelled) {
          const fallback = initialVersion && !fallbackMinecraftVersions.includes(initialVersion)
            ? [initialVersion, ...fallbackMinecraftVersions]
            : fallbackMinecraftVersions;
          setMinecraftVersions(fallback);
          setVersion(initialVersion || fallback[0]);
        }
      })
      .finally(() => { if (!cancelled) setVersionsLoading(false); });
    return () => { cancelled = true; };
  }, [initialVersion]);

  useEffect(() => {
    if (version) {
      updateMoonDatabase((database) => ({ ...database, minecraftVersion: version }));
    }
  }, [version]);

  useEffect(() => {
    NoomAndroid.getModsFolder().then((result) => setModsFolderConfigured(result.configured)).catch(() => {});
  }, []);

  useEffect(() => {
    if (page !== 'mods') return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setModsLoading(true);
      try {
        const facets = [[`project_type:${contentType}`]];
        if (contentType === 'mod' || contentType === 'modpack') facets.push([`categories:${loader.toLowerCase()}`]);
        const params = new URLSearchParams({
          query,
          limit: '20',
          facets: JSON.stringify(facets),
          index: 'downloads',
        });
        const response = await fetch(`https://api.modrinth.com/v2/search?${params}`);
        if (!response.ok) throw new Error('Tidak dapat memuat katalog Modrinth.');
        const result = await response.json();
        if (!cancelled) setMods(result.hits ?? []);
      } catch (error) {
        if (!cancelled) setStatus(error.message);
      } finally {
        if (!cancelled) setModsLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [page, query, loader, contentType]);

  function openGame() {
    setStatus('Shell web lama tidak menjalankan Minecraft. Gunakan APK Moon Android standalone.');
  }

  async function addMod(mod) {
    setStatus(`Memasang ${mod.title}...`);
    try {
      const result = await NoomAndroid.installMod({ projectId: mod.project_id, version, loader });
      setStatus(result.message);
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function downloadContent(project) {
    if (contentType === 'mod') {
      await addMod(project);
      return;
    }
    setDownloadingId(project.project_id);
    setStatus(`Mencari berkas ${project.title} untuk Minecraft ${version}...`);
    try {
      const params = new URLSearchParams({ game_versions: JSON.stringify([version]) });
      if (contentType === 'modpack') params.set('loaders', JSON.stringify([loader.toLowerCase()]));
      const response = await fetch(`https://api.modrinth.com/v2/project/${encodeURIComponent(project.project_id)}/version?${params}`);
      if (!response.ok) throw new Error('Tidak dapat memuat versi konten dari Modrinth.');
      const versions = await response.json();
      const compatibleVersion = versions.find((item) => item.files?.some((file) => file.primary)) || versions[0];
      const file = compatibleVersion?.files?.find((item) => item.primary) || compatibleVersion?.files?.[0];
      if (!file?.url || !file.filename) throw new Error(`Tidak ada berkas ${contentTypes.find((item) => item.id === contentType)?.label.toLowerCase()} untuk Minecraft ${version}.`);
      setStatus(`Menyiapkan unduhan ${file.filename}...`);
      const result = await NoomAndroid.saveDownload({ url: file.url, filename: file.filename });
      setStatus(result.message);
    } catch (error) {
      setStatus(error.message || 'Unduhan gagal.');
    } finally {
      setDownloadingId('');
    }
  }

  function connectAccount(type) {
    if (type === 'elyby') {
      setStatus('Login Ely.by belum tersedia di Moon Launcher.');
      return;
    }
    setStatus('Login Microsoft tersedia di APK Moon Android standalone.');
  }

  function createOfflineProfile(username) {
    const name = username.trim();
    if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) {
      setStatus('Nama profil harus 3-16 karakter: huruf, angka, atau garis bawah.');
      return;
    }
    if (offlineProfiles.some((profile) => profile.name.toLowerCase() === name.toLowerCase())) {
      setStatus('Profil dengan nama tersebut sudah ada.');
      return;
    }
    const profile = { id: name.toLowerCase(), name };
    setOfflineProfiles((current) => [...current, profile]);
    setActiveOfflineProfile(profile.id);
    setStatus(`Profil offline ${name} disimpan di aplikasi ini.`);
  }

  async function chooseModsFolder() {
    try {
      const result = await NoomAndroid.chooseModsFolder();
      setModsFolderConfigured(result.configured);
      setStatus('Folder dipilih untuk pemasangan mod. Pastikan ini folder mods game yang aktif.');
    } catch (error) {
      setStatus(error.message);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => setPage('home')} aria-label="Moon Launcher beranda">
          <img className="brand-mark" src={moonLogo} alt="" />
          <span className="brand-name">moon<span>.</span></span>
        </button>
        <div className="side-caption">MAIN MENU</div>
        <nav className="nav-list" aria-label="Menu utama">
          {pages.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${page === id ? 'active' : ''}`} onClick={() => { setPage(id); setStatus(''); }}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
              {id === 'mods' && <span className="nav-new">BARU</span>}
            </button>
          ))}
        </nav>
        <div className="side-caption library-caption">PERPUSTAKAAN</div>
        <button className="nav-item subdued" onClick={() => setPage('instances')}>
          <HardDrive size={18} strokeWidth={1.8} /><span>Versi game</span>
        </button>
        <div className="sidebar-bottom">
          <div className="storage-row"><span><HardDrive size={14} /> Penyimpanan</span><strong>—</strong></div>
          <div className="storage-track"><span /></div>
          <button className="nav-item settings-link" onClick={() => setPage('settings')}>
            <Settings2 size={18} strokeWidth={1.8} /><span>Pengaturan</span>
          </button>
          <div className="sidebar-version">MOON LAUNCHER <span>v1.2.0</span></div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="breadcrumb"><span>MOON</span><span className="crumb-slash">/</span><strong>{page === 'home' ? 'BERANDA' : page === 'mods' ? 'JELAJAHI MOD' : page === 'settings' ? 'PENGATURAN' : 'INSTALASI'}</strong></div>
          <div className="top-actions">
            <button className="icon-button help-button" title="Bantuan"><CircleHelp size={17} /></button>
            <span className="top-divider" />
            <button className="profile-button" onClick={() => { setStatus(''); setModal(true); }}>
              <span className="avatar"><UserRound size={15} /></span>
              <span className="profile-copy"><strong>{offlineProfiles.find((profile) => profile.id === activeOfflineProfile)?.name || 'Belum ada akun'}</strong><small>{activeOfflineProfile ? 'PROFIL OFFLINE MOON' : 'PILIH PROFIL'}</small></span>
              <ChevronDown size={15} />
            </button>
          </div>
        </header>

        {page === 'home' && <HomePage version={version} setVersion={setVersion} versions={minecraftVersions} versionsLoading={versionsLoading} onPlay={openGame} busy={busy} setPage={setPage} status={status} />}
        {page === 'mods' && <ModsPage query={query} setQuery={setQuery} loader={loader} version={version} setVersion={setVersion} versions={minecraftVersions} versionsLoading={versionsLoading} contentType={contentType} setContentType={setContentType} mods={mods} loading={modsLoading} downloadingId={downloadingId} onDownload={downloadContent} status={status} />}
        {page === 'instances' && <InstancesPage onOpenGame={openGame} />}
        {page === 'settings' && <SettingsPage onChooseModsFolder={chooseModsFolder} modsFolderConfigured={modsFolderConfigured} onOpenGame={openGame} />}
      </main>

      {modal && <AccountModal onClose={() => setModal(false)} onConnect={connectAccount} onCreateOffline={createOfflineProfile} profiles={offlineProfiles} activeProfile={activeOfflineProfile} onSelectProfile={setActiveOfflineProfile} status={status} />}
      {status && !modal && <div className="toast" role="status"><span>{status}</span><button onClick={() => setStatus('')} aria-label="Tutup"><X size={15} /></button></div>}
    </div>
  );
}

function HomePage({ version, setVersion, versions, versionsLoading, onPlay, busy, setPage, status }) {
  return (
    <div className="page home-page">
      <section className="hero">
        <div className="hero-image" />
        <div className="hero-content">
          <div className="eyebrow"><span className="live-dot" /> MINECRAFT JAVA <span className="eyebrow-sep">/</span> MOON STANDALONE</div>
          <h1>Dunia baru<br /><em>menunggumu.</em></h1>
          <p>Tempat semua petualangan Minecraft-mu dimulai.</p>
          <div className="hero-controls">
            <button className="play-button" onClick={onPlay} disabled={busy}>
              {busy ? <LoaderCircle className="spin" size={19} /> : <Gamepad2 size={19} />}
              <span>{busy ? 'MEMBUKA...' : 'MAIN MINECRAFT'}</span>
              <span className="play-arrow">↗</span>
            </button>
            <label className="version-select-wrap">
              <span>TARGET MOD</span>
              <select value={version} onChange={(event) => setVersion(event.target.value)} aria-label="Pilih versi Minecraft" disabled={versionsLoading}>
                {versions.map((item) => <option key={item}>{item}</option>)}
              </select>
              <ChevronDown size={14} />
            </label>
          </div>
          <div className="hero-footnote">RUNTIME, AKUN, DAN KONTROL DI MOON</div>
        </div>
        <div className="hero-index">01 <span>/</span> 03</div>
        <span className="hero-coordinate">MOON WORLD · JAVA</span>
      </section>

      <div className="home-lower">
        <section className="news-block">
          <div className="section-heading"><div><span className="section-kicker">DARI KOMUNITAS</span><h2>Temukan cara baru<br />bermain.</h2></div><button className="text-link" onClick={() => setPage('mods')}>JELAJAHI MOD <ArrowUpRight size={15} /></button></div>
          <div className="feature-strip">
            <div className="feature-icon"><Blocks size={21} /></div>
            <div className="feature-copy"><strong>Mod favoritmu, satu tempat.</strong><span>Jelajahi ribuan mod dari Modrinth.</span></div>
            <button className="round-arrow" onClick={() => setPage('mods')} aria-label="Buka katalog mod"><ArrowUpRight size={17} /></button>
          </div>
        </section>
        <section className="status-block">
          <div className="section-kicker">STATUS PELUNCUR</div>
          <div className="status-title"><span className="status-check"><Check size={15} /></span><strong>{busy ? 'Menyiapkan game' : 'Launcher Moon siap'}</strong></div>
          <div className="status-divider" />
          <div className="status-detail"><span>AKUN & GAME</span><strong>Moon standalone</strong></div>
          <div className="status-detail"><span>TARGET MOD</span><strong>{version} <span className="version-type">FABRIC</span></strong></div>
          {status && <div className="inline-status">{status}</div>}
        </section>
      </div>
    </div>
  );
}

function ModsPage({ query, setQuery, loader, version, setVersion, versions, versionsLoading, contentType, setContentType, mods, loading, downloadingId, onDownload, status }) {
  const selectedType = contentTypes.find((item) => item.id === contentType);
  return (
    <div className="page mods-page">
      <div className="page-title-row"><div><div className="section-kicker">MODRINTH · MINECRAFT JAVA</div><h1>Jelajahi konten</h1><p>Mod, modpack, resource pack, shader, data pack, dan world.</p></div><div className="mod-count">{loading ? 'MEMUAT...' : `${mods.length} HASIL`}</div></div>
      <div className="mod-toolbar">
        <label className="search-field"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari mod, pembuat, atau koleksi..." /><kbd>⌘ K</kbd></label>
        <label className="filter-select type-filter"><Blocks size={16} /><select value={contentType} onChange={(event) => setContentType(event.target.value)} aria-label="Pilih jenis konten">{contentTypes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><ChevronDown size={14} /></label>
        {(contentType === 'mod' || contentType === 'modpack') && <label className="filter-select loader-filter"><Cpu size={16} /><select value={loader} onChange={(event) => setLoader(event.target.value)} aria-label="Pilih mod loader">{modLoaders.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={14} /></label>}
        <label className="filter-select version-filter"><Gamepad2 size={16} /><select value={version} onChange={(event) => setVersion(event.target.value)} aria-label="Pilih versi Minecraft" disabled={versionsLoading}>{versions.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={14} /></label>
      </div>
      {status && <div className="catalog-status">{status}</div>}
      <div className="mod-list">
        {loading && <div className="loading-row"><LoaderCircle className="spin" size={19} /> Memuat mod dari Modrinth...</div>}
        {!loading && mods.map((mod) => (
          <article className="mod-row" key={mod.project_id}>
            <img className="mod-avatar" src={mod.icon_url || ''} alt="" />
            <div className="mod-info"><div className="mod-name-row"><h2>{mod.title}</h2><span className="mod-category">{mod.categories?.[0] ?? 'MOD'}</span></div><p>{mod.description}</p><div className="mod-meta"><span>{mod.author}</span><span className="meta-dot" /><span><Download size={12} /> {Intl.NumberFormat('id-ID', { notation: 'compact' }).format(mod.downloads)}</span><span className="meta-dot" /><span>{mod.follows?.toLocaleString('id-ID')} pengikut</span></div></div>
            <button className="install-button" onClick={() => onDownload(mod)} disabled={downloadingId === mod.project_id} title={`${contentType === 'mod' ? 'Pasang' : 'Unduh'} ${mod.title}`}>
              {downloadingId === mod.project_id ? <LoaderCircle className="spin" size={17} /> : contentType === 'mod' ? <Plus size={17} /> : <Download size={17} />}
              <span>{downloadingId === mod.project_id ? 'Memproses' : contentType === 'mod' ? 'Pasang' : 'Unduh'}</span>
            </button>
          </article>
        ))}
        {!loading && mods.length === 0 && <div className="empty-results"><Sparkles size={21} /><strong>Belum ada hasil</strong><span>Coba kata pencarian yang berbeda.</span></div>}
      </div>
      <div className="catalog-footer"><ShieldCheck size={15} /><span>{contentType === 'mod' ? `Mod ${loader} dipasang ke folder mods; loader tersebut harus sudah dipasang di Pojav.` : contentType === 'modpack' ? `Modpack ${loader} diunduh sebagai .mrpack dan perlu diimpor ke launcher.` : `${selectedType?.label} diunduh ke lokasi yang kamu pilih.`} Katalog disediakan oleh Modrinth.</span><a href="https://modrinth.com" target="_blank" rel="noreferrer">Modrinth <ArrowUpRight size={12} /></a></div>
    </div>
  );
}

function InstancesPage({ onOpenGame }) {
  return (
    <div className="page simple-page">
      <div className="page-title-row"><div><div className="section-kicker">MINECRAFT JAVA · MOON</div><h1>Instalasi</h1><p>Versi game dan profil dikelola oleh launcher Moon.</p></div><button className="outline-action" onClick={onOpenGame}><ArrowUpRight size={16} /> Main Minecraft</button></div>
      <div className="instance-row"><div className="instance-cover"><Gamepad2 size={25} /></div><div className="instance-main"><strong>Moon Launcher</strong><span>Minecraft Java Edition · Runtime game berada di aplikasi ini</span></div><span className="installed-label"><span className="live-dot" /> ANDROID</span></div>
      <div className="section-line" />
      <div className="setup-note"><Blocks size={19} /><div><strong>Mod melalui katalog Moon</strong><span>Gunakan profil game yang sama saat memasang mod.</span></div><button className="text-link" onClick={onOpenGame}>MAIN GAME <ArrowUpRight size={15} /></button></div>
    </div>
  );
}

function SettingsPage({ onChooseModsFolder, modsFolderConfigured, onOpenGame }) {
  const [settings, setSettings] = useState(() => getMoonDatabase().settings);
  const [settingMessage, setSettingMessage] = useState('');

  function changeSetting(key, value) {
    setMoonSetting(key, value);
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function exportSettings() {
    const blob = new Blob([exportMoonDatabase()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'moon-launcher-settings.json';
    link.click();
    URL.revokeObjectURL(url);
    setSettingMessage('Database Moon berhasil diekspor.');
  }

  async function importSettings(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      importMoonDatabase(await file.text());
      setSettings(getMoonDatabase().settings);
      setSettingMessage('Pengaturan berhasil diimpor. Muat ulang launcher untuk menerapkan semua data.');
    } catch (error) {
      setSettingMessage(error instanceof Error ? error.message : 'File database Moon tidak valid.');
    } finally {
      event.target.value = '';
    }
  }

  return (
    <div className="page simple-page">
      <div className="page-title-row"><div><div className="section-kicker">MOON ANDROID LAUNCHER</div><h1>Pengaturan</h1><p>Atur direktori konten, privasi, jaringan, dan tampilan Moon.</p></div></div>
      <section className="settings-section"><div className="settings-heading"><h2>Folder mod</h2><span>01</span></div><div className="setting-row"><div><strong>{modsFolderConfigured ? 'Folder mods dipilih' : 'Pilih folder mods game'}</strong><span>Pilih folder `mods` yang digunakan profil game Moon.</span></div><button className="outline-action" onClick={onChooseModsFolder}><HardDrive size={15} /> {modsFolderConfigured ? 'Ganti folder' : 'Pilih folder'}</button></div></section>
      <section className="settings-section"><div className="settings-heading"><h2>Tampilan dan suara</h2><span>02</span></div><div className="setting-row"><div><strong>Animasi antarmuka</strong><span>Animasi tombol, loading, dan transisi halaman.</span></div><input className="toggle" type="checkbox" checked={settings.animations !== false} onChange={(event) => changeSetting('animations', event.target.checked)} aria-label="Aktifkan animasi antarmuka" /></div><div className="setting-row"><div><strong>Suara klik</strong><span>Efek audio singkat untuk tindakan antarmuka.</span></div><input className="toggle" type="checkbox" checked={settings.clickSounds === true} onChange={(event) => changeSetting('clickSounds', event.target.checked)} aria-label="Aktifkan suara klik" /></div></section>
      <section className="settings-section"><div className="settings-heading"><h2>Jaringan dan privasi</h2><span>03</span></div><div className="setting-row"><div><strong>Mode hemat bandwidth</strong><span>Batasi unduhan paralel dan refresh katalog.</span></div><input className="toggle" type="checkbox" checked={settings.lowBandwidth === true} onChange={(event) => changeSetting('lowBandwidth', event.target.checked)} aria-label="Aktifkan mode hemat bandwidth" /></div><div className="setting-row"><div><strong>Kirim laporan crash</strong><span>Hanya dengan persetujuan; data sensitif harus dihapus sebelum dikirim.</span></div><input className="toggle" type="checkbox" checked={settings.crashReports === true} onChange={(event) => changeSetting('crashReports', event.target.checked)} aria-label="Izinkan laporan crash" /></div></section>
      <section className="settings-section"><div className="settings-heading"><h2>Data Moon</h2><span>04</span></div><div className="setting-row"><div><strong>Cadangkan atau pulihkan pengaturan</strong><span>Ekspor semua metadata database ke file JSON lokal.</span></div><div className="settings-actions"><button className="outline-action" onClick={exportSettings}><ArrowDownToLine size={15} /> Ekspor</button><label className="outline-action"><ArrowUpRight size={15} /> Impor<input className="visually-hidden" type="file" accept="application/json,.json" onChange={importSettings} /></label></div></div></section>
      <section className="settings-section"><div className="settings-heading"><h2>Akun dan game</h2><span>05</span></div><div className="setting-row"><div><strong>Dikelola di Moon</strong><span>Shell web lama tidak meminta atau meneruskan password akun.</span></div><button className="outline-action" onClick={onOpenGame}><ArrowUpRight size={15} /> Status launcher</button></div></section>
      {settingMessage && <div className="catalog-status" role="status">{settingMessage}</div>}
      <div className="settings-foot"><ShieldCheck size={15} /> Runtime game dan kontrol tersedia di APK Android standalone.</div>
    </div>
  );
}

function AccountModal({ onClose, onConnect, onCreateOffline, profiles, activeProfile, onSelectProfile, status }) {
  const [tab, setTab] = useState('offline');
  const [username, setUsername] = useState('');
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="account-modal" role="dialog" aria-modal="true" aria-labelledby="account-heading">
        <div className="modal-top"><span className="section-kicker">AKUN MINECRAFT</span><button className="icon-button" onClick={onClose} aria-label="Tutup"><X size={19} /></button></div>
        <h2 id="account-heading">Akun game<br />dan profilmu.</h2>
        <div className="account-tabs" role="tablist">
          <button className={tab === 'offline' ? 'selected' : ''} onClick={() => setTab('offline')}>Offline</button>
          <button className={tab === 'microsoft' ? 'selected' : ''} onClick={() => setTab('microsoft')}>Microsoft</button>
          <button className={tab === 'elyby' ? 'selected' : ''} onClick={() => setTab('elyby')}>Ely.by</button>
        </div>
        {tab === 'offline' && <div className="account-form">
          <p>Buat profil offline langsung di Moon. Nama disimpan hanya di perangkat ini; profil offline tidak memberi akses ke server yang mewajibkan akun premium.</p>
          <form onSubmit={(event) => { event.preventDefault(); onCreateOffline(username); }}>
            <label htmlFor="offline-username">NAMA PROFIL</label>
            <input id="offline-username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Contoh: PemainBaru" maxLength={16} autoComplete="off" />
            <button className="modal-submit" type="submit">BUAT PROFIL OFFLINE <Plus size={16} /></button>
          </form>
          {profiles.length > 0 && <div className="offline-profile-list"><span className="section-kicker">PROFIL TERSIMPAN</span>{profiles.map((profile) => <button key={profile.id} className={`offline-profile ${profile.id === activeProfile ? 'selected' : ''}`} onClick={() => onSelectProfile(profile.id)}><UserRound size={15} /><span>{profile.name}</span>{profile.id === activeProfile && <Check size={15} />}</button>)}</div>}
          <div className="account-assurance"><ShieldCheck size={17} /> Profil offline tersimpan di aplikasi</div>
          <p className="account-note">Versi web shell beta belum menjalankan game sendiri. Untuk membuka Minecraft, gunakan APK Moon Android standalone.</p>
        </div>}
        {tab === 'microsoft' && <div className="account-form"><p>Login Microsoft belum dapat dilakukan langsung di Moon web shell. Autentikasi yang aman perlu alur OAuth resmi dan pemeriksaan kepemilikan Minecraft Java Edition.</p><div className="account-assurance"><ShieldCheck size={17} /> Akun harus memiliki Minecraft Java Edition</div><button className="modal-submit" onClick={() => onConnect('microsoft')}>LANJUTKAN DI LAUNCHER ANDROID <ArrowUpRight size={16} /></button></div>}
        {tab === 'elyby' && <div className="account-form"><p>Login Ely.by belum didukung di Moon Launcher. Jangan masukkan kata sandi akun Ely.by di sini.</p><div className="account-assurance warning"><ShieldCheck size={17} /> Login Ely.by belum tersedia</div><button className="modal-submit" onClick={() => onConnect('elyby')}>INFO LOGIN ELY.BY <ShieldCheck size={16} /></button></div>}
        {status && <div className="modal-status">{status}</div>}
        <div className="modal-foot">Akun online tidak pernah disimpan oleh Moon web shell.</div>
      </section>
    </div>
  );
}

export default App;

createRoot(document.getElementById('root')).render(
  isNativePlatform ? <App /> : <DownloadPortal />,
);