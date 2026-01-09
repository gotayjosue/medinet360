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

const PLAN_LEVELS = {
    'free': 0,
    'clinic_pro': 1,
    'clinic_plus': 2
};

document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();

    // Initialize Paddle
    try {
        paddleInstance = await initializePaddle({
            token: PADDLE_CLIENT_TOKEN,
            environment: 'production'
        });
        console.log('✅ Paddle initialized successfully');
    } catch (error) {
        console.error('❌ Paddle initialization error:', error);
        showToast('Error al inicializar el sistema de pagos', 'error');
    }

    // Attach event listeners to buttons (standard checkout)
    attachButtonListeners();

    // Load user data for checkout (may replace buttons with Manage/Upgrade/Downgrade logic)
    await loadUserData();

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

            // Now fetch clinic details to check subscription status
            await checkSubscriptionStatus(userClinicId, token);
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

async function checkSubscriptionStatus(clinicId, token) {
    try {
        const response = await fetch(`https://medinet360-api.onrender.com/api/clinic/${clinicId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const clinic = await response.json();
            const status = clinic.subscriptionStatus;
            const plan = clinic.plan || 'free';
            const endDate = clinic.subscriptionEndDate ? new Date(clinic.subscriptionEndDate) : null;

            updatePricingUI(status, plan, endDate);
        }
    } catch (error) {
        console.error('Error loading clinic data:', error);
    }
}

function updatePricingUI(status, plan, endDate) {
    const now = new Date();
    const isInGracePeriod = status === 'canceled' && endDate && endDate > now;
    const isPaidSubscription = (status === 'active' || status === 'trialing' || isInGracePeriod) && plan !== 'free';

    // 1. Badge Logic
    let activeCardSelector = '.freePlan';
    if (plan === 'clinic_pro') activeCardSelector = '.proPlan';
    if (plan === 'clinic_plus') activeCardSelector = '.professionalPlan';

    const activeCard = document.querySelector(activeCardSelector);
    if (activeCard) {
        // Create Badge if not exists
        if (!activeCard.querySelector('.actual-plan-badge')) {
            const badge = document.createElement('div');

            // Different badge text and color for grace period
            if (isInGracePeriod) {
                const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
                badge.textContent = `Actual Plan - Expira en ${daysRemaining} ${daysRemaining === 1 ? 'día' : 'días'}`;
                badge.style.backgroundColor = '#F59E0B'; // Orange
            } else {
                badge.textContent = 'Actual Plan';
                badge.style.backgroundColor = '#4F46E5'; // Indigo
            }

            badge.className = 'actual-plan-badge';
            badge.style.cssText += `
                color: white; 
                padding: 4px 12px; 
                border-radius: 9999px; 
                font-size: 0.75rem; 
                font-weight: bold; 
                text-transform: uppercase; 
                position: absolute; 
                top: -12px; 
                left: 50%; 
                transform: translateX(-50%);
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                z-index: 10;
            `;
            activeCard.style.position = 'relative';
            activeCard.style.border = isInGracePeriod ? '2px solid #F59E0B' : '2px solid #4F46E5';
            activeCard.appendChild(badge);
        }

        // Add grace period warning message if applicable
        if (isInGracePeriod && !activeCard.querySelector('.grace-period-warning')) {
            const warning = document.createElement('div');
            warning.className = 'grace-period-warning';
            warning.style.cssText = `
                background-color: #FEF3C7;
                border-left: 4px solid #F59E0B;
                padding: 12px;
                margin-top: 16px;
                border-radius: 8px;
                font-size: 0.875rem;
                color: #92400E;
                line-height: 1.5;
            `;
            warning.innerHTML = `
                <strong>⚠️ Suscripción Cancelada:</strong> Tu plan se degradará a Free el ${endDate.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}.
            `;
            activeCard.appendChild(warning);
        }
    }

    // 2. Button Logic
    const freeBtn = document.querySelector('.freePlan button');
    const proBtns = [
        document.getElementById('pro-trial-btn'),
        document.getElementById('pro-instant-btn')
    ];
    const plusBtns = [
        document.getElementById('plus-trial-btn'),
        document.getElementById('plus-instant-btn')
    ];

    if (!isPaidSubscription) {
        // Free/No Plan: Hide Free Button
        if (freeBtn) freeBtn.style.display = 'none';
    } else {
        // Paid Plan: All buttons -> Manage/Upgrade/Downgrade
        if (freeBtn) {
            freeBtn.style.display = 'block';
            convertToManageButton(freeBtn, 'free', plan);
        }
        handlePaidButtons(proBtns, 'clinic_pro', plan);
        handlePaidButtons(plusBtns, 'clinic_plus', plan);
    }
}


function handlePaidButtons(buttons, targetPlan, currentPlan) {
    const [btn1, btn2] = buttons;
    if (btn1 && btn2) {
        btn2.style.display = 'none'; // Hide instant button
        convertToManageButton(btn1, targetPlan, currentPlan);
        btn1.style.width = '100%';
    }
}

function convertToManageButton(btn, targetPlan, currentPlan) {
    // Check if simple button or needs replacement to clear listeners
    // Safest to just clone/replace
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    // Determine button text based on plan hierarchy
    const targetLevel = PLAN_LEVELS[targetPlan] || 0;
    const currentLevel = PLAN_LEVELS[currentPlan] || 0;

    if (targetLevel > currentLevel) {
        newBtn.textContent = 'Actualizar Suscripción';
    } else if (targetLevel < currentLevel) {
        newBtn.textContent = 'Downgrade Plan';
    } else {
        newBtn.textContent = 'Gestionar Suscripción';
    }

    newBtn.className = ''; // remove existing classes
    newBtn.style.cssText = `
        background-color: #4F46E5;
        color: white;
        width: 100%;
        padding: 0.75rem;
        border-radius: 0.5rem;
        font-weight: 600;
        cursor: pointer;
        border: none;
        margin-top: 1rem;
        transition: background-color 0.2s;
        display: block;
    `;
    newBtn.onmouseover = () => newBtn.style.backgroundColor = '#4338ca';
    newBtn.onmouseout = () => newBtn.style.backgroundColor = '#4F46E5';
    newBtn.addEventListener('click', handleManageSubscription);
}

async function handleManageSubscription(e) {
    e.preventDefault();
    e.stopPropagation();
    const btn = e.target;
    // Prevent double clicks
    if (btn.disabled) return;

    const originalText = btn.textContent;

    btn.disabled = true;
    btn.textContent = 'Cargando...';

    const token = localStorage.getItem('authToken');
    if (!token) {
        showToast('Sesión expirada. Por favor inicia sesión.', 'error');
        return;
    }

    try {
        const response = await fetch('https://medinet360-api.onrender.com/api/paddle/create-portal-session', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.url) {
                window.open(data.url, '_blank');
            } else {
                throw new Error('No valid URL returned');
            }
        } else {
            throw new Error('Error creating portal session');
        }
    } catch (error) {
        console.error('Error opening portal:', error);
        showToast('Error al abrir el portal de suscripción', 'error');
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

function attachButtonListeners() {
    // Only attach standard listeners if NOT already converted (though logic above handles replacement)
    // Detailed logic: this function runs initally. checkSubscriptionStatus runs async.
    // If checkSubscriptionStatus finds active sub, it will REPLACE buttons, removing these listeners.

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
        customData: {
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