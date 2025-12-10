import { checkAuth, requireAuth, formatDate, getAgeFromDOB, showToast, toMinutes } from './utils.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const logo = document.querySelector('.logo');
    if (logo) {
        logo.style.cursor = 'pointer';
        logo.addEventListener('click', () => window.location.href = '../index.html');
    }

// DOM Elements - Tabs
const listTab = document.getElementById('list-tab');
const profileTab = document.getElementById('profile-tab');
const historyTab = document.getElementById('history-tab');
const listContent = document.getElementById('list');
const profileContent = document.getElementById('profile');
const historyContent = document.getElementById('history');

// DOM Elements - Filters & List
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const filterBtn = document.getElementById('filterBtn');
const clearBtn = document.getElementById('clearBtn');
const patientsTableBody = document.getElementById('patientsTableBody');
const resultCount = document.getElementById('resultCount');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const exportPdfListBtn = document.getElementById('exportPdfListBtn');

// DOM Elements - Individual Report
const patientSearch = document.getElementById('patientSearch');
const searchResults = document.getElementById('searchResults');
const selectedPatientPreview = document.getElementById('selectedPatientPreview');
const previewName = document.getElementById('previewName');
const previewDetails = document.getElementById('previewDetails');
const generateClinicalPdfBtn = document.getElementById('generateClinicalPdfBtn');

// DOM Elements - History Report
const historyPatientSearch = document.getElementById('historyPatientSearch');
const historySearchResults = document.getElementById('historySearchResults');
const historyContainer = document.getElementById('historyContent');
const historyPatientName = document.getElementById('historyPatientName');
const histTotal = document.getElementById('histTotal');
const histCompleted = document.getElementById('histCompleted');
const histPending = document.getElementById('histPending');
const histCanceled = document.getElementById('histCanceled');
const historyTableBody = document.getElementById('historyTableBody');
const exportHistoryPdfBtn = document.getElementById('exportHistoryPdfBtn');

// State
let allPatients = [];
let allAppointments = [];
let filteredPatients = [];
let selectedPatient = null;
let selectedHistoryPatient = null;
let currentHistoryAppointments = [];

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();
    requireAuth();
    await loadData();
    setupTabs();
    setupEventListeners();
});

