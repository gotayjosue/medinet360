import { checkAuth, requireAuth, showToast, fixDateForUTC } from './utils.js';

const logo = document.querySelector('.logo');
logo.style.cursor = 'pointer'
logo.addEventListener('click', () =>{
    window.location.href = '../index.html'
})

document.addEventListener('DOMContentLoaded', () =>{
    checkAuth();
    requireAuth();
    loadPatients()
    loadAppointments()
})

//Modal elements
const appointmentButton = document.getElementById('newAppointmentButton');
const modal = document.getElementById('appointmentModal')
const closeButton = document.getElementById('closeButton')
const cancelButton = document.getElementById('cancelButton')

appointmentButton.addEventListener('click', () =>{
    modal.showModal();
})

closeButton.addEventListener('click', () =>{
    modal.close()
})

cancelButton.addEventListener('click', () => {
  modal.close()
})

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

        const option = document.createElement('option')

        option.textContent = `${p.name} ${p.lastName}`
        option.value = p._id 

        patientsSelect.appendChild(option)
    })

    tomSelect.sync();
}


// -------------------------------
// ADD APPOINTMENT FUNCTION
// -------------------------------

const appointmentForm = document.getElementById('appointmentForm');

appointmentForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  /* 1️⃣ Validar token en storage */
  const token = localStorage.getItem('authToken');
  if (!token) {
    alert('Authentication required. Please sign in again.');
    window.location.href = '../signIn.html';
    return;
  }

  /* 2️⃣ Construir cuerpo de la petición */
  const formData = {
    patientId: document.getElementById('patientSelect').value.trim(),
    date: document.getElementById('date').value.trim(),
    hour: document.getElementById('hour').value.trim(),
    duration: document.getElementById('duration').value.trim(),
    status: document.getElementById('status').value.trim(),
    description: document.getElementById('notes').value.trim(),
  };

  /* 3️⃣ Enviar POST con JWT */
  try {
    const response = await fetch('https://medinet360api.vercel.app/api/appointments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`   // ← importante
      },
      body: JSON.stringify(formData)
    });

    /* 4️⃣ Parsear la respuesta solo una vez */
    const data = await response.json();

    if (!response.ok) {
      // Si el backend devuelve { errors: [...] }
      if (data.errors && Array.isArray(data.errors)) {
        const msgs = data.errors.map(e => e.msg).join('<br>');
        showToast(msgs, 'error');   // showToast debe aceptar HTML
      } else {
        throw new Error(data.error || data.message || 'Failed to create appointment');
      }
    } else {
      showToast('appointment created successfully!', 'success');
      appointmentForm.reset();
      appointmentModal.close();
      window.location.reload(); // Recargar la página para ver la nueva cita
    }
  } catch (err) {
    console.error('❌ Error:', err);
    showToast(err.message || 'Error creating appointment', 'error');
  }
});

//Filters functions

const allAppointmentsButton = document.getElementById('allAppointments');
const scheduleAppointmentsButton = document.getElementById('scheduleAppointments');
const completedAppointmentsButton = document.getElementById('completedAppointments');
const canceledAppointmentsButton = document.getElementById('canceledAppointments')

//Event listeners for filter buttons
allAppointmentsButton?.addEventListener('click', () => {
  renderAppointments(appointmentsList);
  allAppointmentsButton.classList.add("active");
  scheduleAppointmentsButton.classList.remove("active");
  completedAppointmentsButton.classList.remove("active");
  canceledAppointmentsButton.classList.remove("active");
});

scheduleAppointmentsButton?.addEventListener('click', () => {
  const filtered = appointmentsList.filter(apt => apt.status === 'scheduled');
  renderAppointments(filtered);
  scheduleAppointmentsButton.classList.add("active");
  allAppointmentsButton.classList.remove("active");
  completedAppointmentsButton.classList.remove("active");
  canceledAppointmentsButton.classList.remove("active");
});

completedAppointmentsButton?.addEventListener('click', () => {
  const filtered = appointmentsList.filter(apt => apt.status === 'completed');
  renderAppointments(filtered);
  completedAppointmentsButton.classList.add("active");
  allAppointmentsButton.classList.remove("active");
  scheduleAppointmentsButton.classList.remove("active");
  canceledAppointmentsButton.classList.remove("active");
});

canceledAppointmentsButton?.addEventListener('click', () => {
  const filtered = appointmentsList.filter(apt => apt.status === 'canceled');
  renderAppointments(filtered);
  canceledAppointmentsButton.classList.add("active");
  allAppointmentsButton.classList.remove("active");
  scheduleAppointmentsButton.classList.remove("active");
  completedAppointmentsButton.classList.remove("active");
});


let appointmentsList = [];

