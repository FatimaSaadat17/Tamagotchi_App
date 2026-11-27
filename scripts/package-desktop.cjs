const { execFileSync } = require('node:child_process');
const { mkdirSync, mkdtempSync, readdirSync, renameSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');

function hasMacSigningIdentity() {
  if (process.env.CSC_NAME || process.env.CSC_LINK || process.env.MAC_CSC_LINK) return true;
  if (process.env.CSC_IDENTITY_AUTO_DISCOVERY === 'false') return false;
  const identities = execFileSync('/usr/bin/security', ['find-identity', '-v', '-p', 'codesigning'], { encoding: 'utf8' });
  return identities.includes('"Developer ID Application:');
}

function build(options = []) {
  execFileSync(process.execPath, [
    require.resolve('electron-builder/cli.js'), '--publish', 'never', ...process.argv.slice(2), ...options,
  ], { stdio: 'inherit' });
}

if (process.platform !== 'darwin') {
  build();
} else {
  const options = hasMacSigningIdentity() ? []
    : ['--config.mac.identity=-', '--config.mac.hardenedRuntime=false'];
  // Desktop folders may be managed by a file provider that interferes with codesign.
  const staging = mkdtempSync(path.join(tmpdir(), 'pocket-pet-package-'));
  try {
    build([...options, '--config.directories.output=' + staging]);
    const release = path.resolve('release');
    mkdirSync(release, { recursive: true });
    for (const name of readdirSync(staging)) {
      const source = path.join(staging, name);
      const target = path.join(release, name);
      rmSync(target, { recursive: true, force: true });
      try {
        renameSync(source, target);
      } catch (error) {
        if (error.code !== 'EXDEV') throw error;
        execFileSync('/usr/bin/ditto', ['--norsrc', '--noextattr', source, target]);
      }
    }
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}
