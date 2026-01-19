// languageSwitcher.js - Language Switcher UI Component
// Creates and manages the language switcher button and modal

import i18n from './i18n.js';

class LanguageSwitcher {
    constructor() {
        this.modal = null;
        this.backdrop = null;
        this.languages = [
            { code: 'en', name: 'English', flag: '🇺🇸' },
            { code: 'es', name: 'Español', flag: '🇪🇸' },
            { code: 'pt', name: 'Português', flag: '🇧🇷' },
            { code: 'fr', name: 'Français', flag: '🇫🇷' },
            { code: 'it', name: 'Italiano', flag: '🇮🇹' },
            { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
            { code: 'ja', name: '日本語', flag: '🇯🇵' },
            { code: 'zh', name: '中文', flag: '🇨🇳' }
        ];
    }

    /**
     * Initialize the language switcher
     * Adds the globe icon button to the navigation
     */
    init() {
        this.createSwitcherButton();
        this.setupEventListeners();
    }

    /**
     * Create the globe icon button in the header navigation
     */
    createSwitcherButton() {
        // Find the FAQ link in navigation
        const faqLink = document.querySelector('nav a[data-i18n="nav.faq"]');
        if (!faqLink) {
            console.warn('FAQ link not found, cannot add language switcher');
            return;
        }

        // Create the language switcher button
        const button = document.createElement('button');
        button.className = 'language-switcher-btn';
        button.setAttribute('aria-label', 'Change language');
        button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    `;

        // Insert after FAQ link
        const faqListItem = faqLink.parentElement;
        const newListItem = document.createElement('li');
        newListItem.appendChild(button);
        faqListItem.parentNode.insertBefore(newListItem, faqListItem.nextSibling);

        // Add click event
        button.addEventListener('click', () => this.openModal());
    }

    /**
     * Create and show the language selection modal
     */
    openModal() {
        // Create backdrop
        this.backdrop = document.createElement('div');
        this.backdrop.className = 'language-modal-backdrop';

        // Create modal
        this.modal = document.createElement('div');
        this.modal.className = 'language-modal';

        // Get current language for highlighting
        const currentLang = i18n.getCurrentLanguage();

        // Create modal content
        this.modal.innerHTML = `
      <div class="language-modal-header">
        <h2 class="language-modal-title" data-i18n="languageSwitcher.title">Select Language</h2>
        <button class="language-modal-close" aria-label="Close">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="language-grid">
        ${this.languages.map(lang => `
          <div class="language-option ${lang.code === currentLang ? 'active' : ''}" 
               data-lang="${lang.code}"
               role="button"
               tabindex="0"
               aria-label="Select ${lang.name}">
            <div class="language-flag">${lang.flag}</div>
            <div class="language-name">${lang.name}</div>
          </div>
        `).join('')}
      </div>
    `;

        // Append modal to backdrop
        this.backdrop.appendChild(this.modal);
        document.body.appendChild(this.backdrop);

        // Translate modal content
        i18n.translatePage();

        // Setup modal event listeners
        this.setupModalEventListeners();

        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }

    /**
     * Close the language selection modal
     */
    closeModal() {
        if (!this.backdrop) return;

        // Add closing animation
        this.backdrop.classList.add('closing');

        // Remove after animation completes
        setTimeout(() => {
            if (this.backdrop && this.backdrop.parentNode) {
                this.backdrop.parentNode.removeChild(this.backdrop);
            }
            this.backdrop = null;
            this.modal = null;

            // Restore body scroll
            document.body.style.overflow = '';
        }, 300);
    }

    /**
     * Setup event listeners for the modal
     */
    setupModalEventListeners() {
        // Close button
        const closeBtn = this.modal.querySelector('.language-modal-close');
        closeBtn.addEventListener('click', () => this.closeModal());

        // Backdrop click (close modal)
        this.backdrop.addEventListener('click', (e) => {
            if (e.target === this.backdrop) {
                this.closeModal();
            }
        });

        // Language options
        const languageOptions = this.modal.querySelectorAll('.language-option');
        languageOptions.forEach(option => {
            option.addEventListener('click', () => {
                const langCode = option.getAttribute('data-lang');
                this.selectLanguage(langCode);
            });

            // Keyboard support
            option.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const langCode = option.getAttribute('data-lang');
                    this.selectLanguage(langCode);
                }
            });
        });

        // ESC key to close
        document.addEventListener('keydown', this.handleEscKey);
    }

    /**
     * Handle ESC key press
     */
    handleEscKey = (e) => {
        if (e.key === 'Escape' && this.backdrop) {
            this.closeModal();
        }
    }

    /**
     * Select a language and update the UI
     */
    async selectLanguage(langCode) {
        // Update active state immediately for better UX
        const options = this.modal.querySelectorAll('.language-option');
        options.forEach(opt => {
            if (opt.getAttribute('data-lang') === langCode) {
                opt.classList.add('active');
            } else {
                opt.classList.remove('active');
            }
        });

        // Set the language
        await i18n.setLanguage(langCode);

        // Close modal after a short delay
        setTimeout(() => {
            this.closeModal();
        }, 300);
    }

    /**
     * Setup global event listeners
     */
    setupEventListeners() {
        // Listen for language changes to update UI if needed
        window.addEventListener('languageChanged', (e) => {
            console.log('Language changed to:', e.detail.lang);
        });
    }

    /**
     * Cleanup event listeners
     */
    destroy() {
        document.removeEventListener('keydown', this.handleEscKey);
        if (this.backdrop) {
            this.closeModal();
        }
    }
}

// Create and initialize the language switcher
const languageSwitcher = new LanguageSwitcher();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => languageSwitcher.init());
} else {
    languageSwitcher.init();
}

export default languageSwitcher;
