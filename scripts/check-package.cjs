const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { readdirSync, statSync } = require('node:fs');
const path = require('node:path');

const platform = process.platform;
const output = path.resolve(process.argv[2] || 'release');
const directories = readdirSync(output, { withFileTypes: true });
const platformName = { darwin: 'mac', win32: 'win', linux: 'linux' }[platform];
const archSuffix = process.arch === 'x64' ? '' : '-' + process.arch;
const packageDirectory = platformName + archSuffix + (platform === 'darwin' ? '' : '-unpacked');
const resources = platform === 'darwin'
  ? path.join(output, packageDirectory, 'Pocket Pet.app/Contents/Resources')
  : path.join(output, packageDirectory, 'resources');
const artifacts = platform === 'darwin' ? ['.dmg', '.zip'] : platform === 'win32' ? ['.zip'] : ['.deb', '.tar.gz'];

for (const extension of artifacts) {
  assert(directories.some((entry) => entry.isFile() && entry.name.endsWith(extension)), 'Missing desktop ' + extension);
}
for (const relativePath of ['app.asar', 'backend/app.jar', 'compose.yaml', 'compose.desktop.yaml']) {
  assert(statSync(path.join(resources, relativePath)).size > 0, 'Empty resource ' + relativePath);
}
const java = path.join(resources, 'backend', 'java', 'bin', platform === 'win32' ? 'java.exe' : 'java');
const version = execFileSync(java, ['--version'], { encoding: 'utf8' });
assert.match(version, /(?:java|openjdk) 21\./);
console.log('Desktop archives and bundled Java 21 runtime verified for ' + platform + '/' + process.arch);
