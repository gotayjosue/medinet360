import { showToast } from "./utils.js";

const statusIcon = document.getElementById('statusIcon');
const statusTitle = document.getElementById('statusTitle');
const statusMessage = document.getElementById('statusMessage');
const signInLink = document.getElementById('signInLink');
const signInBtn = document.getElementById('signInLink'); // Same as link but using clearer name for logic

// Extract token from URL
const getTokenFromUrl = () => {
    const path = window.location.pathname;
    const segments = path.split('/').filter(Boolean);
    // Assuming /verify-email/TOKEN
    if (segments.length > 0) {
        return segments[segments.length - 1];
    }
    return null;
};

const token = getTokenFromUrl();

const verifyEmail = async () => {
    if (!token) {
        showError('Invalid verification link.');
        return;
    }

    try {
        const response = await fetch(`https://medinet360-api.onrender.com/api/auth/verify-email/${token}`);
        const data = await response.json();

        if (response.ok) {
            showSuccess(data.message || 'Email verified successfully!');
        } else {
            // Check if already verified based on message or backend code, 
            // but usually we can just show the error or a specific message
            showError(data.error || 'Verification failed.');
        }
    } catch (error) {
        console.error('Verification error:', error);
        showError('An error occurred. Please try again later.');
    }
};

const showSuccess = (message) => {
    statusIcon.textContent = '🎉';
    statusIcon.classList.remove('loading');
    statusTitle.textContent = 'Email Verified!';
    statusMessage.textContent = 'Thank you for verifying your email. You can now access your account.';
    statusMessage.classList.add('success-text');

    signInBtn.style.display = 'inline-block';

    // Trigger confetti
    if (window.confetti) {
        window.confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#564b7a', '#8b8daf', '#ffeb3b', '#16a34a']
        });
    }
};

const showError = (message) => {
    statusIcon.textContent = '❌';
    statusIcon.classList.remove('loading');
    statusTitle.textContent = 'Verification Failed';
    statusMessage.textContent = message;
    statusMessage.classList.add('error-text');

    signInBtn.textContent = 'Back to Sign In';
    signInBtn.style.display = 'inline-block';
};

// Start verification on load
verifyEmail();

const logo = document.querySelector('.logo');
if (logo) {
    logo.style.cursor = 'pointer';
    logo.addEventListener('click', () => {
        window.location.href = '/index.html';
    });
}
