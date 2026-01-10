class SessionManager {
  constructor(riotApi) {
    this.riotApi = riotApi;
    this.activeAccountName = null;
    this.resetSession();
  }

  setActiveAccount(gameName, tagLine) {
    this.activeAccountName = `${gameName}#${tagLine}`;
  }

  resetSession() {
    // NO resetear activeAccountName aquí
    this.sessionStart = Date.now();
    this.sessionWins = 0;
    this.sessionLosses = 0;
    this.sessionNetLP = 0;
    this.processedMatches = new Set();
    this.rankedInfo = {
      tier: 'UNRANKED',
      rank: '',
      lp: 0,
      totalWins: 0,
      totalLosses: 0
    };
  }

  updateRankedInfo(info) {
    this.rankedInfo = {
      tier: info.tier || 'UNRANKED',
      rank: info.rank || '',
      lp: info.lp || 0,
      totalWins: info.wins || 0,
      totalLosses: info.losses || 0
    };
  }

  addMatch(matchId, isWin, lpChange) {
    if (this.processedMatches.has(matchId)) return false;
    
    this.processedMatches.add(matchId);
    
    if (isWin) {
      this.sessionWins++;
    } else {
      this.sessionLosses++;
    }
    
    // No sumamos lpChange aquí porque se calcula en checkForNewMatches
    // this.sessionNetLP += lpChange;
    
    return true;
  }

  isMatchProcessed(matchId) {
    return this.processedMatches.has(matchId);
  }

  getSessionStats() {
    const totalGames = this.sessionWins + this.sessionLosses;
    const sessionWinrate = totalGames > 0 
      ? Math.round((this.sessionWins / totalGames) * 100)
      : 0;
    
    const totalGamesAll = this.rankedInfo.totalWins + this.rankedInfo.totalLosses;
    const totalWinrate = totalGamesAll > 0
      ? Math.round((this.rankedInfo.totalWins / totalGamesAll) * 100)
      : 0;

    return {
      accountName: this.activeAccountName || 'No Account',
      tier: this.rankedInfo.tier,
      rank: this.rankedInfo.rank,
      lp: this.rankedInfo.lp,
      totalWinrate,
      totalWins: this.rankedInfo.totalWins,      // NUEVO
      totalLosses: this.rankedInfo.totalLosses,  // NUEVO
      sessionWins: this.sessionWins,
      sessionLosses: this.sessionLosses,
      sessionNetLP: this.sessionNetLP,
      sessionWinrate,
      sessionStart: this.sessionStart,
      tryHardMode: false // Se actualiza desde main.js
    };
  }
}

module.exports = SessionManager;