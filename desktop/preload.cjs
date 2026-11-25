const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pet', {
  chat: (message) => ipcRenderer.invoke('pet:chat', message),
});
