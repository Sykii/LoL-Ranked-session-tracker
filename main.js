const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const RiotAPI = require('./src/riotApi');
const SessionManager = require('./src/sessionManager');
const AccountManager = require('./src/accountManager');
const MultiModeManager = require('./src/multiModeManager');
const MultiSessionManager = require('./src/multiSessionManager');
const I18n = require('./i18n');
const SpotifyDetector = require('./src/spotifyDetector');

const store = new Store();
let mainWindow;
let overlayWindow;
let riotApi;
let sessionManager;
let accountManager;
let multiModeManager;
let multiSessionManager;
let tryHardMode = false;
let currentMode = 'SINGLE'; // 'SINGLE' | 'MULTI'

// Sistema de Spotify
let spotifyDetector;
let spotifyInterval = null;
let spotifyEnabled = false; // Toggle para mostrar/ocultar Spotify
let currentSpotifyTrack = null;

// Sistema de internacionalización
const savedLocale = store.get('locale', 'es'); // Default: español
const i18n = new I18n(savedLocale);

// Sistema de caché para MULTI mode
let multiModeCache = new Map(); // key: puuid, value: { data, timestamp }
const MULTI_CACHE_TTL = 90000; // 90 segundos (igual que el polling de SINGLE)

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    frame: false, // Sin borde nativo
    backgroundColor: '#1f2937',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: 'LoL Session Tracker',
    autoHideMenuBar: true
  });

  mainWindow.loadFile('app/index.html');
  
  // mainWindow.webContents.openDevTools(); // Descomenta para debug
}

