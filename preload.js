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
  
  // MULTI MODE
  switchToMultiMode: () => ipcRenderer.invoke('switch-to-multi-mode'),
  switchToSingleMode: () => ipcRenderer.invoke('switch-to-single-mode'),
  setMultiModeInterval: (interval) => ipcRenderer.invoke('set-multi-mode-interval', interval),
  
  // WINDOW CONTROLS
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  
  // I18N
  getLocale: () => ipcRenderer.invoke('get-locale'),
  setLocale: (locale) => ipcRenderer.invoke('set-locale', locale),
  getAvailableLocales: () => ipcRenderer.invoke('get-available-locales'),
  getTranslations: () => ipcRenderer.invoke('get-translations'),
  
  // SPOTIFY
  toggleSpotify: (enabled) => ipcRenderer.invoke('toggle-spotify', enabled),
  getSpotifyStatus: () => ipcRenderer.invoke('get-spotify-status'),
  onUpdateSpotify: (callback) => ipcRenderer.on('update-spotify', (event, track) => callback(track)),
  
  onUpdateOverlay: (callback) => ipcRenderer.on('update-overlay', (event, data) => callback(data)),
  onUpdateSession: (callback) => ipcRenderer.on('update-session', (event, data) => callback(data)),
  onUpdateMultiDisplay: (callback) => ipcRenderer.on('update-multi-display', (event, data) => callback(data))
});