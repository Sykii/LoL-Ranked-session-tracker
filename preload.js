const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getAccounts: () => ipcRenderer.invoke('get-accounts'),
  addAccount: (gameName, tagLine) => ipcRenderer.invoke('add-account', { gameName, tagLine }),
  removeAccount: (puuid) => ipcRenderer.invoke('remove-account', puuid),
  setActiveAccount: (puuid) => ipcRenderer.invoke('set-active-account', puuid),
  getSessionData: () => ipcRenderer.invoke('get-session-data'),
  resetSession: () => ipcRenderer.invoke('reset-session'),
  toggleOverlay: (visible) => ipcRenderer.invoke('toggle-overlay', visible),
  toggleTryhard: (enabled) => ipcRenderer.invoke('toggle-tryhard', enabled),
  getObsPath: () => ipcRenderer.invoke('get-obs-path'),
  saveApiKey: (apiKey) => ipcRenderer.invoke('save-api-key', apiKey),
  testApiKey: () => ipcRenderer.invoke('test-api-key'),
  setOverlayPosition: (x, y) => ipcRenderer.invoke('set-overlay-position', { x, y }),
  getOverlayPosition: () => ipcRenderer.invoke('get-overlay-position'),
  centerOverlay: () => ipcRenderer.invoke('center-overlay'),
  
  // Nuevos métodos para MULTI mode
  toggleMode: (mode) => ipcRenderer.invoke('toggle-mode', mode),
  getCurrentMode: () => ipcRenderer.invoke('get-current-mode'),
  setMultiConfig: (config) => ipcRenderer.invoke('set-multi-config', config),
  getMultiConfig: () => ipcRenderer.invoke('get-multi-config'),
  
  // Listeners existentes
  onUpdateOverlay: (callback) => ipcRenderer.on('update-overlay', (event, data) => callback(data)),
  onUpdateSession: (callback) => ipcRenderer.on('update-session', (event, data) => callback(data)),
  
  // Nuevos listeners para MULTI mode
  onMultiTransitionStart: (callback) => ipcRenderer.on('multi-transition-start', (event, data) => callback(data)),
  onMultiDisplayUpdate: (callback) => ipcRenderer.on('update-multi-display', (event, data) => callback(data))
});