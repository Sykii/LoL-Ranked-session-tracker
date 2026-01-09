const axios = require('axios');

class RiotAPI {
  constructor(apiKey, region = 'euw1') {
    this.apiKey = apiKey;
    this.region = region;
    this.platformRegion = this.getPlatformRegion(region);
    this.cache = new Map();
    this.cacheTTL = 30000; // 30 segundos
    
    console.log('🔧 RiotAPI inicializado:');
    console.log(`   Region: ${this.region}`);
    console.log(`   Platform: ${this.platformRegion}`);
    console.log(`   API Key: ${this.apiKey.substring(0, 15)}...`);
  }

  getPlatformRegion(region) {
    const mapping = {
      'euw1': 'europe',
      'eun1': 'europe',
      'na1': 'americas',
      'br1': 'americas',
      'la1': 'americas',
      'la2': 'americas',
      'kr': 'asia',
      'jp1': 'asia'
    };
    return mapping[region] || 'americas';
  }

  async request(url, cacheKey = null) {
    console.log(`\n🌐 REQUEST: ${url}`);
    
    // Check cache
    if (cacheKey && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTTL) {
        console.log('   ✓ Usando cache');
        return cached.data;
      }
    }

    try {
      const response = await axios.get(url, {
        headers: { 
          'X-Riot-Token': this.apiKey.trim()
        },
        timeout: 10000
      });

      console.log(`   ✓ Status: ${response.status}`);

      // Store in cache
      if (cacheKey) {
        this.cache.set(cacheKey, {
          data: response.data,
          timestamp: Date.now()
        });
      }

      return response.data;
    } catch (error) {
      console.log(`   ✗ ERROR DETECTADO:`);
      
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        console.log(`   Status Code: ${status}`);
        console.log(`   Response Data:`, JSON.stringify(data, null, 2));
        console.log(`   Headers:`, error.response.headers);
        
        const endpoint = url.split('/').slice(-2).join('/');
        
        switch (status) {
          case 403:
            console.log(`   ❌ 403 FORBIDDEN - Verificando...`);
            console.log(`   API Key usada: ${this.apiKey.substring(0, 20)}...`);
            console.log(`   Longitud de key: ${this.apiKey.length} caracteres`);
            console.log(`   Tiene espacios: ${this.apiKey !== this.apiKey.trim()}`);
            throw new Error('API Key inválida o expirada');
          case 429:
            console.log(`   ❌ RATE LIMIT excedido`);
            throw new Error('Rate limit excedido. Espera 2 minutos.');
          case 404:
            console.log(`   ℹ️ 404 Not Found en: ${endpoint}`);
            // 404 en algunos endpoints es normal
            if (endpoint.includes('entries/by-summoner')) {
              console.log(`   → Devolviendo array vacío (jugador sin ranked)`);
              return [];
            }
            throw new Error('Recurso no encontrado');
          case 400:
            console.log(`   ❌ 400 Bad Request`);
            throw new Error('Petición inválida - verifica región o parámetros');
          case 503:
            console.log(`   ❌ 503 Service Unavailable`);
            throw new Error('Servicio de Riot temporalmente no disponible');
          default:
            console.log(`   ❌ Error HTTP ${status}`);
            throw new Error(`Riot API error ${status}: ${error.response.statusText}`);
        }
      }
      
      if (error.code === 'ECONNABORTED') {
        console.log(`   ❌ Timeout`);
        throw new Error('Timeout: Riot API no respondió a tiempo');
      }
      
      console.log(`   ❌ Network error:`, error.message);
      console.log(`   Error completo:`, error);
      throw new Error(`Network error: ${error.message}`);
    }
  }

  async getAccountByRiotId(gameName, tagLine) {
    console.log(`\n📋 Buscando cuenta: ${gameName}#${tagLine}`);
    const url = `https://${this.platformRegion}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
    return this.request(url, `account:${gameName}#${tagLine}`);
  }

  async getSummonerByPuuid(puuid) {
    console.log(`\n👤 Obteniendo summoner por PUUID`);
    const url = `https://${this.region}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`;
    const data = await this.request(url, `summoner:${puuid}`);
    
    // DEBUG: Ver estructura completa
    console.log(`   📊 Respuesta completa de summoner:`, JSON.stringify(data, null, 2));
    
    return data;
  }

  async getRankedData(puuid) {
    console.log(`\n🏆 Obteniendo datos ranked para PUUID: ${puuid.substring(0, 20)}...`);
    
    // Primero obtenemos el summoner para tener el ID interno
    const summoner = await this.getSummonerByPuuid(puuid);
    
    // Riot devuelve el ID en diferentes campos según la versión
    // Intentamos todos los posibles campos
    const summonerId = summoner.id || summoner.encryptedSummonerId;
    
    if (!summonerId) {
      console.log(`   ⚠️ No se encontró summonerId en la respuesta`);
      console.log(`   🔄 Usando endpoint alternativo con PUUID...`);
      
      // Endpoint alternativo: buscar por PUUID en la lista de ranked
      const url = `https://${this.region}.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`;
      return this.request(url);
    }
    
    const url = `https://${this.region}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}`;
    return this.request(url);
  }

  async getRecentMatches(puuid, count = 5) {
    console.log(`\n📜 Obteniendo últimas ${count} partidas ranked`);
    const url = `https://${this.platformRegion}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?type=ranked&start=0&count=${count}`;
    try {
      return await this.request(url);
    } catch (error) {
      if (error.message.includes('no encontrado')) {
        console.log(`   → Sin partidas recientes`);
        return [];
      }
      throw error;
    }
  }

  async getMatchData(matchId) {
    console.log(`\n🎮 Obteniendo datos de partida: ${matchId}`);
    const url = `https://${this.platformRegion}.api.riotgames.com/lol/match/v5/matches/${matchId}`;
    return this.request(url, `match:${matchId}`);
  }
}

module.exports = RiotAPI;