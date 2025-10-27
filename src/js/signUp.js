const doctorContainer = document.querySelector('.doctor')
const assistantContainer = document.querySelector('.assistant')
const roleSelect = document.getElementById('role')
const clinicName = document.getElementById('clinicName')
const clinicId = document.getElementById('clinicId')
const togglePassword = document.getElementById('togglePassword')
const passwordInput = document.getElementById('password')
const logo = document.querySelector('.logo');
logo.style.cursor = 'pointer';

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
