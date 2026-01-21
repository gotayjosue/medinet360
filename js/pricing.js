// Verifying the user session status
import { checkAuth, showToast } from './utils.js';
import { initializePaddle } from '@paddle/paddle-js';
import i18n from './i18n.js';

// Paddle Configuration
const PADDLE_CLIENT_TOKEN = import.meta.env.VITE_PADDLE_CLIENT_TOKEN;
const PRICE_IDS = {
    PRO_INSTANT: import.meta.env.VITE_PADDLE_PRICE_ID_PRO_INSTANT,
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

const PLAN_PRICE_IDS = {
    'free': 'free',
    'clinic_pro': PRICE_IDS.PRO_INSTANT,
    'clinic_plus': PRICE_IDS.PLUS_INSTANT
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
                badge.textContent = i18n.t('pricing.selectedPlanBadge', 'Actual Plan');
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
    const proBtn = document.getElementById('pro-instant-btn');
    const plusBtn = document.getElementById('plus-instant-btn');

    if (!isPaidSubscription) {
        // Free/No Plan: Hide Free Button
        if (freeBtn) freeBtn.style.display = 'none';
    } else {
        // Paid Plan: All buttons -> Manage/Upgrade/Downgrade
        if (freeBtn) {
            freeBtn.style.display = 'block';
            convertToManageButton(freeBtn, 'free', plan);
        }
        if (proBtn) convertToManageButton(proBtn, 'clinic_pro', plan);
        if (plusBtn) convertToManageButton(plusBtn, 'clinic_plus', plan);
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

    let actionType = 'manage'; // manage, upgrade, downgrade

    if (targetLevel > currentLevel) {
        newBtn.textContent = i18n.t('pricing.managingButtons.updatePlanBtn', 'Upgrade Plan');
        actionType = 'upgrade';
    } else if (targetLevel < currentLevel) {
        newBtn.textContent = i18n.t('pricing.managingButtons.downgradePlanBtn', 'Downgrade plan');
        actionType = 'downgrade';
    } else {
        newBtn.textContent = i18n.t('pricing.managingButtons.managePlanBtn', 'Manage Plan');
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

    if (targetLevel !== currentLevel) {
        // Upgrade or Downgrade logic
        const targetPriceId = PLAN_PRICE_IDS[targetPlan];
        if (targetPriceId) {
            newBtn.addEventListener('click', (e) => {
                showUpdateConfirmation(actionType, () => {
                    handleUpdateSubscription(newBtn, targetPriceId); // Pass btn explicitly
                });
            });
        } else {
            console.error('Price ID not found for plan:', targetPlan);
            newBtn.addEventListener('click', handleManageSubscription); // Fallback
        }
    } else {
        // Manage Subscription logic (Portal)
        newBtn.addEventListener('click', handleManageSubscription);
    }
}

function showUpdateConfirmation(actionType, onConfirm) {
    // Remove existing modal if any
    const existingModal = document.getElementById('updateConfirmationModal');
    if (existingModal) existingModal.remove();

    const isUpgrade = actionType === 'upgrade';

    // Content Configuration
    const config = isUpgrade ? {
        title: 'Upgrade Subscription',
        subtitle: 'Immediate Payment',
        message: 'You are about to upgrade your subscription. You will be charged the prorated difference immediately.',
        iconBg: '#EEF2FF',
        iconColor: '#4F46E5',
        confirmBtnBg: '#4F46E5',
        confirmBtnHover: '#4338CA',
        icon: `<svg style="width: 24px; height: 24px; color: #4F46E5;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
               </svg>`
    } : {
        title: 'Downgrade Subscription',
        subtitle: 'Credit on Next Invoice. Free plan does not apply for credits.',
        message: 'You are about to downgrade your subscription. The difference will be applied as credit towards your next invoice. The change will take effect immediately. For the free plan, the downgrade will take effect in the next invoice.',
        iconBg: '#FEF3C7',
        iconColor: '#D97706',
        confirmBtnBg: '#D97706',
        confirmBtnHover: '#B45309',
        icon: `<svg style="width: 24px; height: 24px; color: #D97706;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"></path>
               </svg>`
    };

    const modal = document.createElement('dialog');
    modal.id = 'updateConfirmationModal';

    // Inline CSS for the dialog element itself
    Object.assign(modal.style, {
        border: 'none',
        borderRadius: '12px',
        padding: '0',
        maxWidth: '28rem',
        width: '90%',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        backgroundColor: 'transparent',
        margin: 'auto'
    });

    modal.innerHTML = `
    <div style="background-color: white; padding: 24px; border-radius: 12px;">
      <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
        <div style="background-color: ${config.iconBg}; padding: 12px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
            ${config.icon}
        </div>
        <div>
          <h3 style="font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 4px 0;">${config.title}</h3>
          <p style="font-size: 14px; color: #6B7280; margin: 0;">${config.subtitle}</p>
        </div>
      </div>
      <p style="color: #374151; margin: 0 0 24px 0; line-height: 1.5;">${config.message}</p>
      <div style="display: flex; gap: 12px;">
        <button id="cancelUpdate" style="flex: 1; background-color: #E5E7EB; color: #374151; padding: 10px 16px; border-radius: 6px; border: none; cursor: pointer; font-weight: 500; transition: background-color 0.2s;">
          Cancel
        </button>
        <button id="confirmUpdate" style="flex: 1; background-color: ${config.confirmBtnBg}; color: white; padding: 10px 16px; border-radius: 6px; border: none; cursor: pointer; font-weight: 500; transition: background-color 0.2s;">
          Confirm
        </button>
      </div>
    </div>
    `;

    // Add backdrop styling
    const style = document.createElement('style');
    style.textContent = `
        #updateConfirmationModal::backdrop {
            background-color: rgba(0, 0, 0, 0.5);
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(modal);
    modal.showModal();

    const cancelBtn = modal.querySelector('#cancelUpdate');
    const confirmBtn = modal.querySelector('#confirmUpdate');

    // Hover effects
    cancelBtn.addEventListener('mouseenter', () => {
        cancelBtn.style.backgroundColor = '#D1D5DB';
    });
    cancelBtn.addEventListener('mouseleave', () => {
        cancelBtn.style.backgroundColor = '#E5E7EB';
    });

    confirmBtn.addEventListener('mouseenter', () => {
        confirmBtn.style.backgroundColor = config.confirmBtnHover;
    });
    confirmBtn.addEventListener('mouseleave', () => {
        confirmBtn.style.backgroundColor = config.confirmBtnBg;
    });

    cancelBtn.addEventListener('click', () => {
        modal.close();
        modal.remove();
        style.remove();
    });

    confirmBtn.addEventListener('click', () => {
        modal.close();
        modal.remove();
        style.remove();
        onConfirm();
    });
}

async function handleUpdateSubscription(btn, newPriceId) {
    // e.preventDefault(); // No longer event driven directly
    // e.stopPropagation();
    // const btn = e.target;
    if (btn.disabled) return;

    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Cargando...';

    const token = localStorage.getItem('authToken');
    if (!token) {
        showToast('Sesión expirada', 'error');
        btn.disabled = false;
        btn.textContent = originalText;
        return;
    }

    try {
        const response = await fetch('https://medinet360-api.onrender.com/api/paddle/update-subscription', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ newPriceId })
        });

        const data = await response.json();

        if (response.ok) {
            if (data.url) {
                // Normal case: Redirect to checkout to pay difference
                window.location.href = data.url;
            } else if (data.success) {
                // Automatic case: Paddle updated without charge (e.g. deferred downgrade)
                // Show success and reload to see changes
                showToast(data.message || 'Plan actualizado correctamente', 'success');
                setTimeout(() => window.location.reload(), 2000);
            } else {
                throw new Error(data.message || 'Error desconocido');
            }
        } else {
            throw new Error(data.message || 'Error al actualizar suscripción');
        }
    } catch (error) {
        console.error('Update error:', error);
        showToast(error.message, 'error');
        btn.disabled = false;
        btn.textContent = originalText;
    }
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

    const proInstantBtn = document.getElementById('pro-instant-btn');
    const plusInstantBtn = document.getElementById('plus-instant-btn');

    if (proInstantBtn) proInstantBtn.addEventListener('click', () => openCheckout(PRICE_IDS.PRO_INSTANT));
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