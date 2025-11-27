// Funciones adicionales para el módulo de citas
// Este archivo contiene las funciones de ver detalles y gestión de citas del calendario

// Función para ver detalles de cita en modal de solo lectura
async function viewAppointmentDetailsModal(id) {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    try {
        const res = await fetch(`https://medinet360api.vercel.app/api/appointments/${id}`, {
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

// Función para mostrar citas del día en el calendario
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

// Exportar funciones al scope global
window.viewAppointmentDetailsModal = viewAppointmentDetailsModal;
window.closeAppointmentDetailsModal = closeAppointmentDetailsModal;
window.showDayAppointments = showDayAppointments;
window.closeDayAppointmentsModal = closeDayAppointmentsModal;
