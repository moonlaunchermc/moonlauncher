import { readFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const [platform, tag, artifactDir = 'dist'] = process.argv.slice(2);

if (!['windows', 'android', 'linux', 'ios'].includes(platform)) {
  throw new Error('Platform must be windows, android, linux, or ios.');
}

const expectedPrefix = platform === 'android' ? /^v/
  : platform === 'ios' ? /^ios-v/
  : new RegExp(`^${platform}-v`);
if (!expectedPrefix.test(tag || '')) {
  throw new Error(`Tag ${tag || '(missing)'} does not match the ${platform} release format.`);
}

const version = (tag.match(/(?:^v|^ios-v)(.+)$/) || [])[1];
if (!/^\d+\.\d+\.\d+(?:-[a-z]+(?:\.[0-9]+)?)?$/.test(version || '')) {
  throw new Error(`Release tag has an invalid semantic version: ${tag}`);
}

const directory = path.resolve(artifactDir);
const entries = (await readdir(directory, { withFileTypes: true })).filter((entry) => entry.isFile());
const artifacts = entries.filter((entry) => {
  const lowerName = entry.name.toLowerCase();
  return lowerName.endsWith('.exe') || lowerName.endsWith('.apk') || lowerName.endsWith('.appimage') || lowerName.endsWith('.ipa');
});

const expectedCounts = { android: 2, windows: 2, linux: 2, ios: 1 };
const expectedCount = expectedCounts[platform];
if (artifacts.length !== expectedCount) {
  throw new Error(`Expected ${expectedCount} release installers for ${platform}, found ${artifacts.length} in ${directory}.`);
}

for (const artifact of artifacts) {
  const artifactPath = path.join(directory, artifact.name);
  const info = await stat(artifactPath);
  if (info.size < 1024) throw new Error(`${artifact.name} is unexpectedly small.`);
  const buffer = await readFile(artifactPath);
  const sha256 = createHash('sha256').update(buffer).digest('hex');
  console.log(`${sha256}  ${artifact.name}`);
}
