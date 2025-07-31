/**
 * @file app.js
 * @description Main application script. Handles shared logic like translation,
 * navigation state, and initializes content for specific pages.
 */

// This function is called by router.js after new page content is loaded
const initializePageContent = (path) => {
    // 1. Run shared initializations for all pages
    translatePage();
    updateActiveNavLinks();

    // 2. Run page-specific initializations
    if (path === '/phan_tich') {
        // This function contains all JS logic for the analysis page
        initAnalysisPage(); 
    } else if (path === '/lich_su') {
        // This function contains all JS logic for the history page
        initHistoryPage();
    }
    // Add other page-specific initializers here if needed in the future
};

// Updates the 'active' class on the current navigation link
const updateActiveNavLinks = () => {
    const currentPath = window.location.pathname;
    document.querySelectorAll('.nav-link').forEach(link => {
        // Use getAttribute to handle relative paths correctly
        const linkPath = link.getAttribute('href');
        link.classList.toggle('active', linkPath === currentPath);
    });
};

// --- Language Switcher Logic ---
let currentLanguage = localStorage.getItem('solarAnalyticsLang') || 'vi';

function setLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('solarAnalyticsLang', lang);
    // Re-translate the current content without reloading the page
    translatePage(); 
}

function translatePage() {
    if (typeof translations === 'undefined' || !translations[currentLanguage]) return;
    const trans = translations[currentLanguage];
    
    document.querySelectorAll('[data-translate-key]').forEach(el => {
        const key = el.getAttribute('data-translate-key');
        if (trans[key]) {
            // Check if the element is an input to set placeholder
            if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
                 el.placeholder = trans[key];
            } else {
                 el.textContent = trans[key];
            }
        }
    });
    document.documentElement.lang = currentLanguage;
    
    // Update active language switcher
    document.querySelectorAll('.lang-switcher').forEach(sw => {
        sw.classList.remove('active');
    });
    const activeSwitcher = document.getElementById(`lang-${currentLanguage}`);
    if (activeSwitcher) {
        activeSwitcher.classList.add('active');
    }
}

// --- Analysis & History Page Logic (Moved from old script.js) ---
// Note: These functions will only be called when their respective pages are loaded.

function initAnalysisPage() {
    // All JavaScript code for the phan_tich.html page goes here.
    // Example: document.getElementById('calculate-btn').addEventListener(...)
    console.log("Analysis page initialized!");
}

function initHistoryPage() {
    // All JavaScript code for the lich_su.html page goes here.
    // Example: displayHistoryList();
    console.log("History page initialized!");
}

// Initial setup when the main app loads
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('lang-vi')?.addEventListener('click', () => setLanguage('vi'));
    document.getElementById('lang-en')?.addEventListener('click', () => setLanguage('en'));
});
