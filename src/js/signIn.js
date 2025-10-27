const logo = document.querySelector('.logo');
logo.style.cursor = 'pointer';

// Redirect to homepage on logo click
logo.addEventListener('click', () => {
    window.location.href = 'index.html';
});