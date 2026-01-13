// I18N SYSTEM
let translations = {};
let currentLocale = 'es';

// Función para traducir
function t(key) {
  const keys = key.split('.');
  let value = translations;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return key; // Fallback a la key si no existe
    }
  }
  
  return value;
}

// Aplicar traducciones al DOM
function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    const translation = t(key);
    
    // Para el contenido de texto
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      // Para inputs, no cambiar el textContent, solo placeholder si existe
    } else if (element.tagName === 'BUTTON') {
      element.textContent = translation;
    } else if (element.tagName === 'OPTION') {
      // No traducir options del select de idioma
      if (element.parentElement.id !== 'languageSelect') {
        element.textContent = translation;
      }
    } else {
      // Para otros elementos (p, span, label, h2, etc.)
      element.textContent = translation;
    }
  });
  
  // Aplicar placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    const key = element.getAttribute('data-i18n-placeholder');
    const translation = t(key);
    element.placeholder = translation;
  });
  
  // Aplicar titles/tooltips
  document.querySelectorAll('[data-i18n-title]').forEach(element => {
    const key = element.getAttribute('data-i18n-title');
    const translation = t(key);
    element.title = translation;
  });
}

// Cargar traducciones desde el main process
async function loadTranslations() {
  try {
    currentLocale = await window.api.getLocale();
    translations = await window.api.getTranslations();
    applyTranslations();
    
    // Actualizar selector de idioma
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
      languageSelect.value = currentLocale;
    }
  } catch (error) {
    console.error('Error cargando traducciones:', error);
  }
}

// Cambiar idioma
async function changeLanguage(locale) {
  try {
    const result = await window.api.setLocale(locale);
    if (result.success) {
      await loadTranslations();
      console.log(`✅ Idioma cambiado a: ${locale}`);
      
      // Recargar datos para actualizar textos dinámicos
      loadAccounts();
      updateSessionDisplay();
    }
  } catch (error) {
    console.error('Error cambiando idioma:', error);
  }
}

// COLLAPSIBLE SECTIONS FUNCTIONALITY
document.addEventListener('DOMContentLoaded', () => {
  const sectionHeaders = document.querySelectorAll('.section-header');
  
  sectionHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const section = header.parentElement;
      section.classList.toggle('collapsed');
    });
  });
});

// WINDOW CONTROLS
const minimizeBtn = document.getElementById('minimizeBtn');
const maximizeBtn = document.getElementById('maximizeBtn');
const closeBtn = document.getElementById('closeBtn');

if (minimizeBtn) {
  minimizeBtn.addEventListener('click', () => {
    window.api.minimizeWindow();
  });
}

if (maximizeBtn) {
  maximizeBtn.addEventListener('click', async () => {
    await window.api.maximizeWindow();
    updateMaximizeButton();
  });
}

if (closeBtn) {
  closeBtn.addEventListener('click', () => {
    window.api.closeWindow();
  });
}

// Actualizar icono de maximizar/restaurar
async function updateMaximizeButton() {
  const isMaximized = await window.api.isMaximized();
  
  if (maximizeBtn) {
    if (isMaximized) {
      // Icono de restaurar
      maximizeBtn.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 12 12">
          <rect x="2" y="2" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
          <rect x="2" y="1" width="8" height="1.5" fill="currentColor"/>
        </svg>
      `;
      maximizeBtn.title = 'Restaurar';
    } else {
      // Icono de maximizar
      maximizeBtn.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 12 12">
          <rect x="1" y="1" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.5"/>
        </svg>
      `;
      maximizeBtn.title = 'Maximizar';
    }
  }
}

// Actualizar al cargar
updateMaximizeButton();

// ELEMENT REFERENCES
const addBtn = document.getElementById('addBtn');
const resetBtn = document.getElementById('resetBtn');
const toggleOverlayBtn = document.getElementById('toggleOverlayBtn');
const tryHardBtn = document.getElementById('tryHardBtn');
const toggleSpotifyBtn = document.getElementById('toggleSpotifyBtn');
const toggleMultiModeBtn = document.getElementById('toggleMultiModeBtn');
const copyPathBtn = document.getElementById('copyPathBtn');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const testApiKeyBtn = document.getElementById('testApiKeyBtn');
const applyPositionBtn = document.getElementById('applyPositionBtn');
const centerOverlayBtn = document.getElementById('centerOverlayBtn');
const resetPositionBtn = document.getElementById('resetPositionBtn');
const apiKeyInput = document.getElementById('apiKeyInput');
const apiKeyStatus = document.getElementById('apiKeyStatus');
const apiKeyExpiry = document.getElementById('apiKeyExpiry');
const overlayXInput = document.getElementById('overlayX');
const overlayYInput = document.getElementById('overlayY');
const accountsList = document.getElementById('accountsList');
const sessionData = document.getElementById('sessionData');
const obsSection = document.getElementById('obsSection');
const overlayConfigSection = document.getElementById('overlayConfigSection');
const obsPathInput = document.getElementById('obsPath');

// MULTI MODE CONFIG ELEMENTS
const multiModeConfig = document.getElementById('multiModeConfig');
const rotationIntervalInput = document.getElementById('rotationInterval');
const multiAccountsCount = document.getElementById('multiAccountsCount');
const applyMultiConfigBtn = document.getElementById('applyMultiConfigBtn');
const resetMultiConfigBtn = document.getElementById('resetMultiConfigBtn');

// SETTINGS ELEMENTS
const languageSelect = document.getElementById('languageSelect');

let overlayVisible = true;
let tryHardMode = false;

// LANGUAGE SELECTOR
if (languageSelect) {
  languageSelect.addEventListener('change', async (e) => {
    const newLocale = e.target.value;
    await changeLanguage(newLocale);
  });
}

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

