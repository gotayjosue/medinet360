// Verifying the user sesion status
import { checkAuth, requireAuth, formatDate, getAgeFromDOB, getClinicName } from './utils.js';

//Importing the alert container function from utils.js
import { showToast } from './utils.js';

//Logo redirection function
const logo = document.querySelector('.logo');
logo.style.cursor = 'pointer'

logo.addEventListener('click', () => {
  window.location.href = '../index.html'
})

//Selecting elements for the modal form
const patientModal = document.getElementById('patientFormModal')
const addPatientButton = document.getElementById('addPatientButton')
const closeButton = document.getElementById('closeModalButton')
const cancelButton = document.getElementById('cancelButton')

//Add button event to open the modal when it is clicked
addPatientButton.addEventListener('click', async () => {
  await loadClinicTemplate();
  patientModal.showModal()
})

//Close button event to close the modal form when it is clicked
closeButton.addEventListener('click', () => {
  patientModal.close()
})

//Cancel button event to close the modal form when it is clicked
cancelButton.addEventListener('click', () => {
  patientModal.close()
})

// Selecting elements for the add custom fields functionality
const addFieldsButton = document.getElementById('addFieldsButton');
const patientForm = document.getElementById('patientForm');

// Counter para generar IDs únicos
let customFieldCount = 0;
let clinicTemplateLoaded = false;

//Lista de pacientes del backend

let allPatients = []

// -------------------------------
// ADD CUSTOM FIELDS
// -------------------------------
addFieldsButton.addEventListener('click', () => {
  customFieldCount++;

  const fieldContainer = document.createElement('div');
  fieldContainer.className = 'space-y-2 mt-4 custom-field-group'; // ✅ importante

  const labelContainer = document.createElement('div');
  labelContainer.className = 'flex items-center justify-between';

  const label = document.createElement('input');
  label.type = 'text';
  label.placeholder = 'Enter field name';
  label.className = 'custom-field-name block text-sm font-medium text-gray-700 border-none p-1 focus:ring-0 focus:outline-none';

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.innerHTML = '×';
  deleteButton.className = 'ml-2 text-red-500 hover:text-red-700';

  const input = document.createElement('input');
  input.type = 'text';
  input.name = `customField_${customFieldCount}`;
  input.id = `customField_${customFieldCount}`;
  input.className = 'custom-field-value mt-1 block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500';

  labelContainer.appendChild(label);
  labelContainer.appendChild(deleteButton);
  fieldContainer.appendChild(labelContainer);
  fieldContainer.appendChild(input);

  const lastDiv = patientForm.lastElementChild;
  patientForm.insertBefore(fieldContainer, lastDiv);

  deleteButton.addEventListener('click', () => {
    fieldContainer.remove();
  });
});

