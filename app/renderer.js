const addBtn = document.getElementById('addBtn');
const resetBtn = document.getElementById('resetBtn');
const toggleOverlayBtn = document.getElementById('toggleOverlayBtn');
const tryHardBtn = document.getElementById('tryHardBtn');
const toggleModeBtn = document.getElementById('toggleModeBtn');
const copyPathBtn = document.getElementById('copyPathBtn');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const testApiKeyBtn = document.getElementById('testApiKeyBtn');
const applyPositionBtn = document.getElementById('applyPositionBtn');
const centerOverlayBtn = document.getElementById('centerOverlayBtn');
const resetPositionBtn = document.getElementById('resetPositionBtn');
const saveMultiConfigBtn = document.getElementById('saveMultiConfigBtn');
const apiKeyInput = document.getElementById('apiKeyInput');
const apiKeyStatus = document.getElementById('apiKeyStatus');
const apiKeyExpiry = document.getElementById('apiKeyExpiry');
const overlayXInput = document.getElementById('overlayX');
const overlayYInput = document.getElementById('overlayY');
const accountsList = document.getElementById('accountsList');
const sessionData = document.getElementById('sessionData');
const obsSection = document.getElementById('obsSection');
const overlayConfigSection = document.getElementById('overlayConfigSection');
const multiConfigSection = document.getElementById('multiConfigSection');
const currentModeIndicator = document.getElementById('currentModeIndicator');
const multiAccountDisplay = document.getElementById('multiAccountDisplay');
const multiDurationInput = document.getElementById('multiDuration');
const multiLoopCheckbox = document.getElementById('multiLoop');
const obsPathInput = document.getElementById('obsPath');

let overlayVisible = true;
let tryHardMode = false;
let currentMode = 'SINGLE';

// Position Controls
if (applyPositionBtn) {
  applyPositionBtn.addEventListener('click', async () => {
    const x = parseInt(overlayXInput.value) || 20;
    const y = parseInt(overlayYInput.value) || 100;
    
    applyPositionBtn.disabled = true;
    applyPositionBtn.textContent = 'Aplicando...';
    
    const result = await window.api.setOverlayPosition(x, y);
    
    if (result.success) {
      applyPositionBtn.textContent = '✓ Aplicado';
      setTimeout(() => {
        applyPositionBtn.textContent = 'Aplicar Posición';
      }, 2000);
    } else {
      alert('Error aplicando posición');
    }
    
    applyPositionBtn.disabled = false;
  });
}

if (centerOverlayBtn) {
  centerOverlayBtn.addEventListener('click', async () => {
    const result = await window.api.centerOverlay();
    
    if (result.success) {
      overlayXInput.value = result.x;
      overlayYInput.value = result.y;
      
      centerOverlayBtn.textContent = '✓ Centrado';
      setTimeout(() => {
        centerOverlayBtn.textContent = 'Centrar';
      }, 2000);
    }
  });
}

if (resetPositionBtn) {
  resetPositionBtn.addEventListener('click', () => {
    overlayXInput.value = 20;
    overlayYInput.value = 100;
    applyPositionBtn.click();
  });
}

// Preset Buttons
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    overlayXInput.value = btn.dataset.x;
    overlayYInput.value = btn.dataset.y;
    applyPositionBtn.click();
  });
});

// Add account
addBtn.addEventListener('click', async () => {
  const gameName = document.getElementById('gameName').value.trim();
  const tagLine = document.getElementById('tagLine').value.trim();
  
  if (!gameName || !tagLine) {
    alert('Por favor introduce nombre y tag');
    return;
  }

  addBtn.disabled = true;
  addBtn.textContent = 'Añadiendo...';

  const result = await window.api.addAccount(gameName, tagLine);
  
  if (result.success) {
    document.getElementById('gameName').value = '';
    document.getElementById('tagLine').value = '';
    loadAccounts();
  } else {
    alert(`Error: ${result.error}`);
  }

  addBtn.disabled = false;
  addBtn.textContent = 'Añadir';
});

