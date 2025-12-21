import { showToast } from "./utils.js";

const logo = document.querySelector('.logo');
logo.style.cursor = 'pointer';

// Redirect to homepage on logo click
logo.addEventListener('click', () => {
    window.location.href = 'index.html';
});

const form = document.querySelector('.signInForm');
const submitBtn = form.querySelector('.submitButton');

const API_FORGOT_PASSWORD = 'https://medinet360-api.onrender.com/api/auth/forgot-password';

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Sending...';

  const email = form.email?.value?.trim();

  if (!email) {
    showToast('Please enter your email', 'error', 3500);
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
    return;
  }

  try {
    const res = await fetch(API_FORGOT_PASSWORD, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const payload = await res.json();

    if (!res.ok) {
      throw new Error(payload?.error || 'Error sending recovery email');
    }

    showToast(payload.message || 'Recovery email sent successfully', 'success', 5000);

    // Disable button permanently or clear form to prevent spamming
    form.reset();
    submitBtn.textContent = 'Email Sent';
    
    // Optional: Redirect to login after a few seconds
    setTimeout(() => {
       window.location.href = '/signIn.html';
    }, 5000);

  } catch (err) {
    showToast(err.message || 'Error sending recovery email', 'error', 4500);
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
});
