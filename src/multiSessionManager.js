class MultiSessionManager {
  constructor() {
    this.sessions = new Map(); // key: puuid, value: sessionData
    this.appStartTime = Date.now();
  }

  // Inicializar sesión para una cuenta
  initSession(puuid, accountName) {
    if (!this.sessions.has(puuid)) {
      this.sessions.set(puuid, {
        accountName: accountName,
        sessionStart: this.appStartTime, // Todas empiezan cuando se abre la app
        sessionWins: 0,
        sessionLosses: 0,
        sessionNetLP: 0,
        initialLP: null, // Se setea la primera vez que se consulta
        processedMatches: new Set(),
        rankedInfo: {
          tier: 'UNRANKED',
          rank: '',
          lp: 0,
          totalWins: 0,
          totalLosses: 0
        }
      });
      console.log(`📋 Sesión inicializada para ${accountName}`);
    }
  }

  // Actualizar ranked info de una cuenta
  updateRankedInfo(puuid, info) {
    const session = this.sessions.get(puuid);
    if (!session) return;

    // Si es la primera vez, guardar LP inicial
    if (session.initialLP === null && info.lp !== undefined) {
      session.initialLP = info.lp;
      console.log(`💾 LP inicial guardado para ${session.accountName}: ${info.lp} LP`);
    }

    session.rankedInfo = {
      tier: info.tier || 'UNRANKED',
      rank: info.rank || '',
      lp: info.lp || 0,
      totalWins: info.wins || 0,
      totalLosses: info.losses || 0
    };

    // Calcular Net LP desde el inicio de la app
    if (session.initialLP !== null) {
      session.sessionNetLP = session.rankedInfo.lp - session.initialLP;
    }
  }

  // Añadir partida procesada (para MULTI mode en el futuro)
  addMatch(puuid, matchId, isWin) {
    const session = this.sessions.get(puuid);
    if (!session) return false;

    if (session.processedMatches.has(matchId)) return false;

    session.processedMatches.add(matchId);
    
    if (isWin) {
      session.sessionWins++;
    } else {
      session.sessionLosses++;
    }

    return true;
  }

  // Verificar si una partida ya fue procesada
  isMatchProcessed(puuid, matchId) {
    const session = this.sessions.get(puuid);
    if (!session) return false;
    return session.processedMatches.has(matchId);
  }

  // Obtener stats de una cuenta específica
  getSessionStats(puuid, accountName) {
    let session = this.sessions.get(puuid);
    
    // Si no existe, inicializar
    if (!session) {
      this.initSession(puuid, accountName);
      session = this.sessions.get(puuid);
    }

    const totalGames = session.sessionWins + session.sessionLosses;
    const sessionWinrate = totalGames > 0 
      ? Math.round((session.sessionWins / totalGames) * 100)
      : 0;

    const totalGamesAll = session.rankedInfo.totalWins + session.rankedInfo.totalLosses;
    const totalWinrate = totalGamesAll > 0
      ? Math.round((session.rankedInfo.totalWins / totalGamesAll) * 100)
      : 0;

    return {
      accountName: session.accountName,
      tier: session.rankedInfo.tier,
      rank: session.rankedInfo.rank,
      lp: session.rankedInfo.lp,
      totalWinrate,
      totalWins: session.rankedInfo.totalWins,      // NUEVO
      totalLosses: session.rankedInfo.totalLosses,  // NUEVO
      sessionWins: session.sessionWins,
      sessionLosses: session.sessionLosses,
      sessionNetLP: session.sessionNetLP,
      sessionWinrate,
      sessionStart: session.sessionStart
    };
  }

  // Resetear sesión de una cuenta específica
  resetSession(puuid) {
    const session = this.sessions.get(puuid);
    if (!session) return;

    session.sessionStart = Date.now();
    session.sessionWins = 0;
    session.sessionLosses = 0;
    session.sessionNetLP = 0;
    session.initialLP = session.rankedInfo.lp; // Nuevo LP inicial
    session.processedMatches.clear();

    console.log(`🔄 Sesión reseteada para ${session.accountName}`);
  }

  // Obtener todas las sesiones
  getAllSessions() {
    const sessions = [];
    for (const [puuid, session] of this.sessions) {
      sessions.push({
        puuid,
        ...this.getSessionStats(puuid, session.accountName)
      });
    }
    return sessions;
  }
}

module.exports = MultiSessionManager;