// -------------------------------
// ADD PATIENT FUNCTION
// -------------------------------
patientForm.addEventListener('submit', async (e) => {
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
    name: document.getElementById('name').value.trim(),
    lastName: document.getElementById('lastName').value.trim(),
    email: document.getElementById('email').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    birthday: document.getElementById('birthday').value.trim(),
    gender: document.getElementById('gender').value.trim(),
    notes: document.getElementById('notes').value.trim(),
    customFields: []
  };

  /* --- Validar custom fields --- */
  let hasError = false;
  document.querySelectorAll('.custom-field-group').forEach(group => {
    const fieldNameInput = group.querySelector('.custom-field-name');
    const valueInput = group.querySelector('.custom-field-value');

    const fieldName = fieldNameInput?.value.trim();
    const value = valueInput?.value.trim();

    // Si hay valor pero no nombre → error
    if (value && !fieldName) {
      hasError = true;
      // marcar visualmente
      fieldNameInput.classList.add('border-red-500', 'ring-1', 'ring-red-400');
      // mensaje inline
      if (!group.querySelector('.field-error')) {
        const err = document.createElement('p');
        err.className = 'field-error text-sm text-red-600 mt-1';
        err.textContent = "The field's name is required when the input is filled";
        group.appendChild(err);
      }
    }

    // Si ambos están completos, guardarlos
    if (fieldName && value) {
      formData.customFields.push({ fieldName, value });
    }
  });

  // --- SCRAPE TEMPLATE FIELDS ---
  const templateContainer = document.getElementById('customFieldsContainer');
  if (templateContainer) {
    const templateRows = templateContainer.querySelectorAll('.template-field-group');
    templateRows.forEach(row => {
      const label = row.dataset.label;
      const type = row.dataset.type;
      let value = "";

      if (type === 'checkbox') {
        value = row.querySelector('input[type="checkbox"]').checked ? "Sí" : "No";
      } else {
        value = row.querySelector('.template-input').value.trim();
      }

      // Templates always have a label, so we just push if there is a value (or always for checkboxes?)
      // If it's a checkbox, "No" is a value.
      // If text/date/select is empty, maybe we skip it or send empty string?
      // Let's send it even if empty to match the template structure, or maybe only if not empty.
      // Requirement says: "Asegúrate de que estos campos... se guarden". 
      if (value !== "") {
        formData.customFields.push({ fieldName: label, value });
      }
    });
  }

  if (hasError) {
    showToast('Complete the marked custom fields.', 'error');
    // Enfocar el primer input con error
    const firstError = document.querySelector('.custom-field-name.border-red-500');
    if (firstError) firstError.focus();
    return; // detiene el envío
  }

  /* 3️⃣ Enviar POST con JWT */
  try {
    const response = await fetch('https://medinet360-api.onrender.com/api/patients', {
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
        throw new Error(data.error || data.message || 'Failed to create patient');
      }
    } else {
      showToast('Patient created successfully!', 'success');
      patientForm.reset();
      patientModal.close();
      window.location.reload();  // Recargar para ver el nuevo paciente
    }
  } catch (err) {
    console.error('❌ Error:', err);
    showToast(err.message || 'Error creating patient', 'error');
  }
});


