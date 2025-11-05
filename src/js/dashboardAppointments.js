import { checkAuth, requireAuth } from './utils.js';
const logo = document.querySelector('.logo');
logo.style.cursor = 'pointer'

document.addEventListener('DOMContentLoaded', () =>{
    checkAuth();
    requireAuth();
})

logo.addEventListener('click', () =>{
    window.location.href = '../index.html'
})

//Filters functions

const allAppointmentsButton = document.getElementById('allAppointments');
const scheduleAppointmentsButton = document.getElementById('scheduleAppointments');
const completedAppointmentsButton = document.getElementById('completedAppointments');
const canceledAppointmentsButton = document.getElementById('canceledAppointments')

//Modal elements
const appointmentButton = document.getElementById('newAppointmentButton');
const modal = document.getElementById('appointmentModal')
const closeButton = document.getElementById('closeButton')

appointmentButton.addEventListener('click', () =>{
    modal.showModal();
})

closeButton.addEventListener('click', () =>{
    modal.close()
})



