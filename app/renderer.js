const addBtn = document.getElementById('addBtn');
const resetBtn = document.getElementById('resetBtn');
const toggleOverlayBtn = document.getElementById('toggleOverlayBtn');
const copyPathBtn = document.getElementById('copyPathBtn');
const accountsList = document.getElementById('accountsList');
const sessionData = document.getElementById('sessionData');
const obsSection = document.getElementById('obsSection');
const obsPathInput = document.getElementById('obsPath');

let overlayVisible = true;

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

// Load accounts
async function loadAccounts() {
  const accounts = await window.api.getAccounts();
  
  if (accounts.length === 0) {
    accountsList.innerHTML = '<p style="color:#6b7280;">No hay cuentas añadidas</p>';
    return;
  }

  accountsList.innerHTML = accounts.map(acc => `
    <div class="account-item">
      <div class="account-info">
        <strong>${acc.gameName}#${acc.tagLine}</strong>
        <small>${acc.puuid.substring(0, 20)}...</small>
      </div>
      <div class="account-actions">
        <button onclick="setActive('${acc.puuid}')">Activar</button>
        <button onclick="removeAccount('${acc.puuid}')" class="danger">Eliminar</button>
      </div>
    </div>
  `).join('');
}

window.setActive = async (puuid) => {
  await window.api.setActiveAccount(puuid);
  resetBtn.style.display = 'block';
  toggleOverlayBtn.style.display = 'block';
  obsSection.style.display = 'block';
  
  // Cargar ruta de OBS
  const { path } = await window.api.getObsPath();
  obsPathInput.value = path;
  
  loadAccounts();
};

window.removeAccount = async (puuid) => {
  if (confirm('¿Eliminar esta cuenta?')) {
    await window.api.removeAccount(puuid);
    loadAccounts();
  }
};

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