const { execFile, spawn } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { existsSync, openSync, closeSync } = require('node:fs');
const { link, mkdir, mkdtemp, readFile, rm, writeFile } = require('node:fs/promises');
const { homedir, tmpdir, userInfo } = require('node:os');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');
const { promisify } = require('node:util');

const exec = promisify(execFile);
const composeProject = 'tamagotchi_app';
const postgresBin = '/Applications/Postgres.app/Contents/Versions/latest/bin';
const defaultDb = 'tamagotchi_dev';
const defaultOllama = 'http://127.0.0.1:11435';
const defaultModel = 'qwen3:4b-instruct';
const isMac = process.platform === 'darwin';
const isWindows = process.platform === 'win32';
const javaName = isWindows ? 'java.exe' : 'java';
const cliPath = [
  path.join(homedir(), '.docker/bin'),
  ...(isMac ? ['/Applications/Docker.app/Contents/Resources/bin', '/opt/homebrew/bin', '/usr/local/bin'] : []),
  ...(isWindows && process.env.ProgramFiles ? [path.join(process.env.ProgramFiles, 'Docker/Docker/resources/bin')] : []),
  process.env.PATH,
].filter(Boolean).join(path.delimiter);

async function postgresPassword(statePath) {
  await mkdir(statePath, { recursive: true, mode: 0o700 });
  const file = path.join(statePath, 'postgres-password');
  if (!existsSync(file)) {
    const temp = await mkdtemp(path.join(statePath, 'postgres-'));
    try {
      const generated = path.join(temp, 'password');
      await writeFile(generated, randomBytes(32).toString('hex'), { mode: 0o600 });
      await link(generated, file).catch((error) => {
        if (error.code !== 'EEXIST') throw error;
      });
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  }
  return readFile(file, 'utf8');
}

function createManagedBackend({ packaged, resourcesPath, logsPath, statePath, onUnexpectedExit }) {
  const controller = new AbortController();
  const { signal } = controller;
  const root = path.join(__dirname, '..');
  const resources = packaged ? resourcesPath : root;
  const backendDir = packaged ? path.join(resources, 'backend') : path.join(root, 'backend/target/desktop');
  const composeFile = path.join(resources, 'compose.yaml');
  const desktopCompose = path.join(resources, 'compose.desktop.yaml');
  const logFile = path.join(logsPath, 'spring-boot.log');
  let backend;
  let startupDirectory;
  let ready = false;

  async function command(binary, args, { timeout = 10000, env = process.env } = {}) {
    return exec(binary, args, {
      env: { ...env, PATH: cliPath },
      signal,
      timeout,
      windowsHide: true,
      maxBuffer: 8 * 1024 * 1024,
    });
  }

  async function succeeds(binary, args, options) {
    try {
      await command(binary, args, options);
      return true;
    } catch {
      signal.throwIfAborted();
      return false;
    }
  }

  async function waitUntil(check, timeout, message) {
    const deadline = Date.now() + timeout;
    do {
      signal.throwIfAborted();
      const result = await check();
      if (result) return result;
      await delay(500, undefined, { signal });
    } while (Date.now() < deadline);
    throw new Error(message);
  }

  async function prepareNativePostgres(env, report) {
    report('Checking PostgreSQL…');
    const binary = (name) => {
      const bundled = path.join(postgresBin, name);
      return existsSync(bundled) ? bundled : name;
    };
    const args = ['-h', '127.0.0.1', '-p', '5432'];
    const pgEnv = { ...env, PGCONNECT_TIMEOUT: '3' };
    if (env.SPRING_DATASOURCE_PASSWORD !== undefined) pgEnv.PGPASSWORD = env.SPRING_DATASOURCE_PASSWORD;
    const isReady = () => succeeds(binary('pg_isready'), [...args, '-t', '2'], { env: pgEnv, timeout: 3000 });

    if (!await isReady()) {
      await command('/usr/bin/open', ['-g', '-a', 'Postgres']);
      await waitUntil(isReady, 30000, 'Start or initialize your local server in Postgres.app, then reopen Pocket Pet.');
    }

    const username = env.SPRING_DATASOURCE_USERNAME || userInfo().username;
    const login = [...args, '-w', '-U', username];
    try {
      const { stdout } = await command(binary('psql'), [
        ...login, '-XAt', '-d', 'postgres', '-c',
        "SELECT 1 FROM pg_database WHERE datname = 'tamagotchi_dev'",
      ], { env: pgEnv });
      if (stdout.trim() !== '1') {
        try {
          await command(binary('createdb'), [...login, defaultDb], { env: pgEnv });
        } catch (error) {
          // A second launcher may have created the database between the lookup and createdb.
          if (!await succeeds(binary('psql'), [...login, '-XAt', '-d', defaultDb, '-c', 'SELECT 1'], { env: pgEnv })) {
            throw error;
          }
        }
      }
    } catch (error) {
      signal.throwIfAborted();
      throw new Error('Could not open or create tamagotchi_dev. Check your local PostgreSQL login or set SPRING_DATASOURCE_URL.', { cause: error });
    }
    env.SPRING_DATASOURCE_URL = 'jdbc:postgresql://127.0.0.1:5432/' + defaultDb;
    env.SPRING_DATASOURCE_USERNAME = username;
    env.SPRING_DATASOURCE_PASSWORD ??= '';
  }

  async function prepareDocker(report) {
    const dockerReady = () => succeeds('docker', ['info', '--format', '{{.ServerVersion}}'], { timeout: 4000 });
    if (!await succeeds('docker', ['compose', 'version'])) {
      throw new Error('Install Docker with the Compose plugin, then reopen Pocket Pet.');
    }
    if (await dockerReady()) return;

    report('Starting Docker…');
    if (isMac && existsSync('/Applications/Docker.app')) {
      await command('/usr/bin/open', ['-g', '-a', 'Docker']);
    } else if (!await succeeds('docker', ['desktop', 'start', '--timeout', '60'], { timeout: 65000 })) {
      signal.throwIfAborted();
      throw new Error('Start Docker and check that your account can run docker info, then reopen Pocket Pet.');
    }
    await waitUntil(dockerReady, 90000, 'Docker is unavailable. Start it, then reopen Pocket Pet.');
  }

  async function compose(args, options, includeDatabase = false) {
    const files = ['-f', composeFile];
    if (includeDatabase) files.push('-f', desktopCompose);
    try {
      return await command('docker', ['compose', '-p', composeProject, ...files, ...args], options);
    } catch (error) {
      signal.throwIfAborted();
      throw new Error(String(error.stderr || error.message).trim());
    }
  }

  async function prepareDockerPostgres(env, report) {
    report('Starting PostgreSQL…');
    const password = await postgresPassword(statePath);
    const composeEnv = { ...env, POCKET_PET_DB_PASSWORD: password };
    await compose(['up', '-d', '--wait', '--wait-timeout', '90', 'postgres'], {
      timeout: 300000, env: composeEnv,
    }, true);
    const { stdout } = await compose(['port', 'postgres', '5432'], { env: composeEnv }, true);
    const port = stdout.trim().match(/^127\.0\.0\.1:(\d+)$/)?.[1];
    if (!port) throw new Error('Docker did not publish the PostgreSQL loopback port.');
    env.SPRING_DATASOURCE_URL = 'jdbc:postgresql://127.0.0.1:' + port + '/' + defaultDb;
    env.SPRING_DATASOURCE_USERNAME = 'pocket_pet';
    env.SPRING_DATASOURCE_PASSWORD = password;
  }

  async function prepareOllama(env, report) {
    const model = env.OLLAMA_MODEL || defaultModel;
    const base = env.OLLAMA_BASE_URL || defaultOllama;
    if (!env.OLLAMA_BASE_URL) {
      report('Starting Ollama…');
      await compose(['up', '-d', '--wait', '--wait-timeout', '90', 'ollama'], { timeout: 300000 });
      if (!model.endsWith(':cloud') && !model.endsWith('-cloud')) {
        const localModel = ['compose', '-p', composeProject, '-f', composeFile, 'exec', '-T', 'ollama', 'ollama', 'show', model];
        if (!await succeeds('docker', localModel)) {
          report('Downloading ' + model + ' to Ollama. This only happens once.');
          await compose(['exec', '-T', 'ollama', 'ollama', 'pull', model], { timeout: 900000 });
        }
      }
    }

    try {
      const response = await fetch(base.replace(/\/$/, '') + '/api/version', {
        signal: AbortSignal.any([signal, AbortSignal.timeout(4000)]),
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
    } catch (error) {
      signal.throwIfAborted();
      throw new Error('Ollama is unavailable at ' + base + '.', { cause: error });
    }

    env.OLLAMA_BASE_URL = base;
    env.OLLAMA_MODEL = model;
  }

  async function start(report) {
    const env = { ...process.env };
    const nativePostgres = isMac && env.POCKET_PET_DATABASE !== 'docker' && existsSync('/Applications/Postgres.app');
    const dockerPostgres = !env.SPRING_DATASOURCE_URL && !nativePostgres;
    if (dockerPostgres || !env.OLLAMA_BASE_URL) await prepareDocker(report);
    if (dockerPostgres) await prepareDockerPostgres(env, report);
    else if (!env.SPRING_DATASOURCE_URL) await prepareNativePostgres(env, report);
    await prepareOllama(env, report);
    report('Starting Pocket Pet’s backend…');

    const javaHome = packaged
      ? path.join(backendDir, 'java')
      : env.JAVA_HOME || (isMac ? (await command('/usr/libexec/java_home', ['-v', '21'])).stdout.trim() : '');
    const java = javaHome ? path.join(javaHome, 'bin', javaName) : javaName;
    const jar = path.join(backendDir, 'app.jar');
    await mkdir(logsPath, { recursive: true });
    startupDirectory = await mkdtemp(path.join(tmpdir(), 'pocket-pet-start-'));
    if (signal.aborted) {
      await rm(startupDirectory, { recursive: true, force: true });
      signal.throwIfAborted();
    }
    const portFile = path.join(startupDirectory, 'port');
    const log = openSync(logFile, 'w');
    try {
      backend = spawn(java, ['-jar', jar, '--server.port=0', '--server.address=127.0.0.1'], {
        env: { ...env, POCKET_PET_PORT_FILE: portFile },
        stdio: ['ignore', log, log],
        windowsHide: true,
      });
    } finally {
      closeSync(log);
    }

    let failed;
    function onExit(error) {
      failed = error;
      if (ready && !signal.aborted) onUnexpectedExit(error);
    }
    backend.once('error', onExit);
    backend.once('exit', (code, cause) => onExit(new Error('Spring Boot exited (' + (cause || code) + ').')));
    const address = await waitUntil(async () => {
      if (failed) throw failed;
      try {
        const port = Number(await readFile(portFile, 'utf8'));
        if (!Number.isInteger(port) || port < 1 || port > 65535) return;
        const url = 'http://127.0.0.1:' + port;
        const response = await fetch(url + '/api/health', {
          signal: AbortSignal.any([signal, AbortSignal.timeout(2000)]),
        });
        if (response.ok) return url;
      } catch {
        signal.throwIfAborted();
      }
    }, 60000, 'Spring Boot did not become ready.');
    ready = true;
    return address;
  }

  function stop() {
    controller.abort();
    backend?.kill('SIGTERM');
    if (startupDirectory) void rm(startupDirectory, { recursive: true, force: true }).catch(() => {});
  }

  return { start, stop, logFile };
}

module.exports = { createManagedBackend };
