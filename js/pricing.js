// Verifying the user session status
import { checkAuth, showToast } from './utils.js';
import { initializePaddle } from '@paddle/paddle-js';

// Paddle Configuration
const PADDLE_CLIENT_TOKEN = import.meta.env.VITE_PADDLE_CLIENT_TOKEN;
const PRICE_IDS = {
    PRO_TRIAL: import.meta.env.VITE_PADDLE_PRICE_ID_PRO_TRIAL,
    PRO_INSTANT: import.meta.env.VITE_PADDLE_PRICE_ID_PRO_INSTANT,
    PLUS_TRIAL: import.meta.env.VITE_PADDLE_PRICE_ID_PLUS_TRIAL,
    PLUS_INSTANT: import.meta.env.VITE_PADDLE_PRICE_ID_PLUS_INSTANT
};

let paddleInstance = null;
let userClinicId = null;
let userEmail = null;

document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();

    // Initialize Paddle
    try {
        paddleInstance = await initializePaddle({
            token: PADDLE_CLIENT_TOKEN,
            environment: 'sandbox'
        });
        console.log('✅ Paddle initialized successfully');
    } catch (error) {
        console.error('❌ Paddle initialization error:', error);
        showToast('Error al inicializar el sistema de pagos', 'error');
    }

    // Load user data for checkout
    await loadUserData();

    // Attach event listeners to buttons
    attachButtonListeners();

    // Set the current year in the footer
    const currentYear = new Date().getFullYear();
    document.getElementById('currentYear').textContent = currentYear;

    const logo = document.querySelector('.logo');
    logo.style.cursor = 'pointer';

    // Redirect to homepage on logo click
    logo.addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    // Toggle navigation menu
    const menuButton = document.getElementById('menuButton');
    const navMenu = document.getElementById('navigation');

    // Close the menu when resizing the window to a width greater than 768px
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            navMenu.classList.remove('open');
            menuButton.classList.remove('open');
        }
    });

    menuButton.addEventListener('click', () => {
        navMenu.classList.toggle('open');
        menuButton.classList.toggle('open');
    });

    //Sign In button function
    const signInButton = document.getElementById('signInButton');
    signInButton.addEventListener('click', () => {
        window.location.href = 'signIn.html';
    });
});

async function loadUserData() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        console.log('No user logged in');
        return;
    }

    try {
        const response = await fetch('https://medinet360-api.onrender.com/api/auth/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            userClinicId = data.clinicId;
            userEmail = data.email;
            console.log('✅ User data loaded:', { clinicId: userClinicId, email: userEmail });
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

function attachButtonListeners() {
    const proTrialBtn = document.getElementById('pro-trial-btn');
    const proInstantBtn = document.getElementById('pro-instant-btn');
    const plusTrialBtn = document.getElementById('plus-trial-btn');
    const plusInstantBtn = document.getElementById('plus-instant-btn');

    if (proTrialBtn) proTrialBtn.addEventListener('click', () => openCheckout(PRICE_IDS.PRO_TRIAL));
    if (proInstantBtn) proInstantBtn.addEventListener('click', () => openCheckout(PRICE_IDS.PRO_INSTANT));
    if (plusTrialBtn) plusTrialBtn.addEventListener('click', () => openCheckout(PRICE_IDS.PLUS_TRIAL));
    if (plusInstantBtn) plusInstantBtn.addEventListener('click', () => openCheckout(PRICE_IDS.PLUS_INSTANT));
}

function openCheckout(priceId) {
    // Check if user is logged in
    if (!userClinicId) {
        showToast('Debes iniciar sesión para suscribirte', 'error');
        setTimeout(() => {
            window.location.href = 'signIn.html';
        }, 1500);
        return;
    }

    // Check if Paddle is initialized
    if (!paddleInstance) {
        showToast('Sistema de pagos no disponible. Intenta de nuevo.', 'error');
        return;
    }

    const checkoutOptions = {
        items: [
            {
                priceId: priceId,
                quantity: 1
            }
        ],
        custom_data: {
            clinicId: String(userClinicId)
        },
        customer: {
            email: userEmail
        },
        settings: {
            successUrl: 'https://medinet360.com/dashboard/account.html'
        }
    };

    console.log('🛒 Opening Checkout with options:', checkoutOptions);

    try {
        paddleInstance.Checkout.open(checkoutOptions);
    } catch (error) {
        console.error('Error opening checkout:', error);
        showToast('Error al abrir el checkout. Intenta de nuevo.', 'error');
    }
}