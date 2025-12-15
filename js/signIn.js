import { showToast } from "./utils";

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
  submitBtn.textContent = 'Signing in...';

  const email = form.email?.value?.trim();
  const password = form.password?.value;

  if (!email || !password) {
    showToast('Please enter email and password', 'error', 3500);
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
      throw new Error(payload?.message || 'Login failed');
    }

    const { token, user } = payload;
    if (!token) throw new Error('No token received from server');

    localStorage.setItem('authToken', token);
    if (user) localStorage.setItem('currentUser', JSON.stringify(user));

    showToast('Signed in successfully', 'success', 900);

    // short delay to show toast, then redirect
    setTimeout(() => {
      window.location.href = '/dashboard/home.html';
    }, 900);

  } catch (err) {
    showToast(err.message || 'Error signing in', 'error', 4500);
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