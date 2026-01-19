import { showToast } from "./utils";
import i18n from "./i18n.js";

const logo = document.querySelector('.logo');
logo.style.cursor = 'pointer';

// Redirect to homepage on logo click
logo.addEventListener('click', () => {
  window.location.href = 'index.html';
});

const form = document.querySelector('.signInForm');
const submitBtn = form.querySelector('.submitButton');
const togglePassword = document.getElementById('togglePassword')
const passwordInput = document.getElementById('password')

// Cambia esto por la URL real de tu API
const API_LOGIN = 'https://medinet360-api.onrender.com/api/auth/login';

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  const originalText = submitBtn.textContent;
  submitBtn.textContent = i18n.t('auth.signIn.signingIn') || 'Signing in...';

  const email = form.email?.value?.trim();
  const password = form.password?.value;

  if (!email || !password) {
    showToast(i18n.t('auth.signIn.enterEmailPass') || 'Please enter email and password', 'error', 3500);
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
    return;
  }

  try {
    const res = await fetch(API_LOGIN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const payload = await res.json();

    if (!res.ok) {
      throw new Error(payload?.error || payload?.message || i18n.t('auth.signIn.errorGeneric') || 'Login failed');
    }

    const { token, user } = payload;
    if (!token) throw new Error('No token received from server');

    localStorage.setItem('authToken', token);
    if (user) localStorage.setItem('currentUser', JSON.stringify(user));

    showToast(i18n.t('auth.signIn.success') || 'Signed in successfully', 'success', 900);

    // short delay to show toast, then redirect
    setTimeout(() => {
      window.location.href = '/dashboard/home.html';
    }, 900);

  } catch (err) {
    showToast(err.message || i18n.t('auth.signIn.errorGeneric') || 'Error signing in', 'error', 4500);

    // Check if error is related to email verification
    if (err.message.includes('verifica tu correo') || err.message.includes('verify') || err.message.includes('vérifier')) {
      const resendContainer = document.getElementById('resendContainer');
      if (resendContainer) {
        resendContainer.style.display = 'block';

        const resendBtn = document.getElementById('resendBtn');
        // Remove old listeners to avoid duplicates if multiple errors
        const newBtn = resendBtn.cloneNode(true);
        resendBtn.parentNode.replaceChild(newBtn, resendBtn);

        newBtn.addEventListener('click', async (evt) => {
          evt.preventDefault();
          newBtn.textContent = i18n.t('auth.signIn.sending') || 'Sending...';
          newBtn.style.pointerEvents = 'none';

          try {
            const resVerify = await fetch('https://medinet360-api.onrender.com/api/auth/resend-verification', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email })
            });
            const dataVerify = await resVerify.json();

            if (resVerify.ok) {
              showToast(dataVerify.message || i18n.t('auth.signIn.resendSuccess') || 'Verification email sent!', 'success', 4000);
              newBtn.textContent = i18n.t('auth.signIn.emailSent') || 'Email Sent!';
            } else {
              showToast(dataVerify.error || i18n.t('auth.signIn.resendFailed') || 'Failed to resend email', 'error');
              newBtn.textContent = i18n.t('auth.verifyEmail.button') || 'Resend Verification Email';
              newBtn.style.pointerEvents = 'auto';
            }
          } catch (error) {
            console.error(error);
            showToast(i18n.t('auth.signIn.requestError') || 'Error sending request', 'error');
            newBtn.textContent = i18n.t('auth.verifyEmail.button') || 'Resend Verification Email';
            newBtn.style.pointerEvents = 'auto';
          }
        });
      }
    }

  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
});

// Helper para peticiones autenticadas (usar en el resto del frontend)
export function authFetch(url, options = {}) {
  const token = localStorage.getItem('authToken');
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
}

// Toggle password visibility
togglePassword.addEventListener('click', () => {
  const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password'
  passwordInput.setAttribute('type', type)
  togglePassword.src = type === 'password' ? '/images/eye-closed.png' : '/images/eye-open.png'
})