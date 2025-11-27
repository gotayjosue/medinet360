import { checkAuth, requireAuth, showToast, toMinutes } from './utils.js';
import { isEditMode, currentEditId } from './appoinmentsState.js';

// Logo click to go to home

const logo = document.querySelector('.logo');

logo.style.cursor = 'pointer';
logo.addEventListener('click', () => {
    window.location.href = '../index.html';
});

const listButton = document.getElementById('listViewBtn');

listButton.addEventListener('click', () => {
    window.location.href = './appointments.html';
});

document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();
    requireAuth();
    loadPatients();
    initializeCalendar();
    
});



// Modal elements
const appointmentButton = document.getElementById('newAppointmentButton');
const modal = document.getElementById('appointmentModal');
const closeButton = document.getElementById('closeButton');
const cancelButton = document.getElementById('cancelButton');

appointmentButton.addEventListener('click', () => {
    modal.showModal();
});

closeButton.addEventListener('click', () => {
    modal.close();
});

cancelButton.addEventListener('click', () => {
    modal.close();
});

// Select element
const patientsSelect = document.getElementById('patientSelect');

// Get all the patients from the server and store them here
let patientsList = [];
let appointmentsList = [];

async function loadPatients() {
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
                'Authorization': `Bearer ${token}`
            }
        });

        if (!res.ok) {
            throw new Error(`Error ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        patientsList = Array.isArray(data) ? data : data.patients;
        renderPatients(patientsList);
    } catch (err) {
        console.error('🔥Error al cargar pacientes:', err);
    }
}

// Initialize Tom Select
const tomSelect = new TomSelect("#patientSelect", {
    create: false,
    sortField: {
        field: "text",
        direction: "asc"
    }
});

// Function to put patients names inside a select
function renderPatients(patients) {
    patients.map(p => {
        const option = document.createElement('option');
        option.textContent = `${p.name} ${p.lastName}`;
        option.value = p._id;
        patientsSelect.appendChild(option);
    });

    tomSelect.sync();
}

// ADD APPOINTMENT FUNCTION
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

      // Calcular hora de fin correctamente
      const aptStartMin = toMinutes(conflictingApt.hour);
      const aptEndMin = aptStartMin + parseInt(conflictingApt.duration, 10);
      const endHour = Math.floor(aptEndMin / 60).toString().padStart(2, '0');
      const endMinute = (aptEndMin % 60).toString().padStart(2, '0');
      const msg = `
        ⚠️ La cita se traslapa con otra ya programada.<br>
        <strong>Paciente:</strong> ${name}<br>
        <strong>Hora:</strong> ${conflictingApt.hour} - ${endHour}:${endMinute} (${conflictingApt.duration} min)
      `;

      showToast(msg, 'error');
      return; // Bloquear submit
    }

    try {
        const response = await fetch('https://medinet360api.vercel.app/api/appointments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (!response.ok) {
            if (data.errors && Array.isArray(data.errors)) {
                const msgs = data.errors.map(e => e.msg).join('<br>');
                showToast(msgs, 'error');
            } else {
                throw new Error(data.error || data.message || 'Failed to create appointment');
            }
        } else {
            showToast('Cita creada exitosamente!', 'success');
            appointmentForm.reset();
            modal.close();
            loadAppointments(); // Reload appointments
            renderCalendar(); // Re-render calendar
        }
    } catch (err) {
        console.error('❌ Error:', err);
        showToast(err.message || 'Error creando cita', 'error');
    }
});

// CALENDAR FUNCTIONALITY
let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();

const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function initializeCalendar() {
    loadAppointments();

    document.getElementById('prevMonth').addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar();
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar();
    });
}

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
        renderCalendar();
    } catch (err) {
        console.error('🔥 Error al cargar citas:', err);
    }
}

function renderCalendar() {
    const currentMonthElement = document.getElementById('currentMonth');
    const calendarDaysElement = document.getElementById('calendarDays');

    // Update month/year display
    currentMonthElement.textContent = `${monthNames[currentMonth]} ${currentYear}`;

    // Clear previous days
    calendarDaysElement.innerHTML = '';

    // Get first day of month and number of days
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    // Add previous month's trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
        const dayElement = createDayElement(daysInPrevMonth - i, true);
        calendarDaysElement.appendChild(dayElement);
    }

    // Add current month's days
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = createDayElement(day, false);
        calendarDaysElement.appendChild(dayElement);
    }

    // Add next month's leading days
    const totalCells = calendarDaysElement.children.length;
    const remainingCells = 42 - totalCells; // 6 rows * 7 days
    for (let day = 1; day <= remainingCells; day++) {
        const dayElement = createDayElement(day, true);
        calendarDaysElement.appendChild(dayElement);
    }
}

function createDayElement(day, isOtherMonth) {
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day';

    if (isOtherMonth) {
        dayElement.classList.add('other-month');
    }

    // Check if this is today
    const today = new Date();
    if (!isOtherMonth &&
        day === today.getDate() &&
        currentMonth === today.getMonth() &&
        currentYear === today.getFullYear()) {
        dayElement.classList.add('today');
    }

    // Create date string for this day
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Check for appointments on this day
    const dayAppointments = appointmentsList.filter(apt => apt.date === dateStr);

    if (dayAppointments.length > 0) {
        dayElement.classList.add('has-appointments');
    }

    // Day number
    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    dayNumber.textContent = day;
    dayElement.appendChild(dayNumber);

    // Appointment indicator
    if (dayAppointments.length > 0) {
        const indicator = document.createElement('div');
        indicator.className = 'appointment-indicator';
        dayElement.appendChild(indicator);

        const count = document.createElement('div');
        count.className = 'appointment-count';
        count.textContent = `${dayAppointments.length} cita${dayAppointments.length > 1 ? 's' : ''}`;
        dayElement.appendChild(count);

        // 👉 Evento que abre el modal con las citas del día
        count.addEventListener('click', (e) => {
            e.stopPropagation(); // Previene que abra el modal de crear cita
            openDayAppointmentsModal(dayAppointments);
        });
    }


    // Click handler to create appointment for this day
    dayElement.addEventListener('click', () => {
        if (!isOtherMonth) {
            openAppointmentModal(dateStr);
        }
    });

    return dayElement;
}

function openAppointmentModal(dateStr) {
    // Pre-fill the date in the form
    document.getElementById('date').value = dateStr;
    modal.showModal();
}

// Helper functions
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

// Modal para ver citas del día
const dayAppointmentsModal = document.getElementById('dayAppointmentsModal');
const dayAppointmentsContent = document.getElementById('dayAppointmentsContent');
const closeDayAppointmentsBtn = document.getElementById('closeDayAppointmentsBtn');
const dayAppointmentsHeader = document.getElementById('dayAppointmentsHeader');

// Cerrar modal
closeDayAppointmentsBtn.addEventListener('click', () => {
    dayAppointmentsModal.close();
});

// Función que abre el modal y muestra información
function openDayAppointmentsModal(appointments) {
    dayAppointmentsContent.innerHTML = ''; // limpia contenido previo

    if (appointments.length === 0) {
        dayAppointmentsContent.innerHTML = '<p class="text-gray-500">No hay citas para este día.</p>';
        dayAppointmentsModal.showModal();
        return;
    }

    appointments.forEach(apt => {
        dayAppointmentsHeader.textContent = `Citas para el día ${formatDate(apt.date)}:`;
        // patientId ya es un objeto con los datos del paciente
        const patient = apt.patientId;
        const patientName = patient 
            ? `${patient.name} ${patient.lastName}` 
            : 'Paciente desconocido';

        const div = document.createElement('div');
        div.className = "day-appointment-item";

        // Calcular hora de fin correctamente
        const aptStartMin = toMinutes(apt.hour);
        const aptEndMin = aptStartMin + parseInt(apt.duration, 10);
        const endHour = Math.floor(aptEndMin / 60).toString().padStart(2, '0');
        const endMinute = (aptEndMin % 60).toString().padStart(2, '0');

        div.innerHTML = `
            <p><strong>${patientName}</strong></p>
            <p>Hora: ${apt.hour} - ${endHour}:${endMinute}</p>
            <p>Duración: ${apt.duration} minutos</p>
            <p>Estado: ${getStatusLabel(apt.status)}</p>
            <hr>
        `;

        dayAppointmentsContent.appendChild(div);
    });

    dayAppointmentsModal.showModal();
}
