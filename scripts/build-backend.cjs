const { execFileSync } = require('node:child_process');
const { copyFileSync, mkdirSync, rmSync } = require('node:fs');
const path = require('node:path');

const backend = path.join(__dirname, '../backend');
const output = path.join(backend, 'target/desktop');
const windows = process.platform === 'win32';
const javaHome = process.env.JAVA_HOME || (process.platform === 'darwin'
  ? execFileSync('/usr/libexec/java_home', ['-v', '21'], { encoding: 'utf8' }).trim()
  : undefined);
const env = javaHome ? { ...process.env, JAVA_HOME: javaHome } : process.env;

const options = { cwd: backend, env, stdio: 'inherit' };
if (windows) {
  execFileSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'mvnw.cmd -B package'], options);
} else {
  execFileSync(path.join(backend, 'mvnw'), ['-B', 'package'], options);
}
mkdirSync(output, { recursive: true });
copyFileSync(path.join(backend, 'target/pocket-pet-0.1.0.jar'), path.join(output, 'app.jar'));

if (process.argv.includes('--runtime')) {
  const runtime = path.join(output, 'java');
  rmSync(runtime, { recursive: true, force: true });
  const jlinkName = windows ? 'jlink.exe' : 'jlink';
  const jlink = javaHome ? path.join(javaHome, 'bin', jlinkName) : jlinkName;
  execFileSync(jlink, [
    '--add-modules', 'java.se,jdk.crypto.ec,jdk.management,jdk.unsupported,jdk.zipfs',
    '--strip-debug', '--no-header-files', '--no-man-pages', '--output', runtime,
  ], { env, stdio: 'inherit' });
}