// Save API Key
saveApiKeyBtn.addEventListener('click', async () => {
  const apiKey = apiKeyInput.value.trim();
  
  if (!apiKey) {
    alert('Por favor introduce una API key');
    return;
  }

  // Validar formato
  const apiKeyPattern = /^RGAPI-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  if (!apiKeyPattern.test(apiKey)) {
    alert('Formato de API key inválido. Debe ser: RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
    return;
  }

  saveApiKeyBtn.disabled = true;
  saveApiKeyBtn.textContent = 'Guardando...';

  const result = await window.api.saveApiKey(apiKey);
  
  if (result.success) {
    apiKeyStatus.textContent = '✅ Key guardada - probando...';
    apiKeyStatus.className = '';
    apiKeyInput.value = '';
    
    // Auto-test después de guardar
    setTimeout(() => testApiKey(), 500);
  } else {
    alert(`Error: ${result.error}`);
    apiKeyStatus.textContent = '❌ Error al guardar';
    apiKeyStatus.className = 'invalid';
  }

  saveApiKeyBtn.disabled = false;
  saveApiKeyBtn.textContent = 'Guardar Key';
});

// Test API Key
testApiKeyBtn.addEventListener('click', async () => {
  testApiKey();
});

async function testApiKey() {
  testApiKeyBtn.disabled = true;
  testApiKeyBtn.textContent = 'Testeando...';
  apiKeyStatus.textContent = '🔄 Verificando...';
  apiKeyStatus.className = '';

  const result = await window.api.testApiKey();
  
  if (result.success) {
    apiKeyStatus.textContent = '✅ API Key válida';
    apiKeyStatus.className = 'valid';
    
    // Calcular expiración (24h desde ahora)
    const expiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    apiKeyExpiry.textContent = `Expira ~${expiryDate.toLocaleString('es-ES')}`;
  } else {
    apiKeyStatus.textContent = `❌ ${result.error}`;
    apiKeyStatus.className = 'invalid';
    apiKeyExpiry.textContent = '';
  }

  testApiKeyBtn.disabled = false;
  testApiKeyBtn.textContent = 'Test';
}

// Reset session
resetBtn.addEventListener('click', async () => {
  if (confirm('¿Resetear estadísticas de sesión?')) {
    await window.api.resetSession();
    updateSessionDisplay(await window.api.getSessionData());
  }
});

// Toggle overlay
toggleOverlayBtn.addEventListener('click', async () => {
  overlayVisible = !overlayVisible;
  await window.api.toggleOverlay(overlayVisible);
  toggleOverlayBtn.textContent = overlayVisible ? 'Ocultar Overlay' : 'Mostrar Overlay';
});

// Copy OBS path
copyPathBtn.addEventListener('click', () => {
  obsPathInput.select();
  document.execCommand('copy');
  
  const originalText = copyPathBtn.textContent;
  copyPathBtn.textContent = '✓ Copiado';
  setTimeout(() => {
    copyPathBtn.textContent = originalText;
  }, 2000);
});

// Toggle Tryhard Mode
tryHardBtn.addEventListener('click', async () => {
  tryHardMode = !tryHardMode;
  
  await window.api.toggleTryhard(tryHardMode);
  
  if (tryHardMode) {
    tryHardBtn.classList.add('active');
    tryHardBtn.textContent = '🔥 TRYHARD ACTIVADO';
  } else {
    tryHardBtn.classList.remove('active');
    tryHardBtn.textContent = '🔥 Modo Tryhard';
  }
});

// === MULTI MODE EVENT LISTENERS ===

if (toggleModeBtn) {
  toggleModeBtn.addEventListener('click', async () => {
    const newMode = currentMode === 'SINGLE' ? 'MULTI' : 'SINGLE';
    
    toggleModeBtn.disabled = true;
    toggleModeBtn.textContent = 'Cambiando...';
    
    const result = await window.api.toggleMode(newMode);
    
    if (result.success) {
      currentMode = result.mode;
      updateModeUI();
    }
    
    toggleModeBtn.disabled = false;
  });
}

if (saveMultiConfigBtn) {
  saveMultiConfigBtn.addEventListener('click', async () => {
    const config = {
      displayDuration: parseInt(multiDurationInput.value) * 1000,
      loopMode: multiLoopCheckbox.checked,
      autoReturnToSingle: !multiLoopCheckbox.checked
    };
    
    saveMultiConfigBtn.disabled = true;
    saveMultiConfigBtn.textContent = 'Guardando...';
    
    const result = await window.api.setMultiConfig(config);
    
    if (result.success) {
      saveMultiConfigBtn.textContent = '✓ Guardado';
      setTimeout(() => {
        saveMultiConfigBtn.textContent = 'Guardar Configuración';
      }, 2000);
    }
    
    saveMultiConfigBtn.disabled = false;
  });
}

function updateModeUI() {
  if (!toggleModeBtn || !currentModeIndicator) return;
  
  if (currentMode === 'MULTI') {
    toggleModeBtn.textContent = '🔄 Modo: MULTI (Click para SINGLE)';
    toggleModeBtn.classList.add('multi-active');
    currentModeIndicator.textContent = '🔄 MULTI MODE ACTIVO';
    currentModeIndicator.className = 'mode-indicator multi';
    
    if (multiConfigSection) {
      multiConfigSection.style.display = 'block';
    }
  } else {
    toggleModeBtn.textContent = '👤 Modo: SINGLE (Click para MULTI)';
    toggleModeBtn.classList.remove('multi-active');
    currentModeIndicator.textContent = '👤 SINGLE MODE';
    currentModeIndicator.className = 'mode-indicator single';
    
    if (multiConfigSection) {
      multiConfigSection.style.display = 'none';
    }
  }
}

function getStatusText(status) {
  const texts = {
    'normal': '✓ Normal',
    'promo': '🔥 Hot Streak',
    'decay': '⚠️ Decay',
    'inactive': '💤 Inactiva'
  };
  return texts[status] || texts.normal;
}

// Listener para actualizaciones en modo MULTI
window.api.onMultiDisplayUpdate((data) => {
  if (currentMode !== 'MULTI') return;
  
  // Actualizar display con info de la cuenta actual
  if (!multiAccountDisplay) return;
  
  multiAccountDisplay.innerHTML = `
    <div class="multi-account-card">
      <div class="multi-header">
        <span class="account-counter">${data.multiInfo.currentIndex + 1}/${data.multiInfo.totalAccounts}</span>
        <span class="account-name">${data.accountName}</span>
      </div>
      <div class="rank-info">
        <span class="tier">${data.tier} ${data.rank}</span>
        <span class="lp">${data.lp} LP</span>
      </div>
      <div class="stats">
        <span class="winrate">${data.totalWinrate}% WR</span>
        <span class="status ${data.status}">${getStatusText(data.status)}</span>
      </div>
    </div>
  `;
});

// Listener para transiciones
window.api.onMultiTransitionStart((data) => {
  // Aquí NO hacemos animaciones, solo avisamos al usuario
  console.log(`Transición: Cuenta ${data.currentIndex} → ${data.nextIndex}`);
  
  // El overlay.html manejará la animación CSS
});

// Load accounts
async function loadAccounts() {
  const accounts = await window.api.getAccounts();
  
  if (accounts.length === 0) {
    accountsList.innerHTML = '<p style="color:#6b7280;">No hay cuentas añadidas</p>';
    return;
  }

  // Limpiar completamente antes de volver a crear
  accountsList.innerHTML = '';
  
  accounts.forEach(acc => {
    const accountItem = document.createElement('div');
    accountItem.className = 'account-item';
    
    accountItem.innerHTML = `
      <div class="account-info">
        <strong>${acc.gameName}#${acc.tagLine}</strong>
        <small>${acc.puuid.substring(0, 20)}...</small>
      </div>
      <div class="account-actions">
        <button class="activate-btn">Activar</button>
        <button class="delete-btn danger">Eliminar</button>
      </div>
    `;
    
    // Event listeners en lugar de onclick
    const activateBtn = accountItem.querySelector('.activate-btn');
    const deleteBtn = accountItem.querySelector('.delete-btn');
    
    activateBtn.addEventListener('click', () => setActive(acc.puuid));
    deleteBtn.addEventListener('click', () => removeAccount(acc.puuid));
    
    accountsList.appendChild(accountItem);
  });
}

async function setActive(puuid) {
  await window.api.setActiveAccount(puuid);
  resetBtn.style.display = 'block';
  toggleOverlayBtn.style.display = 'block';
  tryHardBtn.style.display = 'block';
  obsSection.style.display = 'block';
  overlayConfigSection.style.display = 'block';
  
  // Cargar ruta de OBS
  const { path } = await window.api.getObsPath();
  obsPathInput.value = path;
  
  // Cargar posición actual del overlay
  const position = await window.api.getOverlayPosition();
  if (position) {
    overlayXInput.value = position.x;
    overlayYInput.value = position.y;
  }
  
  loadAccounts();
}

async function removeAccount(puuid) {
  if (confirm('¿Eliminar esta cuenta?')) {
    await window.api.removeAccount(puuid);
    await loadAccounts();
    
    // Fix: El confirm() en Electron deja la ventana en estado "bloqueado"
    // Forzamos un "repaint" para despertar Electron
    
    // Método 1: Forzar repaint con requestAnimationFrame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const gameNameInput = document.getElementById('gameName');
        if (gameNameInput) {
          gameNameInput.focus();
          
          // Trigger manual de evento de input para "despertar" listeners
          const event = new Event('focus', { bubbles: true });
          gameNameInput.dispatchEvent(event);
        }
      });
    });
    
    // Método 2: Forzar reflow del DOM (backup)
    setTimeout(() => {
      document.body.style.display = 'none';
      document.body.offsetHeight; // Trigger reflow
      document.body.style.display = '';
      
      const gameNameInput = document.getElementById('gameName');
      if (gameNameInput) {
        gameNameInput.focus();
      }
    }, 100);
  }
}

