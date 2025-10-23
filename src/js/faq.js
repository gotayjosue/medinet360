import { expandDetails } from './utils.js';
// Set the current year in the footer
const currentYear = new Date().getFullYear();
document.getElementById('currentYear').textContent = currentYear;

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

expandDetails();