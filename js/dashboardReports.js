import { checkAuth, requireAuth, formatDate, getAgeFromDOB, showToast } from './utils.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// DOM Elements - Tabs
const listTab = document.getElementById('list-tab');
const profileTab = document.getElementById('profile-tab');
const listContent = document.getElementById('list');
const profileContent = document.getElementById('profile');

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

// State
let allPatients = [];
let filteredPatients = [];
let selectedPatient = null;

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();
    requireAuth();
    await loadPatients();
    setupTabs();
    setupEventListeners();
});

async function loadPatients() {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    try {
        const res = await fetch('https://medinet360api.vercel.app/api/patients', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            // Handle different potential API structures just in case
            allPatients = Array.isArray(data) ? data : (data.patients || []);
        } else {
            console.error('Failed to load patients');
            showToast('Failed to load patients data', 'error');
        }
    } catch (error) {
        console.error('Error loading patients:', error);
        showToast('Error connection to server', 'error');
    }
}

function setupTabs() {
    listTab.addEventListener('click', () => {
        switchTab('list');
    });
    profileTab.addEventListener('click', () => {
        switchTab('profile');
    });
}

function switchTab(tabName) {
    if (tabName === 'list') {
        listTab.classList.add('active-tab', 'border-b-2', 'border-gray-300', 'text-gray-900');
        listTab.classList.remove('border-transparent', 'text-gray-500');
        profileTab.classList.remove('active-tab', 'border-b-2', 'border-gray-300', 'text-gray-900');
        profileTab.classList.add('border-transparent');

        listContent.classList.remove('hidden');
        profileContent.classList.add('hidden');
    } else {
        profileTab.classList.add('active-tab', 'border-b-2', 'border-gray-300', 'text-gray-900');
        profileTab.classList.remove('border-transparent', 'text-gray-500');
        listTab.classList.remove('active-tab', 'border-b-2', 'border-gray-300', 'text-gray-900');
        listTab.classList.add('border-transparent');

        profileContent.classList.remove('hidden');
        listContent.classList.add('hidden');
    }
}

function setupEventListeners() {
    // List Tab Listeners
    filterBtn.addEventListener('click', applyDateFilter);
    clearBtn.addEventListener('click', clearFilters);
    exportCsvBtn.addEventListener('click', exportToCSV);
    exportPdfListBtn.addEventListener('click', exportListToPDF);

    // Profile Tab Listeners
    patientSearch.addEventListener('input', handleSearch);
    generateClinicalPdfBtn.addEventListener('click', generateClinicalPDF);

    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
        if (!patientSearch.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.add('hidden');
        }
    });
}

// --- List Logic ---

function applyDateFilter() {
    const start = startDateInput.value ? new Date(startDateInput.value) : null;
    const end = endDateInput.value ? new Date(endDateInput.value) : null;

    if (!start && !end) {
        showToast('Please select at least one date', 'info');
        return;
    }

    // Adjust end date to include the whole day
    if (end) {
        end.setHours(23, 59, 59, 999);
    }

    filteredPatients = allPatients.filter(p => {
        if (!p.createdAt && !p.registerDate) return false; // Fallback if no date field
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
        const age = getAgeFromDOB(p.birthday);
        const dob = formatDate(p.birthday);
        const regDate = p.createdAt ? formatDate(p.createdAt) : 'N/A';

        return `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${p.name} ${p.lastName}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${age}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${dob}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${regDate}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div class="text-xs">${p.phone || '-'}</div>
                    <div class="text-xs text-gray-400">${p.email || '-'}</div>
                </td>
            </tr>
        `;
    }).join('');
}


// --- Individual Profile Logic ---

function handleSearch(e) {
    const term = e.target.value.toLowerCase().trim();
    if (term.length < 1) {
        searchResults.classList.add('hidden');
        return;
    }

    const matches = allPatients.filter(p => {
        const fullName = `${p.name} ${p.lastName}`.toLowerCase();
        return fullName.includes(term);
    }).slice(0, 5); // Limit to 5 results

    renderSearchResults(matches);
}

function renderSearchResults(matches) {
    searchResults.innerHTML = '';

    if (matches.length === 0) {
        searchResults.classList.add('hidden');
        return;
    }

    matches.forEach(p => {
        const div = document.createElement('div');
        div.className = 'px-4 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0 border-gray-100';
        div.innerHTML = `
            <p class="font-medium text-sm text-gray-800">${p.name} ${p.lastName}</p>
            <p class="text-xs text-gray-500">${p.email || 'No email'}</p>
        `;
        div.addEventListener('click', () => selectPatient(p));
        searchResults.appendChild(div);
    });

    searchResults.classList.remove('hidden');
}