/* ------------- 1️⃣  Función que carga pacientes ------------- */
async function loadPatients() {
  // 1. Obtener el token guardado en localStorage
  const token = localStorage.getItem('authToken');
  if (!token) {
    console.warn('No hay token de autorización.');
    return;
  }

  try {
    const res = await fetch('https://medinet360-api.onrender.com/api/patients', {
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
    allPatients = Array.isArray(data) ? data : data.patients;
    renderPatients(allPatients);
  } catch (err) {
    console.error('🔥Error al cargar pacientes:', err);
  }
}

/* ------------- 2️⃣  Función que convierte a un card HTML ------------- */
function renderPatients(patients) {
  const container = document.getElementById('patients-container');
  container.innerHTML = '';      // limpia cualquier contenido previo

  if (!patients.length) {
    container.innerHTML = '<p id="emptyPatient" class="text-center col-span-3">No hay pacientes registrados.</p>';
    return;
  }


  const cardsHTML = patients.map(p => {

    const age = getAgeFromDOB(p.birthday ?? 'Null');
    const dobFormatted = formatDate(p.birthday ?? 'Null');

    // SVGs for gender
    const maleSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none"
        viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M12 12c2.28 0 4-1.72 4-4s-1.72-4-4-4-4 1.72-4 4 1.72 4 4 4zM4 20v-1a4 4 0 014-4h8a4 4 0 014 4v1" />
      </svg>`;

    const femaleSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none"
        viewBox="0 0 24 24" stroke="currentColor">
        <circle cx="12" cy="7" r="3" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M7 20l5-8 5 8" />
      </svg>`;

    const genderIcon = (p.gender && p.gender.toLowerCase() === 'female') ? femaleSvg : maleSvg;


    return `
      <div class="patient-card bg-white rounded-2xl shadow p-4" data-id="${p._id}">
        <div class="bg-gray-800 text-white p-4 rounded-t-xl flex items-center gap-3">
          ${genderIcon}
          <div>
            <p class="font-semibold">${p.name ?? 'Name Undefined'} ${p.lastName}</p>
            <p class="text-sm">${age} años</p>
          </div>
        </div>

        <div class="p-4 space-y-2 text-sm">
          <div class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-600"
               fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2v-7H3v7a2 2 0 002 2z" />
            </svg>
            <span><strong>Fecha de nacimiento:</strong> ${dobFormatted}</span>
          </div>
          <div class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-600"
               fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M3 5h2l3.6 7.59-1.35 2.45A1 1 0 008 17h8a1 1 0 00.89-.55l3-6A1 1 0 0019 9H5.21" />
            </svg>
            <span><strong>Teléfono:</strong> ${p.phone ?? 'N/D'}</span>
          </div>
          <div class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-600"
               fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M16 12H8m0 0l-4-4m4 4l-4 4" />
            </svg>
            <span><strong>Email:</strong> ${p.email ?? 'N/D'}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = cardsHTML;

  const patientCards = container.querySelectorAll('.patient-card')

  patientCards.forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      window.location.href = `patientDetails.html?id=${id}`;
    })
  })


}

// Search patients functions
function searchPatients(query) {
  if (query === '') {
    renderPatients(allPatients)
    return
  }
  const q = query.trim().toLowerCase();

  const filteredPatients = allPatients.filter(p => {
    const fullName = `${p.name ?? ''} ${p.lastName ?? ''}`.toLowerCase();
    return fullName.includes(q);
  });

  renderPatients(filteredPatients)
}

const searchBar = document.getElementById('searchBar')

searchBar.addEventListener('input', () => {
  const searchTerm = searchBar.value.trim();
  searchPatients(searchTerm)
})




document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  requireAuth();
  loadPatients();
  getClinicName();
});

// ==========================================
// LOAD CLINIC TEMPLATE
// ==========================================
async function loadClinicTemplate() {
  const container = document.getElementById('customFieldsContainer');
  if (!container) return;

  // Clear previous template fields
  container.innerHTML = "";

  const token = localStorage.getItem('authToken');
  if (!token) return;

  try {
    // 1. Get User Profile to find Clinic ID (or if we have it stored)
    const profileRes = await fetch("https://medinet360-api.onrender.com/api/auth/profile", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const user = await profileRes.json();

    if (!user.clinicId) return;

    // 2. Get Clinic Data
    const clinicRes = await fetch(`https://medinet360-api.onrender.com/api/clinic/${user.clinicId}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (!clinicRes.ok) return;

    const clinic = await clinicRes.json();

    if (clinic.customFieldTemplate && clinic.customFieldTemplate.length > 0) {
      renderClinicTemplate(clinic.customFieldTemplate);
    }

  } catch (err) {
    console.error("Error loading template:", err);
  }
}

function renderClinicTemplate(template) {
  const container = document.getElementById('customFieldsContainer');

  template.forEach(field => {
    const div = document.createElement('div');
    div.className = "template-field-group col-span-2 sm:col-span-1";
    div.dataset.label = field.label;
    div.dataset.type = field.type;

    const label = document.createElement('label');
    label.className = "block text-sm font-medium text-gray-700 mb-1";
    label.textContent = field.label;

    let input;

    if (field.type === 'select') {
      input = document.createElement('select');
      input.className = "template-input block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm";

      const defaultOption = document.createElement('option');
      defaultOption.value = "";
      defaultOption.textContent = "Seleccione una opción";
      input.appendChild(defaultOption);

      if (field.options && Array.isArray(field.options)) {
        field.options.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt;
          option.textContent = opt;
          input.appendChild(option);
        });
      }

    } else if (field.type === 'checkbox') {
      // Different layout for checkbox
      div.className = "template-field-group col-span-2 flex items-center gap-3 bg-gray-50 p-3 rounded-md border border-gray-200";
      label.className = "block text-sm font-medium text-gray-900 m-0 order-2"; // label after

      input = document.createElement('input');
      input.type = "checkbox";
      input.className = "h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded order-1";

    } else {
      // Text, Number, Date
      input = document.createElement('input');
      input.type = field.type || 'text';
      input.className = "template-input block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm";
    }

    div.appendChild(label);
    div.appendChild(input);
    container.appendChild(div);
  });
}