async function loadData() {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    try {
        const [patientsRes, appointmentsRes] = await Promise.all([
            fetch('https://medinet360api.vercel.app/api/patients', { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch('https://medinet360api.vercel.app/api/appointments', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (patientsRes.ok) {
            const data = await patientsRes.json();
            allPatients = Array.isArray(data) ? data : (data.patients || []);
        } else {
            console.error('Failed to load patients');
        }

        if (appointmentsRes.ok) {
            const data = await appointmentsRes.json();
            allAppointments = Array.isArray(data) ? data : (data.appointments || []);
        } else {
            console.error('Failed to load appointments');
        }

    } catch (error) {
        console.error('Error loading data:', error);
        showToast('Error loading data', 'error');
    }
}

function setupTabs() {
    listTab.addEventListener('click', () => switchTab('list'));
    profileTab.addEventListener('click', () => switchTab('profile'));
    historyTab.addEventListener('click', () => switchTab('history'));
}

function switchTab(tabName) {
    // Reset all tabs
    [listTab, profileTab, historyTab].forEach(t => {
        t.classList.remove('active-tab', 'border-b-2', 'border-gray-300', 'text-gray-900');
        t.classList.add('border-transparent', 'text-gray-500');
    });
    [listContent, profileContent, historyContent].forEach(c => c.classList.add('hidden'));

    // Activate selected
    if (tabName === 'list') {
        listTab.classList.add('active-tab', 'border-b-2', 'border-gray-300', 'text-gray-900');
        listTab.classList.remove('border-transparent', 'text-gray-500');
        listContent.classList.remove('hidden');
    } else if (tabName === 'profile') {
        profileTab.classList.add('active-tab', 'border-b-2', 'border-gray-300', 'text-gray-900');
        profileTab.classList.remove('border-transparent', 'text-gray-500');
        profileContent.classList.remove('hidden');
    } else if (tabName === 'history') {
        historyTab.classList.add('active-tab', 'border-b-2', 'border-gray-300', 'text-gray-900');
        historyTab.classList.remove('border-transparent', 'text-gray-500');
        historyContent.classList.remove('hidden');
    }
}

function setupEventListeners() {
    // List Tab Listeners
    filterBtn.addEventListener('click', applyDateFilter);
    clearBtn.addEventListener('click', clearFilters);
    exportCsvBtn.addEventListener('click', exportToCSV);
    exportPdfListBtn.addEventListener('click', exportListToPDF);

    // Profile Tab Listeners
    patientSearch.addEventListener('input', (e) => handleSearch(e.target.value, 'profile'));
    generateClinicalPdfBtn.addEventListener('click', generateClinicalPDF);

    // History Tab Listeners
    historyPatientSearch.addEventListener('input', (e) => handleSearch(e.target.value, 'history'));
    exportHistoryPdfBtn.addEventListener('click', generateHistoryPDF);

    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
        if (!patientSearch.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.add('hidden');
        }
        if (!historyPatientSearch.contains(e.target) && !historySearchResults.contains(e.target)) {
            historySearchResults.classList.add('hidden');
        }
    });
}

// --- List Logic ---
// ... (Logic from previous step remains similar, I'll rewrite it to ensure fullness) ...

function applyDateFilter() {
    const start = startDateInput.value ? new Date(startDateInput.value) : null;
    const end = endDateInput.value ? new Date(endDateInput.value) : null;

    if (!start && !end) {
        showToast('Please select at least one date', 'info');
        return;
    }

    // Adjust end date to include the whole day
    if (end) end.setHours(23, 59, 59, 999);

    filteredPatients = allPatients.filter(p => {
        if (!p.createdAt && !p.registerDate) return false;
        const regDate = new Date(p.createdAt || p.registerDate);
        if (start && regDate < start) return false;
        if (end && regDate > end) return false;
        return true;
    });

    renderTable(filteredPatients);

    // Enable export buttons if results found
    const hasResults = filteredPatients.length > 0;
    exportCsvBtn.disabled = !hasResults;
    exportPdfListBtn.disabled = !hasResults;

    if (!hasResults) {
        exportCsvBtn.classList.add('opacity-50', 'cursor-not-allowed');
        exportPdfListBtn.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        exportCsvBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        exportPdfListBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

function clearFilters() {
    startDateInput.value = '';
    endDateInput.value = '';
    filteredPatients = [];
    patientsTableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-sm text-gray-500">Selecciona un rango de fechas para ver pacientes.</td></tr>';
    resultCount.textContent = '(0 pacientes)';
    exportCsvBtn.disabled = true;
    exportPdfListBtn.disabled = true;
    exportCsvBtn.classList.add('opacity-50', 'cursor-not-allowed');
    exportPdfListBtn.classList.add('opacity-50', 'cursor-not-allowed');
}

function renderTable(patients) {
    resultCount.textContent = `(${patients.length} pacientes)`;

    if (patients.length === 0) {
        patientsTableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-sm text-gray-500">No se encontraron pacientes en este rango.</td></tr>';
        return;
    }

    patientsTableBody.innerHTML = patients.map(p => {
        return `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${p.name} ${p.lastName}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${getAgeFromDOB(p.birthday)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatDate(p.birthday)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${p.createdAt ? formatDate(p.createdAt) : 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div class="text-xs">${p.phone || '-'}</div>
                    <div class="text-xs text-gray-400">${p.email || '-'}</div>
                </td>
            </tr>
        `;
    }).join('');
}


// --- Search Logic (Unified for Profile and History) ---

function handleSearch(term, mode) {
    const container = mode === 'profile' ? searchResults : historySearchResults;
    term = term.toLowerCase().trim();

    if (term.length < 1) {
        container.classList.add('hidden');
        return;
    }

    const matches = allPatients.filter(p => {
        const fullName = `${p.name} ${p.lastName}`.toLowerCase();
        return fullName.includes(term);
    }).slice(0, 5);

    container.innerHTML = '';

    if (matches.length === 0) {
        container.classList.add('hidden');
        return;
    }

    matches.forEach(p => {
        const div = document.createElement('div');
        div.className = 'px-4 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0 border-gray-100';
        div.innerHTML = `
            <p class="font-medium text-sm text-gray-800">${p.name} ${p.lastName}</p>
            <p class="text-xs text-gray-500">${p.email || 'No email'}</p>
        `;
        div.addEventListener('click', () => {
            if (mode === 'profile') selectProfilePatient(p);
            else selectHistoryPatient(p);
        });
        container.appendChild(div);
    });

    container.classList.remove('hidden');
}

// --- Profile Logic ---

function selectProfilePatient(patient) {
    selectedPatient = patient;
    patientSearch.value = `${patient.name} ${patient.lastName}`;
    searchResults.classList.add('hidden');

    selectedPatientPreview.classList.remove('hidden');
    previewName.textContent = `${patient.name} ${patient.lastName}`;
    previewDetails.textContent = `Edad: ${getAgeFromDOB(patient.birthday)} • Tel: ${patient.phone || 'N/A'}`;
    generateClinicalPdfBtn.disabled = false;
}

// --- History Logic ---

function selectHistoryPatient(patient) {
    selectedHistoryPatient = patient;
    historyPatientSearch.value = `${patient.name} ${patient.lastName}`;
    historySearchResults.classList.add('hidden');
    historyContainer.classList.remove('hidden');
    historyPatientName.textContent = `${patient.name} ${patient.lastName}`;

    // Filter appointments for this patient with robust comparison
    currentHistoryAppointments = allAppointments.filter(apt => {
        if (!apt.patientId) return false;

        // Handle if patientId is populated object or just ID string
        const aptPatientId = (typeof apt.patientId === 'object' && apt.patientId !== null)
            ? (apt.patientId._id || apt.patientId.id)
            : apt.patientId;

        // Compare as strings to avoid type mismatches
        return String(aptPatientId) === String(patient._id);
    });

    console.log(`Found ${currentHistoryAppointments.length} appointments for patient ${patient.name}`);
    renderHistoryStats();
    renderHistoryTable();
}

function renderHistoryStats() {
    const total = currentHistoryAppointments.length;
    const completed = currentHistoryAppointments.filter(a => a.status === 'completed').length;
    const canceled = currentHistoryAppointments.filter(a => a.status === 'canceled').length;
    const pending = total - completed - canceled;

    histTotal.textContent = total;
    histCompleted.textContent = completed;
    histCanceled.textContent = canceled;
    histPending.textContent = pending;
}

function renderHistoryTable() {
    if (currentHistoryAppointments.length === 0) {
        historyTableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-sm text-gray-500">No hay historial de citas para este paciente.</td></tr>';
        return;
    }

    // Sort by date desc
    const sorted = [...currentHistoryAppointments].sort((a, b) => new Date(b.date) - new Date(a.date));

    historyTableBody.innerHTML = sorted.map(apt => {
        return `
            <tr>
                   <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formatDate(apt.date)}</td>
                   <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${apt.hour}</td>
                   <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${apt.duration} min</td>
                   <td class="px-6 py-4 whitespace-nowrap text-sm">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(apt.status)}">
                            ${getStatusLabel(apt.status)}
                        </span>
                   </td>
                   <td class="px-6 py-4 whitespace-normal text-sm text-gray-500 max-w-xs truncate" title="${apt.description || ''}">
                        ${apt.description || '-'}
                   </td>
            </tr>
        `;
    }).join('');
}

function getStatusBadge(status) {
    const badges = {
        scheduled: 'bg-blue-100 text-blue-800',
        pending: 'bg-yellow-100 text-yellow-800',
        completed: 'bg-green-100 text-green-800',
        canceled: 'bg-red-100 text-red-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
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

// --- Export Logic ---

function exportToCSV() {
    if (!filteredPatients.length) return;

    const headers = ['Nombre', 'Apellido', 'Edad', 'Fecha Nacimiento', 'Telefono', 'Email', 'Fecha Registro'];
    const rows = filteredPatients.map(p => [
        p.name,
        p.lastName,
        getAgeFromDOB(p.birthday),
        formatDate(p.birthday),
        p.phone || '',
        p.email || '',
        p.createdAt ? formatDate(p.createdAt) : ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reporte_pacientes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

function exportListToPDF() {
    if (!filteredPatients.length) return;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text('Reporte de Pacientes Nuevos', 14, 22);
    doc.setFontSize(11);
    doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 14, 30);

    const headers = [['Nombre', 'Edad', 'F. Nacimiento', 'Teléfono', 'Email', 'Registro']];
    const data = filteredPatients.map(p => [
        `${p.name} ${p.lastName}`,
        getAgeFromDOB(p.birthday),
        formatDate(p.birthday),
        p.phone || '-',
        p.email || '-',
        p.createdAt ? formatDate(p.createdAt) : '-'
    ]);

    autoTable(doc, {
        head: headers, body: data, startY: 35, theme: 'grid', styles: { fontSize: 8 }, headStyles: { fillColor: [79, 70, 229] }
    });
    doc.save(`reporte_pacientes_${new Date().toISOString().split('T')[0]}.pdf`);
}

function generateClinicalPDF() {
    if (!selectedPatient) return;
    const p = selectedPatient;
    const doc = new jsPDF();

    doc.setFontSize(22);
    doc.text('Ficha Clínica', 105, 20, null, null, 'center');
    doc.setLineWidth(0.5); doc.line(20, 25, 190, 25);

    let yPos = 40;
    doc.setFontSize(14); doc.setTextColor(79, 70, 229); doc.text('Información Personal', 20, yPos); yPos += 10;
    doc.setFontSize(10); doc.setTextColor(0);

    doc.setFont(undefined, 'bold'); doc.text('Nombre:', 20, yPos); doc.setFont(undefined, 'normal'); doc.text(`${p.name} ${p.lastName}`, 50, yPos); yPos += 8;
    doc.setFont(undefined, 'bold'); doc.text('F. Nac:', 20, yPos); doc.setFont(undefined, 'normal'); doc.text(`${formatDate(p.birthday)} (${getAgeFromDOB(p.birthday)} años)`, 50, yPos); yPos += 8;
    doc.setFont(undefined, 'bold'); doc.text('Tel:', 20, yPos); doc.setFont(undefined, 'normal'); doc.text(p.phone || 'N/A', 50, yPos); yPos += 8;
    doc.setFont(undefined, 'bold'); doc.text('Email:', 20, yPos); doc.setFont(undefined, 'normal'); doc.text(p.email || 'N/A', 50, yPos); yPos += 20;

    doc.setFontSize(14); doc.setTextColor(79, 70, 229); doc.text('Notas Clínicas', 20, yPos); yPos += 10;
    doc.setFontSize(10); doc.setTextColor(0);
    const splitNotes = doc.splitTextToSize(p.notes || 'Sin notas.', 170);
    doc.text(splitNotes, 20, yPos); yPos += (splitNotes.length * 5) + 15;

    if (p.customFields && p.customFields.length > 0) {
        if (yPos > 240) { doc.addPage(); yPos = 20; }
        doc.setFontSize(14); doc.setTextColor(79, 70, 229); doc.text('Datos Adicionales', 20, yPos); yPos += 10;
        const cfData = p.customFields.map(f => [f.fieldName, f.value]);
        autoTable(doc, {
            body: cfData, startY: yPos, theme: 'striped', headStyles: { fillColor: [200, 200, 200], textColor: 50 },
            columns: [{ header: 'Campo', dataKey: '0' }, { header: 'Valor', dataKey: '1' }]
        });
    }

    doc.save(`Ficha_${p.name}_${p.lastName}.pdf`);
}

function generateHistoryPDF() {
    if (!selectedHistoryPatient) return;
    const p = selectedHistoryPatient;
    const doc = new jsPDF();

    // Stats
    const total = currentHistoryAppointments.length;
    const completed = currentHistoryAppointments.filter(a => a.status === 'completed').length;

    doc.setFontSize(20);
    doc.text('Historial de Citas', 105, 20, null, null, 'center');

    doc.setFontSize(12);
    doc.text(`Paciente: ${p.name} ${p.lastName}`, 14, 35);
    doc.setFontSize(10);
    doc.text(`Total Citas: ${total}   Completadas: ${completed}`, 14, 42);

    const headers = [['Fecha', 'Hora', 'Duración', 'Estado', 'Nota']];
    const sorted = [...currentHistoryAppointments].sort((a, b) => new Date(b.date) - new Date(a.date));

    const data = sorted.map(a => [
        formatDate(a.date),
        a.hour,
        `${a.duration} min`,
        getStatusLabel(a.status),
        a.description || '-'
    ]);

    autoTable(doc, {
        head: headers,
        body: data,
        startY: 50,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [79, 70, 229] },
        columnStyles: { 4: { cellWidth: 50 } } // Limit width of note column
    });

    doc.save(`Historial_Citas_${p.name}.pdf`);
}