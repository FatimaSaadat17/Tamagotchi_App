const { app, BrowserWindow, ipcMain } = require('electron');
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
    return { error: 'Mochi couldn’t reply. Check that Ollama is running and signed in.' };
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
  const window = new BrowserWindow({
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
