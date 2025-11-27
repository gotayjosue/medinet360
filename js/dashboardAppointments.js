import { checkAuth, requireAuth, showToast, sleep, fixDateForUTC } from './utils.js';
import { 
  viewAppointmentDetailsModal, 
  editAppointment, 
  deleteAppointment } 
  from './appointmentsHelper.js';
import { isEditMode, currentEditId, resetEditMode } from './appoinmentsState.js';



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

// -------------------------------
// MODAL FOR NEW APPOINTMENT
// -------------------------------

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
// ADD / EDIT APPOINTMENT FUNCTION
// -------------------------------

const appointmentForm = document.getElementById('appointmentForm');

appointmentForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const token = localStorage.getItem('authToken');
  if (!token) {
    alert('Authentication required. Please sign in again.');
    window.location.href = '../signIn.html';
    return;
  }

  const formData = {
    patientId: document.getElementById('patientSelect').value.trim(),
    date: document.getElementById('date').value.trim(),
    hour: document.getElementById('hour').value.trim(),
    duration: document.getElementById('duration').value.trim(),
    status: document.getElementById('status').value.trim(),
    description: document.getElementById('notes').value.trim(),
  };

    // ------------------------------------------
    // PREVENCIÓN DE CONFLICTOS (CON DURACIÓN + NOMBRE DEL PACIENTE)
    // ------------------------------------------

    const newStart = formData.hour;     // "15:30"
    const newDuration = parseInt(formData.duration, 10);

    // Convertir hora a minutos
    function toMinutes(hhmm) {
      const [h, m] = hhmm.split(':').map(Number);
      return h * 60 + m;
    }

    // Calcular rango de la nueva cita
    const newStartMin = toMinutes(newStart);
    const newEndMin = newStartMin + newDuration;

    // Filtrar citas del mismo día
    const sameDayAppointments = appointmentsList.filter(apt => {
      if (isEditMode && currentEditId === apt._id) return false; // Ignorar la cita que estamos editando
      return apt.date === formData.date;
    });

    // Buscar cita que genera conflicto
    const conflictingApt = sameDayAppointments.find(apt => {
      const aptStartMin = toMinutes(apt.hour);
      const aptEndMin = aptStartMin + parseInt(apt.duration, 10);

      // Rango se traslapa si:
      return newStartMin < aptEndMin && newEndMin > aptStartMin;
    });

    if (conflictingApt) {
      const name = `${conflictingApt.patientId?.name || 'Paciente'} ${conflictingApt.patientId?.lastName || ''}`;
      const msg = `
        ⚠️ La cita se traslapa con otra ya programada.<br>
        <strong>Paciente:</strong> ${name}<br>
        <strong>Hora:</strong> ${conflictingApt.hour} (${conflictingApt.duration} min)
      `;

      showToast(msg, 'error');
      return; // Bloquear submit
    }



  try {
    const url = isEditMode && currentEditId
      ? `https://medinet360api.vercel.app/api/appointments/${currentEditId}`
      : `https://medinet360api.vercel.app/api/appointments`;

    const method = isEditMode && currentEditId ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(formData)
    });

    const data = await response.json();

    if (!response.ok) {
      if (Array.isArray(data.errors)) {
        const msgs = data.errors.map(e => e.msg).join('<br>');
        showToast(msgs, 'error');
      } else {
        throw new Error(data.error || data.message || 'Failed to save appointment');
      }
      return;
    }

    showToast(
      isEditMode ? 'Appointment updated successfully!' : 'Appointment created successfully!',
      'success'
    );

    appointmentForm.reset();
    appointmentModal?.close();

    await sleep(1200);
    resetEditMode(); // ← muy importante

    window.location.reload();
  } catch (err) {
    console.error('❌ Error en submit:', err);
    showToast(err.message || 'Error saving appointment', 'error');
  }
});

