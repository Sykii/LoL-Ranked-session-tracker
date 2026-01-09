const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getAccounts: () => ipcRenderer.invoke('get-accounts'),
  addAccount: (gameName, tagLine) => ipcRenderer.invoke('add-account', { gameName, tagLine }),
  removeAccount: (puuid) => ipcRenderer.invoke('remove-account', puuid),
  setActiveAccount: (puuid) => ipcRenderer.invoke('set-active-account', puuid),
  getSessionData: () => ipcRenderer.invoke('get-session-data'),
  resetSession: () => ipcRenderer.invoke('reset-session'),
  toggleOverlay: (visible) => ipcRenderer.invoke('toggle-overlay', visible),
  getObsPath: () => ipcRenderer.invoke('get-obs-path'),
  
  onUpdateOverlay: (callback) => ipcRenderer.on('update-overlay', (event, data) => callback(data)),
  onUpdateSession: (callback) => ipcRenderer.on('update-session', (event, data) => callback(data))
});