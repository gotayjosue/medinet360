// Set the current year in the footer
const currentYear = new Date().getFullYear();
document.getElementById('currentYear').textContent = currentYear;

// Toggle navigation menu
const menuButton = document.getElementById('menuButton');
const navMenu = document.getElementById('navigation');

menuButton.addEventListener('click', () => {
    navMenu.classList.toggle('open');
    menuButton.classList.toggle('open');
});
