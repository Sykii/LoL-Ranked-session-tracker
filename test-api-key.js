/**
 * RIOT API KEY TESTER
 * Ejecuta este script para verificar si tu API key funciona
 * 
 * USO:
 * node test-api-key.js
 */

const axios = require('axios');
const fs = require('fs');

// Colores para terminal
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testApiKey() {
  log('cyan', '\n═══════════════════════════════════════');
  log('cyan', '   RIOT API KEY TESTER');
  log('cyan', '═══════════════════════════════════════\n');

  // 1. Leer config
  log('blue', '📁 Leyendo config.json...');
  
  let config;
  try {
    const configFile = fs.readFileSync('./config.json', 'utf8');
    config = JSON.parse(configFile);
    log('green', '✓ Config cargado correctamente\n');
  } catch (error) {
    log('red', '✗ Error leyendo config.json:');
    console.error(error.message);
    log('yellow', '\n💡 Asegúrate de que config.json existe y tiene formato JSON válido');
    return;
  }

  // 2. Verificar campos
  log('blue', '🔍 Verificando campos...');
  
  if (!config.riotApiKey) {
    log('red', '✗ No se encontró "riotApiKey" en config.json');
    return;
  }

  if (!config.region) {
    log('red', '✗ No se encontró "region" en config.json');
    return;
  }

  log('green', `✓ API Key: ${config.riotApiKey.substring(0, 15)}...`);
  log('green', `✓ Región: ${config.region}\n`);

  // 3. Verificar formato de API key
  log('blue', '🔑 Verificando formato de API key...');
  
  const apiKeyPattern = /^RGAPI-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  
  if (!apiKeyPattern.test(config.riotApiKey.trim())) {
    log('red', '✗ Formato de API key inválido');
    log('yellow', '\n💡 Formato esperado: RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
    log('yellow', `   Tu key: ${config.riotApiKey}`);
    log('yellow', '\n   Verifica que no haya espacios o caracteres extra');
    return;
  }
  
  log('green', '✓ Formato correcto\n');

  // 4. Test 1: Endpoint básico (platform status)
  log('blue', '🌐 Test 1: Verificando conectividad...');
  
  try {
    const response = await axios.get(
      `https://${config.region}.api.riotgames.com/lol/status/v4/platform-data`,
      {
        headers: { 'X-Riot-Token': config.riotApiKey.trim() },
        timeout: 10000
      }
    );
    
    log('green', `✓ Conectividad OK (Status: ${response.status})`);
    log('green', `  Servidor: ${response.data.name || 'Unknown'}\n`);
  } catch (error) {
    if (error.response) {
      switch (error.response.status) {
        case 403:
          log('red', '✗ API Key INVÁLIDA o EXPIRADA (403 Forbidden)');
          log('yellow', '\n💡 Soluciones:');
          log('yellow', '   1. Regenera tu API key en https://developer.riotgames.com/');
          log('yellow', '   2. Asegúrate de copiarla completa (sin espacios)');
          log('yellow', '   3. Las Development Keys expiran cada 24 horas');
          break;
        case 429:
          log('red', '✗ Rate limit excedido (429)');
          log('yellow', '\n💡 Espera 2 minutos antes de reintentar');
          break;
        case 404:
          log('red', '✗ Región incorrecta (404)');
          log('yellow', `\n💡 La región "${config.region}" no existe o está mal escrita`);
          log('yellow', '   Regiones válidas: euw1, eun1, na1, br1, la1, la2, kr, jp1');
          break;
        default:
          log('red', `✗ Error HTTP ${error.response.status}`);
          console.error(error.response.data);
      }
    } else {
      log('red', '✗ Error de red:');
      console.error(error.message);
    }
    return;
  }

  // 5. Test 2: Buscar cuenta de prueba
  log('blue', '🔍 Test 2: Buscando cuenta de prueba...');
  log('yellow', '   (Usando: Faker#KR1 - cuenta pública conocida)\n');
  
  try {
    const platformRegion = getPlatformRegion(config.region);
    const response = await axios.get(
      `https://${platformRegion}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/Faker/KR1`,
      {
        headers: { 'X-Riot-Token': config.riotApiKey.trim() },
        timeout: 10000
      }
    );
    
    log('green', '✓ Búsqueda de cuentas funcionando');
    log('green', `  PUUID encontrado: ${response.data.puuid.substring(0, 20)}...\n`);
  } catch (error) {
    if (error.response?.status === 403) {
      log('red', '✗ API Key inválida (Test 2 falló)');
    } else {
      log('yellow', '⚠ Test 2 falló (puede ser normal si estás en otra región)');
      log('yellow', `  Código: ${error.response?.status || 'Network error'}\n`);
    }
  }

  // 6. Resumen
  log('cyan', '\n═══════════════════════════════════════');
  log('green', '✅ TU API KEY ESTÁ FUNCIONANDO');
  log('cyan', '═══════════════════════════════════════\n');
  
  log('yellow', '📋 Próximos pasos:');
  log('yellow', '   1. Ejecuta: npm start');
  log('yellow', '   2. Añade tu cuenta con tu Riot ID real');
  log('yellow', '   3. Activa el tracking');
  log('yellow', '\n⏰ Recuerda: Las Development Keys expiran cada 24h\n');
}

function getPlatformRegion(region) {
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

// Ejecutar
testApiKey().catch(error => {
  log('red', '\n✗ Error inesperado:');
  console.error(error);
});