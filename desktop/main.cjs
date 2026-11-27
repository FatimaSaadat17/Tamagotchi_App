const { app, BrowserWindow, dialog, ipcMain, Notification, powerMonitor, screen } = require('electron');
const { createHash } = require('node:crypto');
const { existsSync } = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createManagedBackend } = require('./managed-backend.cjs');
const { createReminderScheduler } = require('./reminders.cjs');

const rendererPath = path.join(__dirname, '../frontend/dist/index.html');
const rendererUrl = pathToFileURL(rendererPath).href;
const managed = app.isPackaged || process.argv.includes('--managed');
let api = 'http://127.0.0.1:8080';
let runtime;
let reminders;
const activeNotifications = new Set();
let quitting = false;
let backendReady = !managed;
let startupStatus = 'Starting Pocket Pet…';

async function requestBackend(route, payload, timeout = 65000) {
  try {
    const options = payload === undefined ? {} : {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    };
    const response = await fetch(api + route, { ...options, signal: AbortSignal.timeout(timeout) });
    return response.ok ? { data: await response.json() } : { status: response.status };
  } catch {
    return { status: 503 };
  }
}

ipcMain.handle('pet:day-plan', async (_, request) => {
  const { data, status } = await requestBackend('/api/day-plans/suggest', request, 125000);
  return data ? { plan: data } : { status };
});

ipcMain.on('pet:sync-reminders', (event, entries) => {
  if (event.senderFrame?.url === rendererUrl && event.senderFrame === event.sender.mainFrame) {
    reminders?.replace(entries);
  }
});

ipcMain.handle('pet:chat', async (_, message) => {
  if (typeof message !== 'string' || !message.trim() || message.length > 500) {
    return { error: 'Write a message between 1 and 500 characters.' };
  }
  const { data, status } = await requestBackend('/api/chat', { message: message.trim() });
  if (data) return data;
  if (status === 402) return { error: 'Ollama Cloud needs usage credits before Pochita can reply.' };
  return { error: status === 503 ? 'Start the Spring Boot backend and try again.'
    : 'Pochita couldn’t reply. Check that Ollama is running and signed in.' };
});

ipcMain.handle('pet:create-chat-thread', () => requestBackend('/api/chat/threads', {}));

ipcMain.handle('pet:chat-history', (_, id) => {
  if (!Number.isSafeInteger(id) || id < 1) return { status: 400 };
  return requestBackend('/api/chat/threads/' + id + '/messages');
});

ipcMain.handle('pet:send-chat-message', (_, id, message) => {
  if (!Number.isSafeInteger(id) || id < 1 || typeof message !== 'string' || !message.trim() || message.length > 500) {
    return { status: 400 };
  }
  return requestBackend('/api/chat/threads/' + id + '/messages', { message: message.trim() });
});

function createWindow() {
  const { workArea } = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const margin = Math.min(16, Math.floor(Math.min(workArea.width, workArea.height) / 4));
  const width = Math.min(360, workArea.width - 2 * margin);
  const height = Math.min(530, workArea.height - 2 * margin);

  const window = new BrowserWindow({
    width,
    height,
    x: workArea.x + workArea.width - width - margin,
    y: workArea.y + workArea.height - height - margin,
    minWidth: Math.min(330, width),
    minHeight: Math.min(420, height),
    backgroundColor: '#788334',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => event.preventDefault());
  if (backendReady) {
    if (existsSync(rendererPath)) void window.loadFile(rendererPath);
  } else {
    void window.loadFile(path.join(__dirname, 'startup.html')).then(() => displayStatus(window)).catch(() => {});
  }
  return window;
}

function displayStatus(window) {
  if (window.isDestroyed()) return;
  return window.webContents.executeJavaScript(
    'if (document.getElementById("status")) document.getElementById("status").textContent = ' + JSON.stringify(startupStatus),
  ).catch(() => {});
}

function showWindow() {
  const window = BrowserWindow.getAllWindows()[0] ?? createWindow();
  if (window.isMinimized()) window.restore();
  window.focus();
}

function showReminder(reminder, start, key) {
  const time = start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const notification = new Notification({
    id: createHash('sha256').update(key).digest('hex'),
    title: reminder.kind === 'calendar' ? 'Upcoming calendar event' : 'Next in your day plan',
    body: reminder.title + ' · ' + time,
  });
  activeNotifications.add(notification);
  notification.once('click', () => {
    activeNotifications.delete(notification);
    showWindow();
  });
  notification.once('close', () => activeNotifications.delete(notification));
  notification.once('failed', (_, error) => {
    activeNotifications.delete(notification);
    console.warn('Could not show a Pocket Pet notification:', error);
  });
  notification.show();
}

async function launch() {
  showWindow();
  if (!managed) return;

  runtime = createManagedBackend({
    packaged: app.isPackaged,
    resourcesPath: process.resourcesPath,
    logsPath: app.getPath('logs'),
    statePath: path.join(app.getPath('appData'), 'Pocket Pet', 'services'),
    onUnexpectedExit: (error) => dialog.showErrorBox('Pocket Pet backend stopped', error.message + '\n\n' + runtime.logFile),
  });

  try {
    api = await runtime.start((status) => {
      startupStatus = status;
      console.log(status);
      for (const window of BrowserWindow.getAllWindows()) void displayStatus(window);
    });
    if (quitting) return;
    backendReady = true;
    for (const window of BrowserWindow.getAllWindows()) void window.loadFile(rendererPath);
  } catch (error) {
    if (quitting) return;
    console.error(error);
    const logHint = existsSync(runtime.logFile) ? '\n\nSpring Boot log: ' + runtime.logFile : '';
    dialog.showErrorBox('Pocket Pet could not start', error.message + logHint);
    app.quit();
  }
}

if (managed && !app.requestSingleInstanceLock()) {
  app.quit();
} else {
  if (managed) {
    process.on('SIGINT', () => app.quit());
    process.on('SIGTERM', () => app.quit());
  }
  app.on('second-instance', showWindow);
  app.on('activate', showWindow);
  app.on('before-quit', () => {
    quitting = true;
    runtime?.stop();
    reminders?.stop();
  });
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
  void app.whenReady().then(() => {
    if (process.platform === 'darwin' && Notification.isSupported()) {
      reminders = createReminderScheduler(path.join(app.getPath('userData'), 'reminder-history.json'), showReminder);
      powerMonitor.on('resume', reminders.check);
    }
    return launch();
  });
}
