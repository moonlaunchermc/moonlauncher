import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const runtimeRoot = path.resolve(process.argv[2] || '');
const releaseTag = process.argv[3] || 'v2.1.2-beta.1';
if (!runtimeRoot) throw new Error('Pass the checked-out Zalith runtime directory.');

const appVersion = releaseTag.replace(/^v/, '');
const versionMatch = appVersion.match(/^(\d+)\.(\d+)\.(\d+)(?:-(?:alpha|beta|rc)\.(\d+))?$/);
if (!versionMatch) throw new Error(`Invalid Android release tag: ${releaseTag}`);
const versionCode = Number(versionMatch[1]) * 1_000_000
  + Number(versionMatch[2]) * 10_000
  + Number(versionMatch[3]) * 100
  + (versionMatch[4] ? Number(versionMatch[4]) : 99);

const buildFile = path.join(runtimeRoot, 'ZalithLauncher/build.gradle.kts');
let buildSource = await readFile(buildFile, 'utf8');
buildSource = buildSource
  .replace(/version = release\(37\) \{\n\s*minorApiLevel = 2,?\n\s*\}/, 'version = release(36)');
await writeFile(buildFile, buildSource);

const propertiesFile = path.join(runtimeRoot, 'ZalithLauncher/gradle.properties');
let properties = await readFile(propertiesFile, 'utf8');
properties = properties
  .replace(/^launcher_app_name=.*$/m, 'launcher_app_name=Moon Launcher')
  .replace(/^launcher_version_code=.*$/m, `launcher_version_code=${versionCode}`)
  .replace(/^launcher_version_name=.*$/m, `launcher_version_name=${appVersion}`);
await writeFile(propertiesFile, properties);
