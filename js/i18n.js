// i18n.js - Internationalization Module
// Handles language detection, switching, and translation loading

class I18n {
    constructor() {
        this.currentLang = null;
        this.translations = {};
        this.supportedLanguages = ['en', 'es', 'pt', 'fr', 'it', 'de', 'ja', 'zh'];
        this.defaultLanguage = 'en';
    }

    /**
     * Initialize the i18n system
     * Detects browser language and loads appropriate translations
     */
    async init() {
        // Get language from localStorage or detect from browser
        const savedLang = localStorage.getItem('medinet360_language');
        const browserLang = this.detectBrowserLanguage();

        // Use saved language, or browser language, or default
        const langToUse = savedLang || browserLang || this.defaultLanguage;

        await this.setLanguage(langToUse);
    }

    /**
     * Detect browser language
     * @returns {string} Language code (e.g., 'en', 'es')
     */
    detectBrowserLanguage() {
        const browserLang = navigator.language || navigator.userLanguage;
        // Extract the language code (e.g., 'en' from 'en-US')
        const langCode = browserLang.split('-')[0].toLowerCase();

        // Return if supported, otherwise return default
        return this.supportedLanguages.includes(langCode) ? langCode : this.defaultLanguage;
    }

    /**
     * Set the current language and load translations
     * @param {string} lang - Language code
     */
    async setLanguage(lang) {
        if (!this.supportedLanguages.includes(lang)) {
            console.warn(`Language ${lang} not supported. Falling back to ${this.defaultLanguage}`);
            lang = this.defaultLanguage;
        }

        try {
            // Load translation file if not already loaded
            if (!this.translations[lang]) {
                const response = await fetch(`/locales/${lang}.json`);
                if (!response.ok) {
                    throw new Error(`Failed to load translations for ${lang}`);
                }
                this.translations[lang] = await response.json();
            }

            this.currentLang = lang;
            localStorage.setItem('medinet360_language', lang);

            // Update HTML lang attribute
            document.documentElement.lang = lang;

            // Translate the page
            this.translatePage();

            // Dispatch language change event
            window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
        } catch (error) {
            console.error('Error loading translations:', error);
            // Fallback to default language if there's an error
            if (lang !== this.defaultLanguage) {
                await this.setLanguage(this.defaultLanguage);
            }
        }
    }

    /**
     * Get translation for a key
     * @param {string} key - Translation key (e.g., 'nav.home')
     * @returns {string} Translated string
     */
    t(key) {
        if (!this.currentLang || !this.translations[this.currentLang]) {
            return key;
        }

        const keys = key.split('.');
        let value = this.translations[this.currentLang];

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                console.warn(`Translation key not found: ${key}`);
                return key;
            }
        }

        return value;
    }

    /**
     * Translate all elements on the page with data-i18n attribute
     */
    translatePage() {
        // Translate elements with data-i18n or data-i18n-html attribute
        document.querySelectorAll('[data-i18n], [data-i18n-html]').forEach(element => {
            const key = element.getAttribute('data-i18n') || element.getAttribute('data-i18n-html');
            const translation = this.t(key);

            // Check if the element should use innerHTML (for HTML content like <strong> tags)
            if (element.hasAttribute('data-i18n-html')) {
                element.innerHTML = translation;
            } else {
                element.textContent = translation;
            }
        });

        // Translate placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            element.placeholder = this.t(key);
        });

        // Translate aria-labels
        document.querySelectorAll('[data-i18n-aria]').forEach(element => {
            const key = element.getAttribute('data-i18n-aria');
            element.setAttribute('aria-label', this.t(key));
        });

        // Translate title attributes
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            element.title = this.t(key);
        });
    }

    /**
     * Get current language
     * @returns {string} Current language code
     */
    getCurrentLanguage() {
        return this.currentLang;
    }

    /**
     * Get all supported languages
     * @returns {Array} Array of language codes
     */
    getSupportedLanguages() {
        return this.supportedLanguages;
    }
}

// Create and export global i18n instance
const i18n = new I18n();

// Prevent Flash of Untranslated Content (FOUC)
// Helper to show body
const showBody = () => {
    document.body.style.visibility = 'visible';
    document.body.style.opacity = '1';
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            await i18n.init();
        } finally {
            // Slight delay to ensure paint is done after translation
            setTimeout(showBody, 100);
        }
    });
} else {
    // Wrap in async IIFE or using promise chain
    (async () => {
        try {
            await i18n.init();
        } finally {
            setTimeout(showBody, 100);
        }
    })();
}

// Export for use in other modules
export default i18n;
