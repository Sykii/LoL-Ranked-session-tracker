class AccountManager {
  constructor(store) {
    this.store = store;
    this.accounts = this.store.get('accounts', []);
    this.activeAccountPuuid = this.store.get('activeAccount', null);
  }

  getAllAccounts() {
    return this.accounts;
  }

  getAccount(puuid) {
    return this.accounts.find(a => a.puuid === puuid);
  }

  addAccount(account) {
    const exists = this.accounts.find(a => a.puuid === account.puuid);
    if (!exists) {
      this.accounts.push(account);
      this.store.set('accounts', this.accounts);
    }
  }

  removeAccount(puuid) {
    this.accounts = this.accounts.filter(a => a.puuid !== puuid);
    this.store.set('accounts', this.accounts);
    
    if (this.activeAccountPuuid === puuid) {
      this.activeAccountPuuid = null;
      this.store.set('activeAccount', null);
    }
  }

  setActiveAccount(puuid) {
    this.activeAccountPuuid = puuid;
    this.store.set('activeAccount', puuid);
  }

  getActiveAccount() {
    if (!this.activeAccountPuuid) return null;
    return this.accounts.find(a => a.puuid === this.activeAccountPuuid);
  }
}

module.exports = AccountManager;