function createOverlayWindow() {
  // Cargar posición guardada o usar default
  const savedPosition = store.get('overlayPosition', { x: 20, y: 100 });
  
  overlayWindow = new BrowserWindow({
    width: 340,
    height: 150, // Spotify ahora está dentro del espacio existente
    x: savedPosition.x,
    y: savedPosition.y,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  overlayWindow.loadFile('app/overlay.html');
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  
  // Listener para cuando el overlay termine de cargar
  overlayWindow.webContents.on('did-finish-load', () => {
    // Si hay una cuenta activa, enviar datos iniciales
    const activeAccount = accountManager.getActiveAccount();
    if (activeAccount && currentMode === 'SINGLE') {
      updateOverlay();
    }
  });
  
  // overlayWindow.webContents.openDevTools({ mode: 'detach' }); // Descomenta para debug
}

app.whenReady().then(() => {
  // Cargar API key desde electron-store
  const savedApiKey = store.get('riotApiKey');
  const apiKey = savedApiKey || 'YOUR-API-KEY-HERE';
  
  const config = require('./config.json');
  
  riotApi = new RiotAPI(apiKey, config.region);
  sessionManager = new SessionManager(riotApi);
  accountManager = new AccountManager(store);
  multiModeManager = new MultiModeManager(accountManager, handleMultiModeEvent);
  multiSessionManager = new MultiSessionManager();
  spotifyDetector = new SpotifyDetector();
  
  // Cargar configuración de Spotify
  spotifyEnabled = store.get('spotifyEnabled', false);
  
  createMainWindow();
  createOverlayWindow();
  
  // Iniciar tracking si hay cuenta activa
  const activeAccount = accountManager.getActiveAccount();
  if (activeAccount) {
    startTracking(activeAccount);
  }
  
  // Iniciar detección de Spotify si está habilitado
  if (spotifyEnabled) {
    startSpotifyDetection();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// === IPC HANDLERS ===

ipcMain.handle('get-accounts', () => {
  return accountManager.getAllAccounts();
});

ipcMain.handle('add-account', async (event, { gameName, tagLine }) => {
  try {
    console.log(`\n🔍 Añadiendo cuenta: ${gameName}#${tagLine}`);
    
    const accountData = await riotApi.getAccountByRiotId(gameName, tagLine);
    console.log(`   ✓ Account encontrado - PUUID: ${accountData.puuid.substring(0, 20)}...`);
    
    const summonerData = await riotApi.getSummonerByPuuid(accountData.puuid);
    console.log(`   ✓ Summoner encontrado`);
    console.log(`   ✓ Summoner Level: ${summonerData.summonerLevel}`);
    
    const account = {
      puuid: accountData.puuid,
      gameName: accountData.gameName,
      tagLine: accountData.tagLine,
      summonerLevel: summonerData.summonerLevel,
      profileIconId: summonerData.profileIconId
    };
    
    accountManager.addAccount(account);
    console.log(`   ✅ Cuenta añadida correctamente`);
    
    return { success: true, account };
  } catch (error) {
    console.error(`   ❌ Error añadiendo cuenta:`, error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('remove-account', (event, puuid) => {
  accountManager.removeAccount(puuid);
  return { success: true };
});

ipcMain.handle('set-active-account', async (event, puuid) => {
  const account = accountManager.getAccount(puuid);
  
  if (!account) {
    console.error(`❌ Cuenta no encontrada: ${puuid}`);
    return { success: false, error: 'Cuenta no encontrada' };
  }
  
  console.log(`\n🎮 Activando cuenta: ${account.gameName}#${account.tagLine}`);
  console.log(`   PUUID: ${account.puuid.substring(0, 20)}...`);
  
  accountManager.setActiveAccount(puuid);
  await startTracking(account);
  
  return { success: true };
});

ipcMain.handle('get-session-data', () => {
  const activeAccount = accountManager.getActiveAccount();
  if (!activeAccount) {
    return null;
  }
  
  const accountName = `${activeAccount.gameName}#${activeAccount.tagLine}`;
  const sessionStats = multiSessionManager.getSessionStats(activeAccount.puuid, accountName);
  const session = multiSessionManager.sessions.get(activeAccount.puuid);
  
  return {
    accountName: accountName,
    tier: sessionStats.tier,
    rank: sessionStats.rank,
    lp: sessionStats.lp,
    totalWinrate: sessionStats.totalWinrate,
    totalWins: session?.rankedInfo?.totalWins || 0,
    totalLosses: session?.rankedInfo?.totalLosses || 0,
    sessionWins: sessionStats.sessionWins,
    sessionLosses: sessionStats.sessionLosses,
    sessionNetLP: sessionStats.sessionNetLP,
    sessionWinrate: sessionStats.sessionWinrate
  };
});

ipcMain.handle('reset-session', () => {
  const activeAccount = accountManager.getActiveAccount();
  if (activeAccount) {
    multiSessionManager.resetSession(activeAccount.puuid);
    updateOverlay();
  }
  return { success: true };
});

ipcMain.handle('toggle-overlay', (event, visible) => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    if (visible) {
      overlayWindow.show();
    } else {
      overlayWindow.hide();
    }
  }
  return { success: true };
});

ipcMain.handle('get-obs-path', () => {
  const obsHtmlPath = path.join(__dirname, 'obs', 'overlay.html');
  return { path: obsHtmlPath };
});

ipcMain.handle('toggle-tryhard', (event, enabled) => {
  tryHardMode = enabled;
  console.log(`🔥 Modo Tryhard: ${enabled ? 'ACTIVADO' : 'DESACTIVADO'}`);
  
  // Actualizar overlay con el estado tryhard
  updateOverlay();
  
  return { success: true };
});

// MULTI MODE HANDLERS
ipcMain.handle('switch-to-multi-mode', () => {
  try {
    if (currentMode === 'MULTI') {
      return { success: false, error: 'Ya estás en MULTI mode' };
    }
    
    const allAccounts = accountManager.getAllAccounts();
    if (allAccounts.length < 2) {
      return { success: false, error: 'Necesitas al menos 2 cuentas para MULTI mode' };
    }
    
    console.log('🔄 Cambiando a MULTI MODE');
    currentMode = 'MULTI';
    
    // Detener tracking de SINGLE mode
    if (trackingInterval) {
      clearInterval(trackingInterval);
      trackingInterval = null;
    }
    
    // Iniciar MULTI mode
    multiModeManager.start();
    
    return { success: true };
  } catch (error) {
    console.error('Error al cambiar a MULTI mode:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('switch-to-single-mode', () => {
  try {
    if (currentMode === 'SINGLE') {
      return { success: false, error: 'Ya estás en SINGLE mode' };
    }
    
    console.log('🔙 Volviendo a SINGLE MODE');
    currentMode = 'SINGLE';
    
    // Detener MULTI mode
    multiModeManager.stop();
    
    // Reanudar tracking de la cuenta activa
    const activeAccount = accountManager.getActiveAccount();
    if (activeAccount) {
      startTracking(activeAccount);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error al cambiar a SINGLE mode:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('set-multi-mode-interval', (event, interval) => {
  try {
    console.log('🔧 Handler set-multi-mode-interval llamado con:', interval);
    
    // Verificar que multiModeManager existe
    if (!multiModeManager) {
      console.error('❌ multiModeManager no está inicializado');
      return { success: false, error: 'multiModeManager no está inicializado' };
    }
    
    // Validar intervalo
    if (interval < 3 || interval > 30) {
      console.log('❌ Intervalo fuera de rango:', interval);
      return { success: false, error: 'Intervalo debe estar entre 3 y 30 segundos' };
    }
    
    console.log(`⏱️ Cambiando intervalo de MULTI mode a ${interval}s`);
    
    // Cambiar intervalo en multiModeManager usando setConfig
    const newConfig = {
      displayDuration: interval * 1000 // Convertir segundos a milisegundos
    };
    
    console.log('📝 Nueva configuración:', newConfig);
    multiModeManager.setConfig(newConfig);
    
    console.log('✅ Intervalo actualizado correctamente');
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error al cambiar intervalo:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-api-key', (event, apiKey) => {
  try {
    if (!apiKey || apiKey.trim() === '') {
      return { success: false, error: 'API Key no puede estar vacía' };
    }
    
    const cleanKey = apiKey.trim();
    
    // Guardar en electron-store (persiste entre sesiones)
    store.set('riotApiKey', cleanKey);
    
    // Actualizar la instancia de RiotAPI
    const config = require('./config.json');
    riotApi = new RiotAPI(cleanKey, config.region);
    
    console.log('✅ API Key guardada y actualizada');
    
    return { success: true };
  } catch (error) {
    console.error('Error guardando API key:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('test-api-key', async () => {
  try {
    // Test simple: obtener status de la plataforma
    const config = require('./config.json');
    const url = `https://${config.region}.api.riotgames.com/lol/status/v4/platform-data`;
    
    const response = await require('axios').get(url, {
      headers: { 'X-Riot-Token': riotApi.apiKey },
      timeout: 10000
    });
    
    if (response.status === 200) {
      console.log('✅ API Key válida');
      return { success: true };
    }
    
    return { success: false, error: 'Respuesta inesperada' };
  } catch (error) {
    console.error('❌ API Key test falló:', error.message);
    
    if (error.response) {
      switch (error.response.status) {
        case 403:
          return { success: false, error: 'API Key inválida o expirada' };
        case 429:
          return { success: false, error: 'Rate limit excedido' };
        default:
          return { success: false, error: `Error ${error.response.status}` };
      }
    }
    
    return { success: false, error: 'Error de red' };
  }
});

ipcMain.handle('set-overlay-position', (event, { x, y }) => {
  try {
    if (!overlayWindow || overlayWindow.isDestroyed()) {
      return { success: false, error: 'Overlay window no disponible' };
    }
    
    overlayWindow.setBounds({
      x: x,
      y: y,
      width: 340,
      height: 150
    });
    
    store.set('overlayPosition', { x, y });
    
    return { success: true };
  } catch (error) {
    console.error('Error moviendo overlay:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-overlay-position', () => {
  return store.get('overlayPosition', { x: 20, y: 100 });
});

ipcMain.handle('center-overlay', () => {
  try {
    if (!overlayWindow || overlayWindow.isDestroyed()) {
      return { success: false };
    }
    
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    
    const x = Math.floor((width - 340) / 2);
    const y = Math.floor((height - 150) / 2);
    
    overlayWindow.setBounds({
      x: x,
      y: y,
      width: 340,
      height: 150
    });
    
    store.set('overlayPosition', { x, y });
    
    return { success: true, x, y };
  } catch (error) {
    console.error('Error centrando overlay:', error);
    return { success: false };
  }
});

// WINDOW CONTROLS
ipcMain.handle('window-minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window-close', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

// I18N HANDLERS
ipcMain.handle('get-locale', () => {
  return i18n.getLocale();
});

ipcMain.handle('set-locale', (event, locale) => {
  try {
    if (i18n.setLocale(locale)) {
      store.set('locale', locale);
      console.log(`✅ Idioma cambiado a: ${locale}`);
      return { success: true };
    }
    return { success: false, error: 'Idioma no disponible' };
  } catch (error) {
    console.error('Error cambiando idioma:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-available-locales', () => {
  return i18n.getAvailableLocales();
});

ipcMain.handle('get-translations', () => {
  return i18n.getAll();
});

// SPOTIFY HANDLERS
ipcMain.handle('toggle-spotify', (event, enabled) => {
  spotifyEnabled = enabled;
  store.set('spotifyEnabled', enabled);
  
  if (enabled) {
    startSpotifyDetection();
  } else {
    stopSpotifyDetection();
  }
  
  return { success: true, enabled: spotifyEnabled };
});

ipcMain.handle('get-spotify-status', () => {
  return { 
    enabled: spotifyEnabled,
    currentTrack: currentSpotifyTrack
  };
});

// === MULTI MODE IPC HANDLERS ===

ipcMain.handle('toggle-mode', (event, mode) => {
  if (mode === 'MULTI') {
    switchToMultiMode();
  } else {
    switchToSingleMode();
  }
  
  return { success: true, mode: currentMode };
});

ipcMain.handle('get-current-mode', () => {
  return { mode: currentMode };
});

ipcMain.handle('set-multi-config', (event, config) => {
  multiModeManager.setConfig(config);
  return { success: true, config: multiModeManager.getConfig() };
});

ipcMain.handle('get-multi-config', () => {
  return multiModeManager.getConfig();
});

// === TRACKING LOGIC ===

let trackingInterval;

async function startTracking(account) {
  stopTracking();
  
  const accountName = `${account.gameName}#${account.tagLine}`;
  
  // Usar multiSessionManager para SINGLE mode también
  multiSessionManager.initSession(account.puuid, accountName);
  
  // NO resetear la sesión - mantenerla entre modos
  // multiSessionManager.resetSession(account.puuid); // ← Comentado
  
  await updateRankedData(account);
  
  const config = require('./config.json');
  trackingInterval = setInterval(async () => {
    await checkForNewMatches(account);
  }, config.pollingInterval);
  
  console.log(`✅ Tracking iniciado para ${accountName}`);
}

function stopTracking() {
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
  }
}

async function updateRankedData(account) {
  // No actualizar ranked data si estamos en MULTI mode
  if (currentMode === 'MULTI') {
    return;
  }
  
  try {
    const rankedData = await riotApi.getRankedData(account.puuid);
    
    // rankedData puede ser array vacío si el jugador no tiene ranked
    if (!rankedData || rankedData.length === 0) {
      console.log(`${account.gameName} no tiene datos ranked este split`);
      multiSessionManager.updateRankedInfo(account.puuid, {
        tier: 'UNRANKED',
        rank: '',
        lp: 0,
        wins: 0,
        losses: 0
      });
      updateOverlay();
      return;
    }
    
    const soloQueue = rankedData.find(q => q.queueType === 'RANKED_SOLO_5x5');
    
    if (soloQueue) {
      multiSessionManager.updateRankedInfo(account.puuid, {
        tier: soloQueue.tier,
        rank: soloQueue.rank,
        lp: soloQueue.leaguePoints,
        wins: soloQueue.wins,
        losses: soloQueue.losses
      });
      console.log(`Ranked actualizado: ${soloQueue.tier} ${soloQueue.rank} ${soloQueue.leaguePoints} LP`);
    } else {
      console.log(`${account.gameName} no tiene ranked solo 5v5 (solo flex/otros modos)`);
      multiSessionManager.updateRankedInfo(account.puuid, {
        tier: 'UNRANKED',
        rank: '',
        lp: 0,
        wins: 0,
        losses: 0
      });
    }
    
    updateOverlay();
  } catch (error) {
    console.error('Error actualizando ranked data:', error.message);
    // No bloquear la app si falla ranked data
  }
}

async function checkForNewMatches(account) {
  // No verificar partidas si estamos en MULTI mode
  if (currentMode === 'MULTI') {
    return;
  }
  
  try {
    const recentMatches = await riotApi.getRecentMatches(account.puuid, 5);
    
    // Si no hay partidas recientes, salir silenciosamente
    if (!recentMatches || recentMatches.length === 0) {
      return;
    }
    
    // Obtener sesión de multiSessionManager
    const session = multiSessionManager.sessions.get(account.puuid);
    if (!session) {
      console.error('Sesión no encontrada para', account.puuid);
      return;
    }
    
    // Guardar LP y rank ANTES de procesar
    const lpBefore = session.rankedInfo.lp;
    const tierBefore = session.rankedInfo.tier;
    const rankBefore = session.rankedInfo.rank;
    
    for (const matchId of recentMatches) {
      if (multiSessionManager.isMatchProcessed(account.puuid, matchId)) continue;
      
      const matchData = await riotApi.getMatchData(matchId);
      
      // Verificar que sea ranked solo y posterior al inicio de sesión
      if (matchData.info.queueId !== 420) continue;
      if (matchData.info.gameEndTimestamp < session.sessionStart) continue;
      
      const participant = matchData.info.participants.find(p => p.puuid === account.puuid);
      if (!participant) continue;
      
      // Marcar partida como procesada
      multiSessionManager.addMatch(account.puuid, matchId, participant.win);
      
      console.log(`✓ Nueva partida: ${participant.win ? 'WIN' : 'LOSS'}`);
    }
    
    // Actualizar ranked data para obtener nuevo LP
    const rankedData = await riotApi.getRankedData(account.puuid);
    
    if (rankedData && rankedData.length > 0) {
      const soloQueue = rankedData.find(q => q.queueType === 'RANKED_SOLO_5x5');
      
      if (soloQueue) {
        const lpAfter = soloQueue.leaguePoints;
        const tierAfter = soloQueue.tier;
        const rankAfter = soloQueue.rank;
        
        // Detectar si hubo cambio de tier/rank
        const rankChanged = (tierBefore !== tierAfter) || (rankBefore !== rankAfter);
        
        let lpDiff = 0;
        
        if (rankChanged) {
          // Hubo cambio de división
          const beforeRankValue = getRankValue(tierBefore, rankBefore);
          const afterRankValue = getRankValue(tierAfter, rankAfter);
          
          if (afterRankValue > beforeRankValue) {
            // SUBIDA DE DIVISIÓN (ej: D3 90LP + WIN 30LP = D2 20LP)
            // Ya no hay promociones - los LP continúan sumando
            // lpDiff = (100 - lpBefore) + lpAfter
            lpDiff = (100 - lpBefore) + lpAfter;
            console.log(`   🎉 SUBIDA: ${tierBefore} ${rankBefore} ${lpBefore}LP → ${tierAfter} ${rankAfter} ${lpAfter}LP (+${lpDiff}LP)`);
          } else {
            // BAJADA DE DIVISIÓN (ej: D2 5LP - LOSS 20LP = D3 85LP)
            // Al bajar pierdes LP y bajas con LP restantes
            // lpDiff = -(lpBefore + (100 - lpAfter))
            lpDiff = -(lpBefore + (100 - lpAfter));
            console.log(`   ⚠️ BAJADA: ${tierBefore} ${rankBefore} ${lpBefore}LP → ${tierAfter} ${rankAfter} ${lpAfter}LP (${lpDiff}LP)`);
          }
        } else {
          // Sin cambio de rank, cálculo normal
          lpDiff = lpAfter - lpBefore;
          
          if (lpDiff !== 0) {
            console.log(`   LP Change: ${lpBefore} → ${lpAfter} (${lpDiff >= 0 ? '+' : ''}${lpDiff})`);
          }
        }
        
        // Actualizar Net LP en la sesión
        session.sessionNetLP += lpDiff;
        
        multiSessionManager.updateRankedInfo(account.puuid, {
          tier: soloQueue.tier,
          rank: soloQueue.rank,
          lp: soloQueue.leaguePoints,
          wins: soloQueue.wins,
          losses: soloQueue.losses
        });
        
        console.log(`Ranked actualizado: ${soloQueue.tier} ${soloQueue.rank} ${soloQueue.leaguePoints} LP`);
      }
    }
    
    updateOverlay();
    
  } catch (error) {
    // Log pero no detener el polling
    console.error('Error checking matches:', error.message);
  }
}

// Función auxiliar para comparar ranks
function getRankValue(tier, rank) {
  const tiers = {
    'IRON': 0,
    'BRONZE': 1,
    'SILVER': 2,
    'GOLD': 3,
    'PLATINUM': 4,
    'EMERALD': 5,
    'DIAMOND': 6,
    'MASTER': 7,
    'GRANDMASTER': 8,
    'CHALLENGER': 9
  };
  
  const ranks = {
    'IV': 0,
    'III': 1,
    'II': 2,
    'I': 3
  };
  
  // Master+ no tienen divisiones
  if (['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(tier)) {
    return tiers[tier] * 10;
  }
  
  return (tiers[tier] || 0) * 10 + (ranks[rank] || 0);
}

// === SPOTIFY FUNCTIONS ===

function startSpotifyDetection() {
  if (spotifyInterval) {
    clearInterval(spotifyInterval);
  }
  
  // Actualizar cada 3 segundos
  spotifyInterval = setInterval(async () => {
    await updateSpotifyTrack();
  }, 3000);
  
  // Primera actualización inmediata
  updateSpotifyTrack();
  
  console.log('🎵 Detección de Spotify iniciada');
}

function stopSpotifyDetection() {
  if (spotifyInterval) {
    clearInterval(spotifyInterval);
    spotifyInterval = null;
  }
  
  currentSpotifyTrack = null;
  
  // Notificar al overlay que Spotify está deshabilitado
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('update-spotify', null);
  }
  
  console.log('🎵 Detección de Spotify detenida');
}

async function updateSpotifyTrack() {
  try {
    console.log('🔍 Intentando detectar Spotify...');
    const track = await spotifyDetector.getCurrentTrack();
    
    if (!track) {
      console.log('ℹ️ No se detectó ninguna canción');
    }
    
    // Solo actualizar si cambió
    const trackString = track ? spotifyDetector.formatTrack(track) : null;
    
    if (trackString !== currentSpotifyTrack) {
      currentSpotifyTrack = trackString;
      
      // Enviar al overlay
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.webContents.send('update-spotify', currentSpotifyTrack);
        console.log('📤 Enviado al overlay:', currentSpotifyTrack || 'null');
      }
      
      if (trackString) {
        console.log(`✅ Spotify actualizado: ${trackString}`);
      }
    } else {
      console.log('ℹ️ Sin cambios en Spotify');
    }
  } catch (error) {
    console.error('❌ Error actualizando Spotify:', error.message);
    console.error(error.stack);
  }
}

// === MULTI MODE FUNCTIONS ===

function handleMultiModeEvent(event) {
  console.log('📡 Multi Mode Event:', event.type);
  
  switch (event.type) {
    case 'TRANSITION_START':
      // Notificar a overlay que viene transición
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.webContents.send('multi-transition-start', event);
      }
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('multi-transition-start', event);
      }
      break;
      
    case 'ACCOUNT_CHANGE':
      // Actualizar overlay con nueva cuenta
      updateOverlayMultiMode(event.account);
      break;
      
    case 'CYCLE_COMPLETE':
      // Volver a SINGLE mode
      switchToSingleMode();
      break;
  }
}

async function updateOverlayMultiMode(account) {
  try {
    const accountName = `${account.gameName}#${account.tagLine}`;
    
    // Inicializar sesión si no existe
    multiSessionManager.initSession(account.puuid, accountName);
    
    // PROCESAR PARTIDAS RECIENTES (igual que en SINGLE mode)
    try {
      const recentMatches = await riotApi.getRecentMatches(account.puuid, 5);
      
      if (recentMatches && recentMatches.length > 0) {
        for (const matchId of recentMatches) {
          // Si ya procesamos esta partida, skip
          if (multiSessionManager.isMatchProcessed(account.puuid, matchId)) continue;
          
          const matchData = await riotApi.getMatchData(matchId);
          
          // Solo ranked solo/duo
          if (matchData.info.queueId !== 420) continue;
          
          // Solo partidas después del inicio de la app
          const session = multiSessionManager.sessions.get(account.puuid);
          if (matchData.info.gameEndTimestamp < session.sessionStart) continue;
          
          const participant = matchData.info.participants.find(p => p.puuid === account.puuid);
          if (!participant) continue;
          
          // Añadir partida a la sesión
          const wasNew = multiSessionManager.addMatch(account.puuid, matchId, participant.win);
          
          if (wasNew) {
            console.log(`✅ [MULTI] ${accountName}: Nueva partida detectada - ${participant.win ? 'WIN' : 'LOSS'}`);
          }
        }
      }
    } catch (matchError) {
      console.error(`Error procesando partidas de ${accountName}:`, matchError.message);
    }
    
    // Verificar caché para ranked data
    const cached = multiModeCache.get(account.puuid);
    const now = Date.now();
    let rankedData = null;
    
    if (cached && (now - cached.timestamp) < MULTI_CACHE_TTL) {
      // Usar datos cacheados
      rankedData = cached.data;
      console.log(`💾 Cache HIT para ${accountName} (edad: ${Math.round((now - cached.timestamp) / 1000)}s)`);
    } else {
      // Hacer request a API y cachear
      console.log(`🌐 Cache MISS para ${accountName} - consultando API...`);
      rankedData = await riotApi.getRankedData(account.puuid);
      
      // Guardar en caché
      multiModeCache.set(account.puuid, {
        data: rankedData,
        timestamp: now
      });
      
      console.log(`💾 Datos cacheados para ${accountName} (válidos por ${MULTI_CACHE_TTL / 1000}s)`);
    }
    
    // Actualizar ranked info en MultiSessionManager
    if (rankedData && rankedData.length > 0) {
      const soloQueue = rankedData.find(q => q.queueType === 'RANKED_SOLO_5x5');
      
      if (soloQueue) {
        multiSessionManager.updateRankedInfo(account.puuid, {
          tier: soloQueue.tier,
          rank: soloQueue.rank,
          lp: soloQueue.leaguePoints,
          wins: soloQueue.wins,
          losses: soloQueue.losses
        });
      } else {
        multiSessionManager.updateRankedInfo(account.puuid, {
          tier: 'UNRANKED',
          rank: '',
          lp: 0,
          wins: 0,
          losses: 0
        });
      }
    }
    
    // Obtener stats de sesión desde MultiSessionManager
    const sessionStats = multiSessionManager.getSessionStats(account.puuid, accountName);
    
    // Obtener la sesión directamente para acceder a rankedInfo
    const session = multiSessionManager.sessions.get(account.puuid);
    
    let accountData = {
      accountName: accountName,
      tier: sessionStats.tier,
      rank: sessionStats.rank,
      lp: sessionStats.lp,
      totalWinrate: sessionStats.totalWinrate,
      totalWins: session?.rankedInfo?.totalWins || 0,
      totalLosses: session?.rankedInfo?.totalLosses || 0,
      sessionWins: sessionStats.sessionWins,
      sessionLosses: sessionStats.sessionLosses,
      sessionNetLP: sessionStats.sessionNetLP,
      sessionWinrate: sessionStats.sessionWinrate,
      status: 'normal',
      mode: 'MULTI',
      tryHardMode: tryHardMode,
      multiInfo: {
        currentIndex: multiModeManager.currentIndex,
        totalAccounts: accountManager.getAllAccounts().length
      }
    };
    
    // Enviar a overlay
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.webContents.send('update-overlay', accountData);
    }
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-multi-display', accountData);
    }
    
    // Generar data.json para OBS (también en MULTI mode)
    const obsDataPath = path.join(__dirname, 'obs', 'data.json');
    try {
      const obsDir = path.join(__dirname, 'obs');
      if (!fs.existsSync(obsDir)) {
        fs.mkdirSync(obsDir, { recursive: true });
      }
      
      // Añadir Spotify al data si está habilitado
      const obsData = {
        ...accountData,
        spotifyTrack: spotifyEnabled ? currentSpotifyTrack : null
      };
      
      fs.writeFileSync(obsDataPath, JSON.stringify(obsData, null, 2));
    } catch (error) {
      console.error('Error escribiendo data.json en MULTI mode:', error);
    }
    
  } catch (error) {
    console.error('Error actualizando multi mode:', error.message);
  }
}

function switchToMultiMode() {
  if (currentMode === 'MULTI') return;
  
  console.log('🔄 Cambiando a MULTI MODE');
  currentMode = 'MULTI';
  
  // Detener tracking de SINGLE mode
  stopTracking();
  
  // Iniciar MULTI mode
  const started = multiModeManager.start();
  
  if (!started) {
    // Si falla, volver a SINGLE
    switchToSingleMode();
  }
}

function switchToSingleMode() {
  if (currentMode === 'SINGLE') return;
  
  console.log('🔙 Volviendo a SINGLE MODE');
  currentMode = 'SINGLE';
  
  // Detener MULTI mode
  multiModeManager.stop();
  
  // Limpiar caché de MULTI mode
  console.log(`🗑️ Limpiando caché de MULTI mode (${multiModeCache.size} entradas)`);
  multiModeCache.clear();
  
  // Reactivar tracking de cuenta activa
  const activeAccount = accountManager.getActiveAccount();
  if (activeAccount) {
    startTracking(activeAccount);
  }
}

function updateOverlay() {
  // Obtener cuenta activa
  const activeAccount = accountManager.getActiveAccount();
  if (!activeAccount) {
    console.log('No hay cuenta activa');
    return;
  }
  
  const accountName = `${activeAccount.gameName}#${activeAccount.tagLine}`;
  
  // Usar multiSessionManager para obtener stats
  const sessionStats = multiSessionManager.getSessionStats(activeAccount.puuid, accountName);
  const session = multiSessionManager.sessions.get(activeAccount.puuid);
  
  const data = {
    accountName: accountName,
    tier: sessionStats.tier,
    rank: sessionStats.rank,
    lp: sessionStats.lp,
    totalWinrate: sessionStats.totalWinrate,
    totalWins: session?.rankedInfo?.totalWins || 0,
    totalLosses: session?.rankedInfo?.totalLosses || 0,
    sessionWins: sessionStats.sessionWins,
    sessionLosses: sessionStats.sessionLosses,
    sessionNetLP: sessionStats.sessionNetLP,
    sessionWinrate: sessionStats.sessionWinrate,
    status: 'normal',
    tryHardMode: tryHardMode,
    mode: currentMode // 'SINGLE' o 'MULTI'
  };
  
  // Actualizar ventana overlay de Electron
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('update-overlay', data);
  }
  
  // Actualizar ventana principal
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-session', data);
  }
  
  // Generar data.json para OBS
  const obsDataPath = path.join(__dirname, 'obs', 'data.json');
  try {
    // Crear directorio obs si no existe
    const obsDir = path.join(__dirname, 'obs');
    if (!fs.existsSync(obsDir)) {
      fs.mkdirSync(obsDir, { recursive: true });
    }
    
    // Añadir Spotify al data si está habilitado
    const obsData = {
      ...data,
      spotifyTrack: spotifyEnabled ? currentSpotifyTrack : null
    };
    
    fs.writeFileSync(obsDataPath, JSON.stringify(obsData, null, 2));
  } catch (error) {
    console.error('Error escribiendo data.json:', error);
  }
}

// Actualizar overlay cada 5 segundos (solo en modo SINGLE)
setInterval(() => {
  if (currentMode === 'SINGLE') {
    updateOverlay();
  }
  // En modo MULTI, el multiModeManager gestiona las actualizaciones
}, 5000);