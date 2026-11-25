const { app, BrowserWindow, ipcMain, screen } = require('electron');
const { existsSync } = require('node:fs');
const path = require('node:path');

const rendererPath = path.join(__dirname, '../frontend/dist/index.html');
const api = 'http://127.0.0.1:8080';

async function callBackend(route, payload) {
  try {
    const response = await fetch(api + route, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(65000),
    });
    if (response.ok) return await response.json();
    return { error: 'Pochita couldn’t reply. Check that Ollama is running and signed in.' };
  } catch {
    return { error: 'Start the backend with Docker Compose and try again.' };
  }
}

ipcMain.handle('pet:chat', (_, message) => {
  if (typeof message !== 'string' || !message.trim() || message.length > 500) {
    return { error: 'Write a message between 1 and 500 characters.' };
  }
  return callBackend('/api/chat', { message: message.trim() });
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
  if (existsSync(rendererPath)) window.loadFile(rendererPath);
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