function selectPatient(patient) {
    selectedPatient = patient;
    patientSearch.value = `${patient.name} ${patient.lastName}`;
    searchResults.classList.add('hidden');

    // Show preview
    selectedPatientPreview.classList.remove('hidden');
    previewName.textContent = `${patient.name} ${patient.lastName}`;
    previewDetails.textContent = `Edad: ${getAgeFromDOB(patient.birthday)} • Tel: ${patient.phone || 'N/A'}`;

    // Enable button
    generateClinicalPdfBtn.disabled = false;
}

// --- Export Functions ---

function exportToCSV() {
    if (!filteredPatients.length) return;

    const headers = ['Nombre', 'Apellido', 'Edad', 'Fecha Nacimiento', 'Telefono', 'Email', 'Fecha Registro'];
    const rows = filteredPatients.map(p => [
        p.name,
        p.lastName,
        getAgeFromDOB(p.birthday),
        formatDate(p.birthday), // assuming formatDate returns string
        p.phone || '',
        p.email || '',
        p.createdAt ? formatDate(p.createdAt) : ''
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(r => r.map(c => `"${c}"`).join(',')) // Quote fields to handle commas
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reporte_pacientes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

function exportListToPDF() {
    if (!filteredPatients.length) return;

    const doc = new jsPDF();

    // Header
    doc.setFontSize(18);
    doc.text('Reporte de Pacientes Nuevos', 14, 22);

    doc.setFontSize(11);
    doc.setTextColor(100);
    const dateRangeStr = `Generado el: ${new Date().toLocaleDateString()}`;
    doc.text(dateRangeStr, 14, 30);

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
        head: headers,
        body: data,
        startY: 35,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [79, 70, 229] } // Indigo-600-ish
    });

    doc.save(`reporte_pacientes_${new Date().toISOString().split('T')[0]}.pdf`);
}

function generateClinicalPDF() {
    if (!selectedPatient) return;
    const p = selectedPatient;
    const doc = new jsPDF();

    // --- Header ---
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text('Ficha Clínica', 105, 20, null, null, 'center');

    doc.setLineWidth(0.5);
    doc.line(20, 25, 190, 25);

    // --- Personal Info Section ---
    let yPos = 40;
    doc.setFontSize(14);
    doc.setTextColor(79, 70, 229); // Accent color
    doc.text('Información Personal', 20, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setTextColor(0);

    // Layout: 2 columns
    // Col 1
    doc.setFont(undefined, 'bold');
    doc.text('Nombre Completo:', 20, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(`${p.name} ${p.lastName}`, 60, yPos);

    yPos += 8;
    doc.setFont(undefined, 'bold');
    doc.text('Fecha Nacimiento:', 20, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(`${formatDate(p.birthday)} (${getAgeFromDOB(p.birthday)} años)`, 60, yPos);

    yPos += 8;
    doc.setFont(undefined, 'bold');
    doc.text('Sexo:', 20, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(p.gender || 'N/A', 60, yPos);

    // Col 2 (Adjust X to ~110)
    yPos -= 16;
    doc.setFont(undefined, 'bold');
    doc.text('Teléfono:', 110, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(p.phone || 'N/A', 140, yPos);

    yPos += 8;
    doc.setFont(undefined, 'bold');
    doc.text('Email:', 110, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(p.email || 'N/A', 140, yPos);

    yPos += 20; // Space before next section

    // --- Clinical Notes Section ---
    doc.setFontSize(14);
    doc.setTextColor(79, 70, 229);
    doc.text('Notas Clínicas', 20, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.setTextColor(0);

    const notes = p.notes || 'Sin notas registradas.';
    // Split text to fit width
    const splitNotes = doc.splitTextToSize(notes, 170);
    doc.text(splitNotes, 20, yPos);

    yPos += (splitNotes.length * 5) + 15;

    // --- Custom Fields Section ---
    if (p.customFields && p.customFields.length > 0) {
        // Check if we need a new page
        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(79, 70, 229); // Accent
        doc.text('Datos Adicionales', 20, yPos);
        yPos += 10;

        // Use autoTable for key-value pairs of custom fields for cleaner look
        const cfData = p.customFields.map(f => [f.fieldName, f.value]);

        autoTable(doc, {
            body: cfData,
            startY: yPos,
            theme: 'striped',
            headStyles: { fillColor: [200, 200, 200], textColor: 50 },
            columns: [
                { header: 'Campo', dataKey: '0' },
                { header: 'Valor', dataKey: '1' },
            ],
            margin: { left: 20, right: 20 }
        });
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Página ${i} de ${pageCount} - Generado por Medinet360`, 105, 290, null, null, 'center');
    }

    doc.save(`Ficha_${p.name}_${p.lastName}.pdf`);
}