import { showToast } from "./utils.js";
import i18n from "./i18n.js";

const logo = document.querySelector('.logo');
logo.style.cursor = 'pointer';

// Redirect to homepage on logo click
logo.addEventListener('click', () => {
    window.location.href = 'index.html';
});

const form = document.querySelector('.signInForm');
const submitBtn = form.querySelector('.submitButton');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const togglePassword = document.getElementById('togglePassword');
const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');

// Password validation feedback
const rules = {
    length: document.getElementById('length'),
    special: document.getElementById('special'),
    number: document.getElementById('number'),
    uppercase: document.getElementById('uppercase')
};

passwordInput.addEventListener('input', () => {
    const value = passwordInput.value;

    // Check conditions
    const hasLength = value.length >= 8;
    const hasSpecial = /[@%$]/.test(value);
    const hasNumber = /\d/.test(value);
    const hasUppercase = /[A-Z]/.test(value);

    // Update visual feedback
    if (rules.length) rules.length.classList.toggle('valid', hasLength);
    if (rules.special) rules.special.classList.toggle('valid', hasSpecial);
    if (rules.number) rules.number.classList.toggle('valid', hasNumber);
    if (rules.uppercase) rules.uppercase.classList.toggle('valid', hasUppercase);
});

// Extract token from URL
// Assuming URL is like /reset-password/TOKEN or similar structure where token is the last segment
const getTokenFromUrl = () => {
    const path = window.location.pathname;
    const segments = path.split('/').filter(Boolean); // Remove empty strings
    // If the path is /reset-password/TOKEN, the token is the last segment
    if (segments.length > 0) {
        return segments[segments.length - 1];
    }
    return null;
};

const token = getTokenFromUrl();

// Optional: Validate if token exists on load, otherwise redirect or show error
if (!token) {
    showToast(i18n.t('auth.resetPassword.invalidToken') || 'Invalid or missing reset token', 'error', 5000);
    // You might want to disable the form or redirect
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = i18n.t('auth.resetPassword.resetting') || 'Resetting...';

    const password = passwordInput?.value;
    const confirmPassword = confirmPasswordInput?.value;

    if (!password || !confirmPassword) {
        showToast(i18n.t('auth.resetPassword.fillAll') || 'Please fill in all fields', 'error', 3500);
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        return;
    }

    // Validate using regex (same pattern as HTML)
    const passwordPattern = /(?=.*[A-Z])(?=.*\d)(?=.*[@%$]).{8,}/;
    if (!passwordPattern.test(password)) {
        showToast(i18n.t('auth.resetPassword.requirementError') || 'Password does not meet requirements', 'error', 3500);
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        return;
    }

    if (password !== confirmPassword) {
        showToast(i18n.t('auth.resetPassword.matchError') || 'Passwords do not match', 'error', 3500);
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        return;
    }

    if (!token) {
        showToast(i18n.t('auth.resetPassword.missingToken') || 'Missing reset token. Please check your email link.', 'error', 4500);
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        return;
    }

    const API_RESET_PASSWORD = `https://medinet360-api.onrender.com/api/auth/reset-password/${token}`;

    try {
        const res = await fetch(API_RESET_PASSWORD, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        const payload = await res.json();

        if (!res.ok) {
            // Handle specific error for expired token if backend sends distinct message
            if (payload.error && (payload.error.includes('expire') || payload.error.includes('expired'))) {
                throw new Error(i18n.t('auth.resetPassword.expiredToken') || 'Token expired. Please request a new link.');
            }
            throw new Error(payload?.error || i18n.t('auth.resetPassword.errorGeneric') || 'Error resetting password');
        }

        showToast(payload.message || i18n.t('auth.resetPassword.success') || 'Password reset successfully', 'success', 4000);

        form.reset();

        // Redirect to login after success
        setTimeout(() => {
            window.location.href = '/signIn.html';
        }, 2000);

    } catch (err) {
        console.error(err);
        showToast(err.message || i18n.t('auth.resetPassword.errorGeneric') || 'Error resetting password', 'error', 5000);
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
});

// Toggle password visibility
togglePassword.addEventListener('click', () => {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    togglePassword.src = type === 'password' ? '/images/eye-closed.png' : '/images/eye-open.png';
});

toggleConfirmPassword.addEventListener('click', () => {
    const type = confirmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    confirmPasswordInput.setAttribute('type', type);
    toggleConfirmPassword.src = type === 'password' ? '/images/eye-closed.png' : '/images/eye-open.png';
});
