// i18n.js - Sistema de Internacionalización
const fs = require('fs');
const path = require('path');

class I18n {
  constructor(defaultLocale = 'es') {
    this.currentLocale = defaultLocale;
    this.translations = {};
    this.availableLocales = ['es', 'en'];
    
    // Cargar todas las traducciones
    this.loadTranslations();
  }

  loadTranslations() {
    this.availableLocales.forEach(locale => {
      try {
        const filePath = path.join(__dirname, 'locales', `${locale}.json`);
        const data = fs.readFileSync(filePath, 'utf8');
        this.translations[locale] = JSON.parse(data);
      } catch (error) {
        console.error(`Error loading locale ${locale}:`, error);
        this.translations[locale] = {};
      }
    });
  }

  setLocale(locale) {
    if (this.availableLocales.includes(locale)) {
      this.currentLocale = locale;
      return true;
    }
    return false;
  }

  getLocale() {
    return this.currentLocale;
  }

  getAvailableLocales() {
    return this.availableLocales;
  }

  // Obtener traducción usando notación de punto: "sections.apiKey.title"
  t(key, locale = null) {
    const lang = locale || this.currentLocale;
    const keys = key.split('.');
    let value = this.translations[lang];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Fallback a español si no existe la traducción
        console.warn(`Translation key not found: ${key} for locale ${lang}`);
        return this.getFallback(key);
      }
    }

    return value;
  }

  getFallback(key) {
    const keys = key.split('.');
    let value = this.translations['es']; // Fallback a español

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key; // Retornar la key si no existe
      }
    }

    return value;
  }

  // Obtener todo el objeto de traducciones para el idioma actual
  getAll(locale = null) {
    const lang = locale || this.currentLocale;
    return this.translations[lang] || {};
  }
}

module.exports = I18n;
