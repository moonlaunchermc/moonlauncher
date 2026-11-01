import { readFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const [platform, tag, artifactDir = 'dist'] = process.argv.slice(2);

if (!['windows', 'android', 'linux'].includes(platform)) {
  throw new Error('Platform must be windows, android, or linux.');
}

const expectedPrefix = platform === 'android' ? /^v/ : new RegExp(`^${platform}-v`);
if (!expectedPrefix.test(tag || '')) {
  throw new Error(`Tag ${tag || '(missing)'} does not match the ${platform} release format.`);
}

const version = (tag.match(/(?:^v|^\w+-v)(.+)$/) || [])[1];
if (!/^\d+\.\d+\.\d+(?:-[a-z]+(?:\.[0-9]+)?)?$/.test(version || '')) {
  throw new Error(`Release tag has an invalid semantic version: ${tag}`);
}

const directory = path.resolve(artifactDir);
const entries = (await readdir(directory, { withFileTypes: true })).filter((entry) => entry.isFile());
const artifacts = entries.filter((entry) => {
  const lowerName = entry.name.toLowerCase();
  return lowerName.endsWith('.exe') || lowerName.endsWith('.apk') || lowerName.endsWith('.appimage');
});

if (artifacts.length !== 1) {
  throw new Error(`Expected exactly one release installer, found ${artifacts.length} in ${directory}.`);
}

for (const artifact of artifacts) {
  const artifactPath = path.join(directory, artifact.name);
  const info = await stat(artifactPath);
  if (info.size < 1024) throw new Error(`${artifact.name} is unexpectedly small.`);
  const buffer = await readFile(artifactPath);
  const sha256 = createHash('sha256').update(buffer).digest('hex');
  console.log(`${sha256}  ${artifact.name}`);
}