// Función para cargar citas del servidor
async function loadAppointments() {
  const token = localStorage.getItem('authToken');
  if (!token) {
    console.warn('No hay token de autorización.');
    return;
  }

  try {
    const res = await fetch('https://medinet360api.vercel.app/api/appointments', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      throw new Error(`Error ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    appointmentsList = Array.isArray(data) ? data : data.appointments || [];
    renderAppointments(appointmentsList);
  } catch (err) {
    console.error('🔥 Error al cargar citas:', err);
  }
}

// Función para renderizar las citas
function renderAppointments(appointments) {
  const today = new Date().toISOString().split('T')[0];
  
  const todayAppts = appointments.filter(apt => {
    const aptDate = apt.date;
    return aptDate === today;
  });

  const upcomingAppts = appointments.filter(apt => {
    const aptDate = new Date(apt.date).toISOString().split('T')[0];
    return aptDate > today;
  }).sort((a, b) => new Date(a.date) - new Date(b.date));

  renderTodayAppointments(todayAppts);
  renderUpcomingAppointments(upcomingAppts);
}

// Función para renderizar citas de hoy
function renderTodayAppointments(appointments) {
  const tbody = document.getElementById('todayAppointmentsBody');
  
  if (!appointments.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="px-6 py-8 text-center text-gray-500 text-sm">
          No hay citas para hoy
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = appointments.map(apt => `
    <tr class="hover:bg-gray-50 transition-colors">
      <td class="px-6 py-4 text-sm font-medium text-gray-900">
        ${apt.patientId?.name || 'Paciente'} ${apt.patientId?.lastName || ''}
      </td>
      <td class="px-6 py-4 text-sm text-gray-700">
        ${apt.hour}
      </td>
      <td class="px-6 py-4 text-sm text-gray-700">
        ${apt.duration} min
      </td>
      <td class="px-6 py-4 text-sm">
        <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(apt.status)}">
          ${getStatusLabel(apt.status)}
        </span>
      </td>
      <td class="px-6 py-4 text-sm">
        <button onclick="editAppointment('${apt._id}')" class="text-blue-600 hover:text-blue-900 mr-2">Editar</button>
        <button onclick="deleteAppointment('${apt._id}')" class="text-red-600 hover:text-red-900">Eliminar</button>
      </td>
    </tr>
  `).join('');
}

// Función para renderizar próximas citas
function renderUpcomingAppointments(appointments) {
  const tbody = document.getElementById('upcomingAppointmentsBody');
  
  if (!appointments.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="px-6 py-8 text-center text-gray-500 text-sm">
          No hay citas próximas
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = appointments.map(apt => `
    <tr class="hover:bg-gray-50 transition-colors">
      <td class="px-6 py-4 text-sm font-medium text-gray-900">
        ${apt.patientId?.name || 'Paciente'} ${apt.patientId?.lastName || ''}
      </td>
      <td class="px-6 py-4 text-sm text-gray-700">
        ${formatDate(apt.date)}
      </td>
      <td class="px-6 py-4 text-sm text-gray-700">
        ${apt.hour}
      </td>
      <td class="px-6 py-4 text-sm">
        <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(apt.status)}">
          ${getStatusLabel(apt.status)}
        </span>
      </td>
      <td class="px-6 py-4 text-sm">
        <button onclick="editAppointment('${apt._id}')" class="text-blue-600 hover:text-blue-900 mr-2">Editar</button>
        <button onclick="deleteAppointment('${apt._id}')" class="text-red-600 hover:text-red-900">Eliminar</button>
      </td>
    </tr>
  `).join('');
}

// Funciones auxiliares
function formatDate(dateStr) {
  const [yyyy, mm, dd] = dateStr.split("-");
  return `${dd}/${mm}/${yyyy}`;
}

function getStatusBadge(status) {
  const badges = {
    scheduled: 'bg-blue-100 text-blue-800',
    pending: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    canceled: 'bg-red-100 text-red-800'
  };
  return badges[status] || badges.scheduled;
}

function getStatusLabel(status) {
  const labels = {
    scheduled: 'Agendada',
    pending: 'Pendiente',
    completed: 'Completada',
    canceled: 'Cancelada'
  };
  return labels[status] || status;
}

async function editAppointment(id) {
  console.log('Editar cita:', id);
  // Implementar lógica de edición
}

async function deleteAppointment(id) {
  if (!confirm('¿Estás seguro de que quieres eliminar esta cita?')) return;
  
  const token = localStorage.getItem('authToken');
  try {
    const res = await fetch(`https://medinet360api.vercel.app/api/appointments/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (res.ok) {
      showToast('Cita eliminada exitosamente', 'success');
      loadAppointments();
    } else {
      showToast('Error al eliminar la cita', 'error');
    }
  } catch (err) {
    console.error('Error:', err);
    showToast('Error al eliminar la cita', 'error');
  }
}








