import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { generateMoonAssets } from '../scripts/generate-moon-assets.mjs';

const runtimeRoot = path.resolve(process.argv[2] || '');
const releaseTag = process.argv[3] || 'v2.1.3-beta.1';
if (!runtimeRoot) throw new Error('Pass the checked-out Zalith runtime directory.');

const appVersion = releaseTag.replace(/^v/, '');
const versionMatch = appVersion.match(/^(\d+)\.(\d+)\.(\d+)(?:-(?:alpha|beta|rc)\.(\d+))?$/);
if (!versionMatch) throw new Error(`Invalid Android release tag: ${releaseTag}`);
const versionCode = Number(versionMatch[1]) * 1_000_000
  + Number(versionMatch[2]) * 10_000
  + Number(versionMatch[3]) * 100
  + (versionMatch[4] ? Number(versionMatch[4]) : 99);

const propertiesFile = path.join(runtimeRoot, 'ZalithLauncher/gradle.properties');
let properties = await readFile(propertiesFile, 'utf8');
properties = properties
  .replace(/^launcher_app_name=.*$/m, 'launcher_app_name=Moon Launcher')
  .replace(/^launcher_name=.*$/m, 'launcher_name=MoonLauncher')
  .replace(/^launcher_short_name=.*$/m, 'launcher_short_name=Moon')
  .replace(/^launcher_version_code=.*$/m, `launcher_version_code=${versionCode}`)
  .replace(/^launcher_version_name=.*$/m, `launcher_version_name=${appVersion}`);
await writeFile(propertiesFile, properties);

const androidRes = path.join(runtimeRoot, 'ZalithLauncher/src/main/res');

const moonAssets = path.join(runtimeRoot, '.moon-assets');
await generateMoonAssets(moonAssets);

const densityDirs = {
  mdpi: 'icon-mdpi.png',
  hdpi: 'icon-hdpi.png',
  xhdpi: 'icon-xhdpi.png',
  xxhdpi: 'icon-xxhdpi.png',
  xxxhdpi: 'icon-xxxhdpi.png',
};
for (const [density, assetName] of Object.entries(densityDirs)) {
  const mipmapDir = path.join(androidRes, `mipmap-${density}`);
  await mkdir(mipmapDir, { recursive: true });
  await copyFile(path.join(moonAssets, assetName), path.join(mipmapDir, 'ic_launcher.webp'));
  await copyFile(path.join(moonAssets, assetName), path.join(mipmapDir, 'ic_launcher_round.webp'));
}

const moonVector = `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path android:fillColor="#C5EE58" android:pathData="M54,15a39,39 0,1 0,39 39A32,32 0,0 1,54 15z"/>
    <path android:fillColor="#E17E5A" android:pathData="M78,72h8v8h-8z"/>
    <path android:fillColor="#EEEED E" android:pathData="M30,27h3v3h-3z"/>
</vector>
`;
await writeFile(path.join(androidRes, 'drawable/ic_launcher_foreground.xml'), moonVector.replace('EEEED E', 'EEEEDE'));
await writeFile(path.join(androidRes, 'drawable/ic_launcher_monochrome.xml'), moonVector.replace(/#C5EE58|#E17E5A/g, '#FFFFFF').replace(/#EEEED E/, '#FFFFFF'));
await writeFile(path.join(androidRes, 'values/ic_launcher_background.xml'), `<resources>
    <color name="ic_launcher_background">#10120F</color>
</resources>
`);
await writeFile(path.join(androidRes, 'values/moon_launcher.xml'), `<resources>
    <color name="moon_background">#10120F</color>
    <color name="moon_panel">#151814</color>
    <color name="moon_lime">#C5EE58</color>
    <color name="moon_coral">#E17E5A</color>
    <color name="moon_ivory">#EEEEDE</color>
</resources>
`);
