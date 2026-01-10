const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const RiotAPI = require('./src/riotApi');
const SessionManager = require('./src/sessionManager');
const AccountManager = require('./src/accountManager');

const store = new Store();
let mainWindow;
let overlayWindow;
let riotApi;
let sessionManager;
let accountManager;
let tryHardMode = false;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
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
    height: 150,
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
  
  // overlayWindow.webContents.openDevTools(); // Descomenta para debug
}

app.whenReady().then(() => {
  // Cargar API key desde electron-store
  const savedApiKey = store.get('riotApiKey');
  const apiKey = savedApiKey || 'YOUR-API-KEY-HERE';
  
  const config = require('./config.json');
  
  riotApi = new RiotAPI(apiKey, config.region);
  sessionManager = new SessionManager(riotApi);
  accountManager = new AccountManager(store);
  
  createMainWindow();
  createOverlayWindow();
  
  // Iniciar tracking si hay cuenta activa
  const activeAccount = accountManager.getActiveAccount();
  if (activeAccount) {
    startTracking(activeAccount);
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
  return sessionManager.getSessionStats();
});

ipcMain.handle('reset-session', () => {
  sessionManager.resetSession();
  updateOverlay();
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

ipcMain.handle('save-api-key', (event, apiKey) => {
  try {
    // Guardar en electron-store (persiste entre sesiones)
    store.set('riotApiKey', apiKey);
    
    // Actualizar la instancia de RiotAPI
    const config = require('./config.json');
    riotApi = new RiotAPI(apiKey, config.region);
    
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

// === TRACKING LOGIC ===

let trackingInterval;

async function startTracking(account) {
  stopTracking();
  
  // IMPORTANTE: Setear nombre ANTES de resetear sesión
  sessionManager.setActiveAccount(account.gameName, account.tagLine);
  sessionManager.resetSession();
  
  await updateRankedData(account);
  
  const config = require('./config.json');
  trackingInterval = setInterval(async () => {
    await checkForNewMatches(account);
  }, config.pollingInterval);
  
  console.log(`Tracking iniciado para ${account.gameName}#${account.tagLine}`);
}

function stopTracking() {
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
  }
}

async function updateRankedData(account) {
  try {
    const rankedData = await riotApi.getRankedData(account.puuid);
    
    // rankedData puede ser array vacío si el jugador no tiene ranked
    if (!rankedData || rankedData.length === 0) {
      console.log(`${account.gameName} no tiene datos ranked este split`);
      sessionManager.updateRankedInfo({
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
      sessionManager.updateRankedInfo({
        tier: soloQueue.tier,
        rank: soloQueue.rank,
        lp: soloQueue.leaguePoints,
        wins: soloQueue.wins,
        losses: soloQueue.losses
      });
      console.log(`Ranked actualizado: ${soloQueue.tier} ${soloQueue.rank} ${soloQueue.leaguePoints} LP`);
    } else {
      console.log(`${account.gameName} no tiene ranked solo 5v5 (solo flex/otros modos)`);
      sessionManager.updateRankedInfo({
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
  try {
    const recentMatches = await riotApi.getRecentMatches(account.puuid, 5);
    
    // Si no hay partidas recientes, salir silenciosamente
    if (!recentMatches || recentMatches.length === 0) {
      return;
    }
    
    // Guardar LP y rank ANTES de procesar
    const lpBefore = sessionManager.rankedInfo.lp;
    const tierBefore = sessionManager.rankedInfo.tier;
    const rankBefore = sessionManager.rankedInfo.rank;
    
    for (const matchId of recentMatches) {
      if (sessionManager.isMatchProcessed(matchId)) continue;
      
      const matchData = await riotApi.getMatchData(matchId);
      
      // Verificar que sea ranked solo y posterior al inicio de sesión
      if (matchData.info.queueId !== 420) continue;
      if (matchData.info.gameEndTimestamp < sessionManager.sessionStart) continue;
      
      const participant = matchData.info.participants.find(p => p.puuid === account.puuid);
      if (!participant) continue;
      
      // Marcar partida como procesada primero
      sessionManager.addMatch(matchId, participant.win, 0);
      
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
        
        // Detectar si hubo cambio de tier/rank (promoción o demotion)
        const rankChanged = (tierBefore !== tierAfter) || (rankBefore !== rankAfter);
        
        let lpDiff = 0;
        
        if (rankChanged) {
          // Hubo promoción o demotion
          const beforeRankValue = getRankValue(tierBefore, rankBefore);
          const afterRankValue = getRankValue(tierAfter, rankAfter);
          
          if (afterRankValue > beforeRankValue) {
            // PROMOCIÓN (ej: E2 → E1)
            // Calculamos: (100 - LP_antes) + LP_después
            lpDiff = (100 - lpBefore) + lpAfter;
            console.log(`   🎉 PROMOCIÓN: ${tierBefore} ${rankBefore} ${lpBefore}LP → ${tierAfter} ${rankAfter} ${lpAfter}LP (+${lpDiff}LP)`);
          } else {
            // DEMOTION (ej: E1 → E2)
            // Calculamos: -(LP_antes + (75 - LP_después))
            lpDiff = -(lpBefore + (75 - lpAfter));
            console.log(`   ⚠️ DEMOTION: ${tierBefore} ${rankBefore} ${lpBefore}LP → ${tierAfter} ${rankAfter} ${lpAfter}LP (${lpDiff}LP)`);
          }
        } else {
          // Sin cambio de rank, cálculo normal
          lpDiff = lpAfter - lpBefore;
          
          if (lpDiff !== 0) {
            console.log(`   LP Change: ${lpBefore} → ${lpAfter} (${lpDiff >= 0 ? '+' : ''}${lpDiff})`);
          }
        }
        
        // Actualizar Net LP
        sessionManager.sessionNetLP += lpDiff;
        
        sessionManager.updateRankedInfo({
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

function updateOverlay() {
  const data = sessionManager.getSessionStats();
  
  // Añadir estado tryhard
  data.tryHardMode = tryHardMode;
  
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
    
    fs.writeFileSync(obsDataPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error escribiendo data.json:', error);
  }
}

// Actualizar overlay cada 5 segundos (para animaciones, etc)
setInterval(() => {
  updateOverlay();
}, 5000);