// Update session display
function updateSessionDisplay(data) {
  if (!data) return;

  sessionData.innerHTML = `
    <div class="session-grid">
      <div class="session-card">
        <div class="session-label">Ranked</div>
        <div class="session-value">${data.tier} ${data.rank} - ${data.lp} LP</div>
      </div>
      <div class="session-card">
        <div class="session-label">Total WR</div>
        <div class="session-value">${data.totalWinrate}%</div>
      </div>
      <div class="session-card">
        <div class="session-label">Session W/L</div>
        <div class="session-value">${data.sessionWins}W - ${data.sessionLosses}L</div>
      </div>
      <div class="session-card">
        <div class="session-label">Net LP</div>
        <div class="session-value ${data.sessionNetLP >= 0 ? 'positive' : 'negative'}">
          ${data.sessionNetLP >= 0 ? '+' : ''}${data.sessionNetLP}
        </div>
      </div>
    </div>
  `;
}

// Listen for session updates
window.api.onUpdateSession((data) => {
  updateSessionDisplay(data);
});

// Initial load
loadAccounts();
window.api.getSessionData().then(updateSessionDisplay);

// Verificar API key al inicio
testApiKey();

// Cargar modo actual y configuración MULTI
window.api.getCurrentMode().then(result => {
  currentMode = result.mode;
  updateModeUI();
});

window.api.getMultiConfig().then(config => {
  if (multiDurationInput) {
    multiDurationInput.value = config.displayDuration / 1000;
  }
  if (multiLoopCheckbox) {
    multiLoopCheckbox.checked = config.loopMode;
  }
});