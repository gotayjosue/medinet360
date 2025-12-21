import { showToast } from "./utils"

const doctorContainer = document.querySelector('.doctor')
const assistantContainer = document.querySelector('.assistant')
const roleSelect = document.getElementById('role')
const clinicName = document.getElementById('clinicName')
const clinicId = document.getElementById('clinicId')
const togglePassword = document.getElementById('togglePassword')
const passwordInput = document.getElementById('password')
const logo = document.querySelector('.logo');
logo.style.cursor = 'pointer';
const form = document.querySelector('.signUpForm')

// Redirect to homepage on logo click
logo.addEventListener('click', () => {
    window.location.href = 'index.html';
});

// Show/hide fields based on role selection
roleSelect.addEventListener('change', (e) => {
    const selectedRole = e.target.value

    if (selectedRole === 'doctor') {
        doctorContainer.classList.add('visible')
        clinicId.required = false
        clinicName.required = true
        assistantContainer.classList.remove('visible')
    } else if (selectedRole === 'assistant') {
        clinicName.required = false
        clinicId.required = true
        assistantContainer.classList.add('visible')
        doctorContainer.classList.remove('visible')
    }
})

// Toggle password visibility
togglePassword.addEventListener('click', () => {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password'
    passwordInput.setAttribute('type', type)
    togglePassword.src = type === 'password' ? '/images/eye-closed.png' : '/images/eye-open.png'
})

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
    rules.length.classList.toggle('valid', hasLength);
    rules.special.classList.toggle('valid', hasSpecial);
    rules.number.classList.toggle('valid', hasNumber);
    rules.uppercase.classList.toggle('valid', hasUppercase);
});

const API_SIGNUP = 'https://medinet360-api.onrender.com/api/auth/register';

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const lastName = document.getElementById("lastName").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const role = document.getElementById("role").value; // doctor o assistant
    const clinicName = document.getElementById("clinicName")?.value.trim() || "";
    const clinicId = document.getElementById("clinicId")?.value.trim() || "";

    // Validaciones básicas
    if (!name || !lastName || !email || !password || !role) {
        showToast("Por favor completa todos los campos obligatorios.", "error");
        return;
    }

    // Mostrar cargando o deshabilitar el botón
    const submitBtn = form.querySelector(".submitButton");
    const originalText = submitBtn.textContent
    submitBtn.disabled = true;
    submitBtn.textContent = "Registering...";

    try {
        const response = await fetch(API_SIGNUP, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name,
                lastName,
                email,
                password,
                role,
                clinicName,
                clinicId,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            // Si el backend devuelve { errors: [...] }
            if (data.errors && Array.isArray(data.errors)) {
                const msgs = data.errors.map(e => e.msg).join('<br>');
                showToast(msgs, 'error');   // showToast debe aceptar HTML
            } else {
                showToast(data.error || data.message || "Failed to sign up", "error")
            }
            return;
        }

        // Use message from backend which probably includes verification instruction
        showToast(data.message || 'Signed up successfully! Please verify your email.', 'success', 4000);
        form.reset();

        setTimeout(() => {
            window.location.href = '/signIn.html'
        }, 4000)

    } catch (err) {
        console.error('❌ Error:', err);
        showToast(err.message || 'Error signing up', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
});