// Spotify Toggle
let spotifyEnabled = false;

toggleSpotifyBtn.addEventListener('click', async () => {
  spotifyEnabled = !spotifyEnabled;
  
  const result = await window.api.toggleSpotify(spotifyEnabled);
  
  if (result.success) {
    if (spotifyEnabled) {
      toggleSpotifyBtn.classList.add('active');
      toggleSpotifyBtn.textContent = t('sections.sessionStats.spotify_on');
    } else {
      toggleSpotifyBtn.classList.remove('active');
      toggleSpotifyBtn.textContent = t('sections.sessionStats.spotify_off');
    }
  }
});

// Cargar estado inicial de Spotify
async function loadSpotifyStatus() {
  const status = await window.api.getSpotifyStatus();
  spotifyEnabled = status.enabled;
  
  if (spotifyEnabled) {
    toggleSpotifyBtn.classList.add('active');
    toggleSpotifyBtn.textContent = t('sections.sessionStats.spotify_on');
  }
}

// Load accounts
async function loadAccounts() {
  const accounts = await window.api.getAccounts();
  
  if (accounts.length === 0) {
    accountsList.innerHTML = '<p style="color:#6b7280;">No hay cuentas añadidas</p>';
    toggleMultiModeBtn.style.display = 'none'; // Ocultar botón si no hay cuentas
    return;
  }

  // Mostrar botón de MULTI mode solo si hay 2+ cuentas
  if (accounts.length >= 2 && toggleMultiModeBtn) {
    toggleMultiModeBtn.style.display = 'block';
  } else if (toggleMultiModeBtn) {
    toggleMultiModeBtn.style.display = 'none';
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
  
  // Mostrar botón de Spotify cuando hay sesión activa
  if (toggleSpotifyBtn) {
    toggleSpotifyBtn.style.display = 'inline-block';
  }
}

// Listen for session updates
window.api.onUpdateSession((data) => {
  updateSessionDisplay(data);
});

// MULTI MODE TOGGLE
let isMultiMode = false;

if (toggleMultiModeBtn) {
  toggleMultiModeBtn.addEventListener('click', async () => {
    if (!isMultiMode) {
      // Switch to MULTI mode
      const result = await window.api.switchToMultiMode();
      if (result.success) {
        isMultiMode = true;
        toggleMultiModeBtn.textContent = '⏸️ Switch to SINGLE Mode';
        toggleMultiModeBtn.classList.add('active');
        
        // Mostrar panel de configuración de MULTI
        if (multiModeConfig) {
          multiModeConfig.style.display = 'block';
          updateMultiAccountsCount();
        }
        
        console.log('✅ MULTI mode activado');
      }
    } else {
      // Switch to SINGLE mode
      const result = await window.api.switchToSingleMode();
      if (result.success) {
        isMultiMode = false;
        toggleMultiModeBtn.textContent = '🔄 Switch to MULTI Mode';
        toggleMultiModeBtn.classList.remove('active');
        
        // Ocultar panel de configuración de MULTI
        if (multiModeConfig) {
          multiModeConfig.style.display = 'none';
        }
        
        console.log('✅ SINGLE mode activado');
      }
    }
  });
}

// MULTI MODE CONFIG HANDLERS
async function updateMultiAccountsCount() {
  const accounts = await window.api.getAccounts();
  if (multiAccountsCount) {
    multiAccountsCount.textContent = accounts.length;
  }
}

if (applyMultiConfigBtn) {
  applyMultiConfigBtn.addEventListener('click', async () => {
    const interval = parseInt(rotationIntervalInput.value) || 8;
    
    console.log('🔧 Aplicando intervalo:', interval);
    
    // Validar rango
    if (interval < 3 || interval > 30) {
      alert('El intervalo debe estar entre 3 y 30 segundos');
      return;
    }
    
    applyMultiConfigBtn.disabled = true;
    applyMultiConfigBtn.textContent = '⏳ Aplicando...';
    
    try {
      console.log('📡 Llamando a window.api.setMultiModeInterval...');
      const result = await window.api.setMultiModeInterval(interval);
      console.log('📥 Respuesta recibida:', result);
      
      if (result && result.success) {
        applyMultiConfigBtn.textContent = '✓ Aplicado';
        console.log('✅ Intervalo aplicado correctamente');
        setTimeout(() => {
          applyMultiConfigBtn.textContent = '💾 Aplicar Cambios';
          applyMultiConfigBtn.disabled = false;
        }, 2000);
      } else {
        applyMultiConfigBtn.textContent = '❌ Error';
        console.error('❌ Error en la respuesta:', result);
        setTimeout(() => {
          applyMultiConfigBtn.textContent = '💾 Aplicar Cambios';
          applyMultiConfigBtn.disabled = false;
        }, 2000);
      }
    } catch (error) {
      console.error('❌ Error al aplicar intervalo:', error);
      applyMultiConfigBtn.textContent = '❌ Error';
      setTimeout(() => {
        applyMultiConfigBtn.textContent = '💾 Aplicar Cambios';
        applyMultiConfigBtn.disabled = false;
      }, 2000);
    }
  });
}

if (resetMultiConfigBtn) {
  resetMultiConfigBtn.addEventListener('click', () => {
    rotationIntervalInput.value = 8;
    console.log('✅ Configuración reseteada a valores por defecto');
  });
}

// Initial load
loadTranslations(); // Cargar traducciones primero
loadAccounts();
loadSpotifyStatus(); // Cargar estado de Spotify
window.api.getSessionData().then(updateSessionDisplay);

// Verificar API key al inicio
testApiKey();