import { showToast, sleep } from './utils.js';
import { setEditMode } from './appoinmentsState.js';
// Archivo consolidado con TODAS las funcionalidades faltantes
// Este archivo debe cargarse DESPUÉS de dashboardAppointments.js

// ============================================
// FUNCIONES DE EDICIÓN Y ELIMINACIÓN
// ============================================

// Función para editar una cita
export async function editAppointment(id) {
  const token = localStorage.getItem('authToken');
  if (!token) return;

  try {
    const res = await fetch(`https://medinet360-api.onrender.com/api/appointments/${id}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) throw new Error('Error al cargar la cita');
    const appointment = await res.json();

    // Activar modo edición y guardar el id
    setEditMode(id);

    // Actualizar UI del modal
    const modalTitle = document.querySelector('#appointmentFormContainer h2');
    const submitButton = document.getElementById('createAppointment');
    if (modalTitle) modalTitle.textContent = 'Editar Cita';
    if (submitButton) submitButton.textContent = 'Actualizar Cita';

    // Rellenar formulario
    const patientSelect = document.getElementById('patientSelect');
    if (patientSelect?.tomselect) {
      patientSelect.tomselect.setValue(appointment.patientId._id || appointment.patientId);
    } else if (patientSelect) {
      patientSelect.value = appointment.patientId._id || appointment.patientId;
    }

    document.getElementById('date').value = appointment.date;
    document.getElementById('hour').value = appointment.hour;
    document.getElementById('duration').value = appointment.duration;
    document.getElementById('status').value = appointment.status;
    document.getElementById('notes').value = appointment.description || '';

    // Abrir modal
    const modal = document.getElementById('appointmentModal');
    if (modal) modal.showModal();

  } catch (err) {
    console.error('❌ Error en editAppointment:', err);
    window.showToast?.('Error al cargar la cita', 'error');
  }
}


// Función para eliminar con confirmación bonita
export async function deleteAppointment(id) {
  // Crear modal de confirmación
  const confirmModal = document.createElement('dialog');
  confirmModal.className = 'rounded-lg shadow-2xl max-w-md w-full backdrop:bg-black backdrop:bg-opacity-50';
  confirmModal.id = 'confirmDeleteModal';
  confirmModal.innerHTML = `
    <div class="bg-white p-6 rounded-lg">
      <div class="flex items-center gap-4 mb-4">
        <div class="bg-red-100 p-3 rounded-full">
          <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
        </div>
        <div>
          <h3 class="text-lg font-semibold text-gray-900">Eliminar Cita</h3>
          <p class="text-sm text-gray-600">Esta acción no se puede deshacer</p>
        </div>
      </div>
      <p class="text-gray-700 mb-6">¿Estás seguro de que deseas eliminar esta cita?</p>
      <div class="flex gap-3">
        <button id="cancelDelete" class="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition">
          Cancelar
        </button>
        <button id="confirmDelete" class="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition">
          Eliminar
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(confirmModal);
  confirmModal.showModal();

  // Event listeners
  document.getElementById('cancelDelete').addEventListener('click', () => {
    confirmModal.close();
    confirmModal.remove();
  });

  document.getElementById('confirmDelete').addEventListener('click', async () => {
    const token = localStorage.getItem('authToken');
    try {
      const res = await fetch(`https://medinet360-api.onrender.com/api/appointments/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        showToast('Cita eliminada exitosamente', 'success');
        confirmModal.close();
        confirmModal.remove();
        await sleep(1200);
        // Recargar citas
        window.location.reload();
      } else {
        throw new Error('Error al eliminar');
      }
    } catch (err) {
      console.error('Error:', err);
      showToast('Error al eliminar la cita', 'error');
    }
  });
}

// ============================================
// FUNCIÓN PARA VER DETALLES (MODAL DE SOLO LECTURA)
// ============================================

export async function viewAppointmentDetailsModal(id) {
  const token = localStorage.getItem('authToken');
  if (!token) return;

  try {
    const res = await fetch(`https://medinet360-api.onrender.com/api/appointments/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) throw new Error('Error al cargar la cita');

    const apt = await res.json();

    // Helper functions
    const formatDate = (dateStr) => {
      const [yyyy, mm, dd] = dateStr.split("-");
      return `${dd}/${mm}/${yyyy}`;
    };

    const getStatusBadge = (status) => {
      const badges = {
        scheduled: 'bg-blue-100 text-blue-800',
        pending: 'bg-yellow-100 text-yellow-800',
        completed: 'bg-green-100 text-green-800',
        canceled: 'bg-red-100 text-red-800'
      };
      return badges[status] || badges.scheduled;
    };

    const getStatusLabel = (status) => {
      const labels = {
        scheduled: 'Agendada',
        pending: 'Pendiente',
        completed: 'Completada',
        canceled: 'Cancelada'
      };
      return labels[status] || status;
    };

    // Crear modal de detalles
    const detailsModal = document.createElement('dialog');
    detailsModal.id = 'appointmentDetailsModal';
    detailsModal.className = 'rounded-lg shadow-2xl max-w-2xl w-full backdrop:bg-black backdrop:bg-opacity-50';
    detailsModal.innerHTML = `
      <div class="bg-white p-8 rounded-lg">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold text-gray-900">Detalles de la Cita</h2>
          <button id="closeDetailsModal" class="text-gray-500 hover:text-gray-700">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div class="col-span-2 bg-blue-50 p-4 rounded-lg">
              <p class="text-sm text-gray-600 mb-1">Paciente</p>
              <p class="text-xl font-semibold text-gray-900">
                ${apt.patientId?.name || 'N/A'} ${apt.patientId?.lastName || ''}
              </p>
            </div>

            <div class="bg-gray-50 p-4 rounded-lg">
              <p class="text-sm text-gray-600 mb-1">Fecha</p>
              <p class="text-lg font-semibold text-gray-900">${formatDate(apt.date)}</p>
            </div>

            <div class="bg-gray-50 p-4 rounded-lg">
              <p class="text-sm text-gray-600 mb-1">Hora</p>
              <p class="text-lg font-semibold text-gray-900">${apt.hour}</p>
            </div>

            <div class="bg-gray-50 p-4 rounded-lg">
              <p class="text-sm text-gray-600 mb-1">Duración</p>
              <p class="text-lg font-semibold text-gray-900">${apt.duration} minutos</p>
            </div>

            <div class="bg-gray-50 p-4 rounded-lg">
              <p class="text-sm text-gray-600 mb-1">Estado</p>
              <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(apt.status)}">
                ${getStatusLabel(apt.status)}
              </span>
            </div>

            ${apt.description ? `
              <div class="col-span-2 bg-gray-50 p-4 rounded-lg">
                <p class="text-sm text-gray-600 mb-1">Notas</p>
                <p class="text-gray-700">${apt.description}</p>
              </div>
            ` : ''}
          </div>

          <div class="flex gap-3 pt-4 border-t">
            <button onclick="closeAppointmentDetailsModal()" class="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition">
              Cerrar
            </button>
            <button onclick="editAppointment('${apt._id}'); closeAppointmentDetailsModal();" class="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition">
              Editar Cita
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(detailsModal);
    detailsModal.showModal();

    // Event listeners
    document.getElementById('closeDetailsModal').addEventListener('click', () => {
      detailsModal.close();
      detailsModal.remove();
    });

  } catch (err) {
    console.error('Error:', err);
    if (window.showToast) {
      window.showToast('Error al cargar detalles', 'error');
    }
  }
}

function closeAppointmentDetailsModal() {
  const modal = document.getElementById('appointmentDetailsModal');
  if (modal) {
    modal.close();
    modal.remove();
  }
}

// ============================================
// FUNCIÓN PARA MOSTRAR CITAS DEL DÍA EN CALENDARIO
// ============================================

function showDayAppointments(dateStr, appointments) {
  const dayAppts = appointments.filter(apt => apt.date === dateStr);

  if (dayAppts.length === 0) return;

  const formatDate = (dateStr) => {
    const [yyyy, mm, dd] = dateStr.split("-");
    return `${dd}/${mm}/${yyyy}`;
  };

  const getStatusBadge = (status) => {
    const badges = {
      scheduled: 'bg-blue-100 text-blue-800',
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      canceled: 'bg-red-100 text-red-800'
    };
    return badges[status] || badges.scheduled;
  };

  const getStatusLabel = (status) => {
    const labels = {
      scheduled: 'Agendada',
      pending: 'Pendiente',
      completed: 'Completada',
      canceled: 'Cancelada'
    };
    return labels[status] || status;
  };

  // Crear modal con lista de citas
  const dayModal = document.createElement('dialog');
  dayModal.id = 'dayAppointmentsModal';
  dayModal.className = 'rounded-lg shadow-2xl max-w-3xl w-full backdrop:bg-black backdrop:bg-opacity-50';
  dayModal.innerHTML = `
    <div class="bg-white p-8 rounded-lg max-h-[80vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-gray-900">Citas del ${formatDate(dateStr)}</h2>
        <button id="closeDayModal" class="text-gray-500 hover:text-gray-700">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div class="space-y-3">
        ${dayAppts.map(apt => `
          <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div class="flex justify-between items-start mb-2">
              <div>
                <h3 class="text-lg font-semibold text-gray-900">
                  ${apt.patientId?.name || 'Paciente'} ${apt.patientId?.lastName || ''}
                </h3>
                <p class="text-sm text-gray-600">Hora: ${apt.hour}</p>
              </div>
              <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(apt.status)}">
                ${getStatusLabel(apt.status)}
              </span>
            </div>
            <div class="flex gap-2 mt-3">
              <button onclick="viewAppointmentDetailsModal('${apt._id}')" class="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">
                Ver Detalles
              </button>
              <button onclick="editAppointment('${apt._id}'); closeDayAppointmentsModal();" class="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">
                Editar
              </button>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="mt-6 pt-4 border-t">
        <button onclick="closeDayAppointmentsModal()" class="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition">
          Cerrar
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(dayModal);
  dayModal.showModal();

  document.getElementById('closeDayModal').addEventListener('click', () => {
    dayModal.close();
    dayModal.remove();
  });
}

function closeDayAppointmentsModal() {
  const modal = document.getElementById('dayAppointmentsModal');
  if (modal) {
    modal.close();
    modal.remove();
  }
}

// ============================================
// EXPORTAR FUNCIONES AL SCOPE GLOBAL
// ============================================

window.editAppointment = editAppointment;
window.deleteAppointment = deleteAppointment;
window.viewAppointmentDetailsModal = viewAppointmentDetailsModal;
window.closeAppointmentDetailsModal = closeAppointmentDetailsModal;
window.showDayAppointments = showDayAppointments;
window.closeDayAppointmentsModal = closeDayAppointmentsModal;
window.isEditMode = () => isEditMode;
window.getCurrentEditId = () => currentEditId;
window.resetEditMode = () => {
  isEditMode = false;
  currentEditId = null;
};

console.log('✅ Appointment functions loaded successfully');