/* Opcional: manejar cancelación para limpiar estado de edición */
document.getElementById('cancelButton')?.addEventListener('click', () => {
  appointmentForm.reset();
  appointmentModal?.close();
  resetEditMode();

  // Restaurar textos del modal
  const modalTitle = document.querySelector('#appointmentFormContainer h2');
  const submitButton = document.getElementById('createAppointment');
  if (modalTitle) modalTitle.textContent = 'Nueva Cita';
  if (submitButton) submitButton.textContent = 'Crear Cita';
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
        <div class="flex flex-col md:flex-row gap-2">
          <!-- Detalles -->
          <button data-id="${apt._id}" class="btn-detalles inline-flex items-center px-3 py-1.5 rounded-md bg-green-100 text-green-700 hover:bg-green-200 transition">
            <svg class="w-4 h-4 mr-1 text-green-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Detalles
          </button>

          <!-- Editar -->
          <button data-id="${apt._id}" class="btn-editar inline-flex items-center px-3 py-1.5 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 transition">
            <svg class="w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Editar
          </button>

          <!-- Eliminar -->
          <button data-id="${apt._id}" class="btn-eliminar inline-flex items-center px-3 py-1.5 rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition">
            <svg class="w-4 h-4 mr-1 text-red-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Eliminar
          </button>
        </div>
      </td>
    </tr>
  `).join('');

    tbody.querySelectorAll(".btn-detalles").forEach(btn => {
        btn.addEventListener("click", () => viewAppointmentDetailsModal(btn.dataset.id));
      });

      tbody.querySelectorAll(".btn-editar").forEach(btn => {
        btn.addEventListener("click", () => editAppointment(btn.dataset.id));
      });

      tbody.querySelectorAll(".btn-eliminar").forEach(btn => {
        btn.addEventListener("click", () => deleteAppointment(btn.dataset.id));
  });
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
        <div class="flex flex-col md:flex-row gap-2">
          <!-- Detalles -->
          <button data-id="${apt._id}" class="btn-detalles inline-flex items-center px-3 py-1.5 rounded-md bg-green-100 text-green-700 hover:bg-green-200 transition">
            <svg class="w-4 h-4 mr-1 text-green-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Detalles
          </button>

          <!-- Editar -->
          <button data-id="${apt._id}" class="btn-editar inline-flex items-center px-3 py-1.5 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 transition">
            <svg class="w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Editar
          </button>

          <!-- Eliminar -->
          <button data-id="${apt._id}" class="btn-eliminar inline-flex items-center px-3 py-1.5 rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition">
            <svg class="w-4 h-4 mr-1 text-red-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Eliminar
          </button>
        </div>
      </td>
    </tr>
  `).join('');

    tbody.querySelectorAll(".btn-detalles").forEach(btn => {
        btn.addEventListener("click", () => viewAppointmentDetailsModal(btn.dataset.id));
      });

      tbody.querySelectorAll(".btn-editar").forEach(btn => {
        btn.addEventListener("click", () => editAppointment(btn.dataset.id));
      });

      tbody.querySelectorAll(".btn-eliminar").forEach(btn => {
        btn.addEventListener("click", () => deleteAppointment(btn.dataset.id));
  });
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

// async function editAppointment(id) {
//   console.log('Editar cita:', id);
//   // Implementar lógica de edición
// }

// async function deleteAppointment(id) {
//   if (!confirm('¿Estás seguro de que quieres eliminar esta cita?')) return;
  
//   const token = localStorage.getItem('authToken');
//   try {
//     const res = await fetch(`https://medinet360api.vercel.app/api/appointments/${id}`, {
//       method: 'DELETE',
//       headers: {
//         'Authorization': `Bearer ${token}`
//       }
//     });

//     if (res.ok) {
//       showToast('Cita eliminada exitosamente', 'success');
//       loadAppointments();
//     } else {
//       showToast('Error al eliminar la cita', 'error');
//     }
//   } catch (err) {
//     console.error('Error:', err);
//     showToast('Error al eliminar la cita', 'error');
//   }
// }







