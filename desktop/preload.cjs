const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pet', {
  chat: (message) => ipcRenderer.invoke('pet:chat', message),
  createChatThread: () => ipcRenderer.invoke('pet:create-chat-thread'),
  chatHistory: (id) => ipcRenderer.invoke('pet:chat-history', id),
  sendChatMessage: (id, message) => ipcRenderer.invoke('pet:send-chat-message', id, message),
  dayPlan: (request) => ipcRenderer.invoke('pet:day-plan', request),
});
