import { checkAuth, requireAuth } from './utils.js';
const logo = document.querySelector('.logo');
logo.style.cursor = 'pointer'

//Select element
const patientsSelect = document.getElementById('patientSelect');

//Get all the patients from the server and store them here
let patientsList = []

async function loadPatients() {
  // 1. Obtener el token guardado en localStorage
  const token = localStorage.getItem('authToken');
  if (!token) {
    console.warn('No hay token de autorización.');
    return;
  }

  try {
    const res = await fetch('https://medinet360api.vercel.app/api/patients', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`   // <-- cabeza de autorización
      }
    });

    if (!res.ok) {
      throw new Error(`Error ${res.status}: ${res.statusText}`);
    }

    // 2. La API devuelve un array de pacientes
    const data = await res.json();          // <-- [{...},{...}]
    // Si tu API envía { patients: [...] } cambia a data.patients
    patientsList = Array.isArray(data) ? data : data.patients;
    renderPatients(patientsList);
  } catch (err) {
    console.error('🔥Error al cargar pacientes:', err);
  }
}

let optionValue = 0

// Inicializa Tom Select en el <select> con id 'select-paciente'
    const tomSelect = new TomSelect("#patientSelect",{
        // Opciones (opcional)
        create: false, // Evita que el usuario cree nuevos pacientes
        sortField: {   // Ordena la lista
            field: "text",
            direction: "asc"
        }
    });
    
//function to put patients names inside a select
function renderPatients(patients) {

    patients.map(p => {

        optionValue++

        const option = document.createElement('option')

        option.textContent = `${p.name} ${p.lastName}`
        option.value = `option${optionValue}` //Every option has its own value

        patientsSelect.appendChild(option)
    })

    tomSelect.sync();
}


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


document.addEventListener('DOMContentLoaded', () =>{
    checkAuth();
    requireAuth();
    loadPatients()
})


