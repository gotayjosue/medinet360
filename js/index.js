// Verifying the user sesion status
import { checkAuth } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});

// Set the current year in the footer
const currentYear = new Date().getFullYear();
document.getElementById('currentYear').textContent = currentYear;
const logo = document.querySelector('.logo');
logo.style.cursor = 'pointer';

// Redirect to homepage on logo click
logo.addEventListener('click', () => {
    window.location.href = 'index.html';
});

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

//Sign In button function
const signInButton = document.getElementById('signInButton');

signInButton.addEventListener('click', () =>{
    window.location.href = '/signIn.html';
})

//Sign Up button function
const signUpButtons = document.querySelectorAll('.startedButton button');

signUpButtons.forEach(button => {
    button.addEventListener('click', () =>{
        window.location.href = '/signUp.html';
    });
});


