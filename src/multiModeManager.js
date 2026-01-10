class MultiModeManager {
  constructor(accountManager, updateCallback) {
    this.accountManager = accountManager;
    this.updateCallback = updateCallback; // Callback para notificar cambios
    
    this.isActive = false;
    this.currentIndex = 0;
    this.interval = null;
    
    // Configuración
    this.config = {
      displayDuration: 8000, // 8 segundos por cuenta
      transitionDelay: 500,  // 500ms antes de cambiar
      loopMode: true,        // true = loop infinito, false = volver a SINGLE
      autoReturnToSingle: false
    };
  }

  start() {
    if (this.isActive) return;
    
    const accounts = this.accountManager.getAllAccounts();
    if (accounts.length === 0) {
      console.log('❌ No hay cuentas para mostrar en MULTI mode');
      return false;
    }

    this.isActive = true;
    this.currentIndex = 0;
    
    console.log(`🔄 MULTI MODE activado (${accounts.length} cuentas)`);
    
    // Mostrar primera cuenta inmediatamente
    this._showCurrentAccount();
    
    // Iniciar rotación
    this._startRotation();
    
    return true;
  }

  stop() {
    if (!this.isActive) return;
    
    this.isActive = false;
    
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    
    console.log('⏹️ MULTI MODE detenido');
  }

  _startRotation() {
    this.interval = setInterval(() => {
      this._transitionToNext();
    }, this.config.displayDuration);
  }

  _transitionToNext() {
    const accounts = this.accountManager.getAllAccounts();
    
    // Calcular siguiente índice
    const nextIndex = (this.currentIndex + 1) % accounts.length;
    
    // Si terminó el ciclo y no está en loop mode
    if (nextIndex === 0 && this.config.autoReturnToSingle) {
      this.updateCallback({ type: 'CYCLE_COMPLETE' });
      return;
    }
    
    // PRIMERO: Cambiar de cuenta (cargar datos)
    this.currentIndex = nextIndex;
    this._showCurrentAccount();
    
    // DESPUÉS: Emitir evento de transición (animación visual)
    this.updateCallback({
      type: 'TRANSITION_START',
      currentIndex: this.currentIndex,
      nextIndex: (this.currentIndex + 1) % accounts.length
    });
  }

  _showCurrentAccount() {
    const accounts = this.accountManager.getAllAccounts();
    const account = accounts[this.currentIndex];
    
    if (!account) return;

    // Emitir evento de cambio de cuenta
    this.updateCallback({
      type: 'ACCOUNT_CHANGE',
      account: account,
      index: this.currentIndex,
      total: accounts.length
    });
  }

  getCurrentAccount() {
    const accounts = this.accountManager.getAllAccounts();
    return accounts[this.currentIndex] || null;
  }

  setConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // Si está activo, reiniciar con nueva config
    if (this.isActive) {
      this.stop();
      this.start();
    }
  }

  getConfig() {
    return { ...this.config };
  }
}

module.exports = MultiModeManager;
