import { ArrowDownToLine, ArrowUpRight, Check, ExternalLink, FileCheck2, MonitorDown, ShieldAlert } from 'lucide-react';
import moonLogo from './assets/moon-logo.png';
import './download.css';

const installerPath = 'https://github.com/himamsuper-cpu/la/releases/download/windows-v2.1.2-beta.1/MoonLauncher-v2.1.2-beta.1-x64.exe';
const checksum = 'Dihasilkan saat installer 2.1.2-beta.1 selesai dibangun.';

export default function DownloadPortal() {
  return (
    <div className="download-site">
      <header className="download-header">
        <a className="download-brand" href="#top" aria-label="Moon Launcher home">
          <img src={moonLogo} alt="" />
          <span>MOON<span className="brand-dot">.</span></span>
        </a>
        <nav aria-label="Site navigation">
          <a href="#features">Fitur</a>
          <a href="#requirements">Persyaratan</a>
          <a href="https://github.com/himamsuper-cpu/la" target="_blank" rel="noreferrer">Source <ExternalLink size={14} /></a>
        </nav>
        <a className="header-download" href={installerPath} download>
          <ArrowDownToLine size={16} /> Unduh
        </a>
      </header>

      <main id="top">
        <section className="download-hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <div className="release-label"><span /> MINECRAFT JAVA EDITION <i /> WINDOWS x64</div>
            <h1 id="hero-title">Moon<br /><em>Launcher</em></h1>
            <p className="hero-description">Semua petualangan Minecraft Java-mu, dimulai dari satu launcher.</p>
            <div className="hero-actions">
              <a className="primary-download" href={installerPath} download>
                <ArrowDownToLine size={19} />
                <span><strong>Unduh untuk Windows</strong><small>64-bit · 94 MB · Installer</small></span>
                <ArrowUpRight className="download-arrow" size={18} />
              </a>
              <a className="release-link" href="https://github.com/himamsuper-cpu/la/releases/tag/windows-v2.1.2-beta.1" target="_blank" rel="noreferrer">
                Lihat halaman release <ArrowUpRight size={15} />
              </a>
            </div>
            <div className="hero-footnote"><ShieldAlert size={15} /> Beta unsigned. Windows dapat menampilkan peringatan SmartScreen.</div>
          </div>

          <div className="hero-mark" aria-label="Moon Launcher logo">
            <div className="mark-orbit mark-orbit--one" />
            <div className="mark-orbit mark-orbit--two" />
            <img src={moonLogo} alt="Moon Launcher moon logo" />
            <span className="mark-caption">BUILD YOUR<br />NEXT WORLD</span>
            <span className="mark-coordinate">JAVA / 64</span>
          </div>
          <div className="hero-index">01 <span>/</span> MOON DESKTOP</div>
        </section>

        <section className="release-bar" aria-label="Release status">
          <div><span className="bar-label">VERSI</span><strong>2.1.2-beta.1</strong></div>
          <div><span className="bar-label">PLATFORM</span><strong>Windows 10 / 11 · x64</strong></div>
          <div><span className="bar-label">STATUS</span><strong className="status-ready"><Check size={15} /> Siap diunduh</strong></div>
          <div><span className="bar-label">UKURAN</span><strong>94 MB</strong></div>
        </section>

        <section className="feature-section" id="features">
          <div className="section-intro">
            <span className="section-kicker">DIBUAT UNTUK MINECRAFT JAVA</span>
            <h2>Satu tempat.<br /><em>Banyak kemungkinan.</em></h2>
          </div>
          <div className="feature-list">
            <article className="feature-row">
              <span className="feature-number">01</span><MonitorDown size={21} />
              <div><h3>Mulai langsung dari launcher</h3><p>Pilih instalasi dan jalankan Minecraft Java dari Moon Launcher.</p></div>
            </article>
            <article className="feature-row">
              <span className="feature-number">02</span><FileCheck2 size={21} />
              <div><h3>Kelola konten game</h3><p>Jelajahi mod, modpack, resource pack, shader, dan data pack.</p></div>
            </article>
            <article className="feature-row">
              <span className="feature-number">03</span><Check size={21} />
              <div><h3>Installer x64</h3><p>Build khusus Windows 64-bit. Komponen open-source dicantumkan di release.</p></div>
            </article>
          </div>
        </section>

        <section className="requirements" id="requirements">
          <div><span className="section-kicker">SEBELUM MEMASANG</span><h2>Persyaratan sistem</h2></div>
          <dl>
            <div><dt>Sistem operasi</dt><dd>Windows 10 versi 1903+ atau Windows 11</dd></div>
            <div><dt>Arsitektur</dt><dd>x64 · 64-bit</dd></div>
            <div><dt>Lisensi</dt><dd>Komponen pihak ketiga tercantum di release</dd></div>
          </dl>
        </section>

        <details className="checksum-panel">
          <summary><span>Verifikasi file installer</span><span>SHA-256</span></summary>
          <code>{checksum}</code>
        </details>
      </main>

      <footer className="download-footer">
        <a className="download-brand footer-brand" href="#top"><img src={moonLogo} alt="" /><span>MOON<span className="brand-dot">.</span></span></a>
        <span>Minecraft Java Edition · Moon Launcher</span>
        <a href="https://github.com/himamsuper-cpu/la" target="_blank" rel="noreferrer">GitHub <ExternalLink size={13} /></a>
      </footer>
    </div>
  );
}
