# Moon Launcher

Moon Launcher has separate native runtimes for Windows and Android. The Windows release is built from pinned XMCL source; the Android beta APK bundles a standalone Minecraft Java runtime built from pinned Amethyst source. The React/Vite app in this repository is a legacy web shell, not the runtime used by either native release.

The Android APK does not require Zalith or Pojav to be installed. Moon uses its own native home, version/profile controls, and Play action; launching starts the bundled game runtime inside the Moon app rather than opening another launcher. It includes Microsoft and offline account flows, touch controls, and `.mrpack` support. Ely.by login is not supported in the pinned Android runtime.

The Windows and Linux XMCL runtimes use Modrinth and CurseForge for catalog downloads. Modrinth remains the fallback catalog if CurseForge is unavailable; `CURSEFORGE_API_KEY` or `CURSEFORGE_API_TOKEN` must be configured as a repository Actions secret. The web shell in this repository is not the Windows or Linux UI and does not launch Minecraft.


Android standalone beta APKs are built by the `Android Standalone Launcher Release` GitHub Actions workflow. It installs its own Android SDK, JDK 21, native build dependencies, and game Java runtime.

The legacy Capacitor web shell can still be built locally with:


The Windows launcher includes private voice rooms for up to eight people. The token service is in [`voice-server/README.md`](voice-server/README.md), but this repository does not provide a hosted voice endpoint or LiveKit media server. Deploy the token service over HTTPS and connect it to a reachable LiveKit Cloud or self-hosted server before friends can join from other networks. The Android launcher and legacy web shell do not include voice rooms. Hosted chat, group invites, a premium-key store, and a public website still need their own backend; Microsoft login needs a registered OAuth application, and payments need a provider and server-side entitlement checks.

Cloudflare Tunnel exposes a service running elsewhere; it does not host the website or guarantee faster rendering/downloads. Cloudflare Pages/Workers and object storage can host those parts, but actual speed depends on the origin, network, region, and assets. Minecraft FPS likewise depends on the device and game settings; the launcher cannot guarantee 500–1000 FPS.

## Windows Release

The Windows build uses a pinned XMCL desktop runtime and is released separately from Android. Moon Launcher v2.1.1 targets Windows 10 version 1903 or later and Windows 11 x64, and publishes an x64 installer only. The release adds a branded home dashboard, a real launch button, Modrinth shortcuts for mods, modpacks, resource packs, shaders, and data packs, installed-content management, and `.mrpack` import. Sidebar shortcuts and instances now share a visible scroll area, and navigation targets are larger. Java auto-selection supports compatible Java 17, 21, and 25 runtimes based on the selected Minecraft version; legacy game versions retain their own Java requirements. Login offers Microsoft, offline, Ely.by, and LittleSkin quick choices; additional Yggdrasil services can be added through the built-in service manager and are saved by the launcher.

Windows catalog releases require an official `CURSEFORGE_API_KEY` or `CURSEFORGE_API_TOKEN` repository Actions secret so the installer can connect to both catalogs without embedding credentials. Stable Windows releases also require the trusted code-signing secrets described in [`windows/CODE_SIGNING.md`](windows/CODE_SIGNING.md). Beta prereleases can be published unsigned for testing and may trigger SmartScreen warnings. They produce a versioned `MoonLauncher-v*-x64.exe` installer. The upstream MIT notice is included with every release.

## Linux Release

The Linux build uses the same pinned XMCL runtime and Moon dashboard, packaged as an x64 AppImage. It uses the `moon-launcher` executable name, Moon icon, and `noom://` scheme. `CURSEFORGE_API_KEY` or `CURSEFORGE_API_TOKEN` must be configured as a repository Actions secret. Push a `linux-v*` tag or run the `Linux Release` workflow to build and publish the AppImage with a SHA-256 checksum. Linux builds are unsigned.

## GitHub Release

The beta APK is debug-signed for direct testing/sideloading, not Google Play distribution. Debug signing is not a stable update key across fresh CI runners, so APKs may require uninstalling the prior test build before installing a new one. Pushing a `v*` tag starts an Android release build; the workflow can also be run manually with a release tag.


Windows uses `windows-v*` tags and publishes separately.
