
import { checkAuth, requireAuth, formatDate, showToast, getClinicName } from './utils.js';
import i18n from './i18n.js';

// DOM Elements
const totalPatientsMetric = document.getElementById('totalPatientsMetric');
const appointmentsTodayMetric = document.getElementById('appointmentsTodayMetric');
const newPatientsMetric = document.getElementById('newPatientsMetric');
const recentAppointmentsTable = document.getElementById('recentAppointmentsTable');
const genderPieChartCtx = document.getElementById('genderPieChart').getContext('2d');

// --- Helper Functions ---


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
        scheduled: 'Scheduled',
        pending: 'Pending',
        completed: 'Completed',
        canceled: 'Canceled'
    };
    return labels[status] || status;
}

// Extract date from Mongo ID
function getCreatedAtFromId(id) {
    if (!id) return new Date(0); // Return old date if no ID
    const timestamp = parseInt(id.substring(0, 8), 16) * 1000;
    return new Date(timestamp);
}

// --- Main Logic ---

async function loadDashboardData() {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    try {
        // Fetch Patients and Appointments in parallel
        const [patientsRes, appointmentsRes] = await Promise.all([
            fetch('https://medinet360-api.onrender.com/api/patients', {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch('https://medinet360-api.onrender.com/api/appointments', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ]);

        const patientsData = await patientsRes.json();
        const appointmentsData = await appointmentsRes.json();

        const patients = Array.isArray(patientsData) ? patientsData : patientsData.patients || [];
        const appointments = Array.isArray(appointmentsData) ? appointmentsData : appointmentsData.appointments || [];

        updateMetrics(patients, appointments);
        renderRecentAppointments(appointments);
        renderGenderChart(patients);

    } catch (error) {
        console.error("Error loading dashboard data:", error);
        showToast("Error loading dashboard data", "error");
    }
}

function updateMetrics(patients, appointments) {
    // 1. Total Patients
    totalPatientsMetric.textContent = patients.length;

    // 2. Appointments Today
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;
    const todayCount = appointments.filter(apt => apt.date === today).length;
    appointmentsTodayMetric.textContent = todayCount;

    // 3. New Patients (This Month)
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const newPatientsCount = patients.filter(p => {
        const createdAt = getCreatedAtFromId(p._id);
        return createdAt.getMonth() === currentMonth && createdAt.getFullYear() === currentYear;
    }).length;

    newPatientsMetric.textContent = newPatientsCount;
}

function renderRecentAppointments(appointments) {
    // Sort by date (descending) and take top 5
    // Note: combining date and time for accurate sort might be better, but date is decent start.
    // 'date' is YYYY-MM-DD, 'hour' is HH:mm.
    const sortedAppointments = [...appointments].sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.hour}`);
        const dateB = new Date(`${b.date}T${b.hour}`);
        return dateB - dateA; // Descending
    }).slice(0, 5);

    if (sortedAppointments.length === 0) {
        recentAppointmentsTable.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-gray-500">${i18n.t('dashboard.home.recentAppointments.emptyTable', 'No appointments found')}</td></tr>`;
        return;
    }

    recentAppointmentsTable.innerHTML = sortedAppointments.map(apt => `
        <tr class="border-b last:border-none hover:bg-gray-50">
            <td class="py-3 px-1">
                <div class="font-medium text-gray-900">${apt.patientId?.name || 'Unknown'} ${apt.patientId?.lastName || ''}</div>
                <div class="text-xs text-gray-500">${apt.hour} (${apt.duration} min)</div>
            </td>
            <td class="py-3 px-1 text-gray-600">
                ${formatDate(apt.date)}
            </td>
            <td class="py-3 px-1">
                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(apt.status)}">
                    ${getStatusLabel(apt.status)}
                </span>
            </td>
        </tr>
    `).join('');
}

function renderGenderChart(patients) {
    let maleCount = 0;
    let femaleCount = 0;
    let otherCount = 0;

    patients.forEach(p => {
        const gender = (p.gender || '').toLowerCase();
        if (gender === 'male' || gender === 'hombre' || gender === 'masculino') {
            maleCount++;
        } else if (gender === 'female' || gender === 'mujer' || gender === 'femenino') {
            femaleCount++;
        } else {
            otherCount++;
        }
    });

    if (window.genderChartInstance) {
        window.genderChartInstance.destroy();
    }

    window.genderChartInstance = new Chart(genderPieChartCtx, {
        type: 'doughnut',
        data: {
            labels: [i18n.t('dashboard.home.genderChart.male', 'Male'), i18n.t('dashboard.home.genderChart.female', 'Female'), i18n.t('dashboard.home.genderChart.other', 'Other')],
            datasets: [{
                data: [maleCount, femaleCount, otherCount],
                backgroundColor: [
                    '#3b82f6', // blue-500
                    '#ec4899', // pink-500
                    '#9ca3af'  // gray-400
                ],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        usePointStyle: true,
                        boxWidth: 8
                    }
                }
            },
            cutout: '70%'
        }
    });
}


document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    requireAuth();

    // Sidebar logic (copied/adapted if not global, but the HTML has inline script for sidebar toggle).
    // The previous inline script in home.html handles the sidebar toggle. 
    // We just handle the data.

    loadDashboardData();
    getClinicName();

    const logo = document.querySelector('.logo');
    if (logo) {
        logo.style.cursor = 'pointer';
        logo.addEventListener('click', () => window.location.href = '../index.html');
    }
});
