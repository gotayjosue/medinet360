// Verifying the user sesion status
import { checkAuth, requireAuth } from './utils.js';

//Importing the alert container function from utils.js
import { showToast } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    requireAuth();
});

//Logo redirection function
const logo = document.querySelector('.logo');
logo.style.cursor = 'pointer'

logo.addEventListener('click', () =>{
    window.location.href = '../index.html'
})

//Selecting elements for the modal form
const patientModal = document.getElementById('patientFormModal')
const addPatientButton = document.getElementById('addPatientButton')
const closeButton = document.getElementById('closeModalButton')

//Add button event to open the modal when it is clicked
addPatientButton.addEventListener('click', () => {
    patientModal.showModal()
})

//Close button event to close the modal form when it is clicked
closeButton.addEventListener('click', () => {
    patientModal.close()
})

// Selecting elements for the add custom fields functionality
const addFieldsButton = document.getElementById('addFieldsButton');
const patientForm = document.getElementById('patientForm');

// Counter para generar IDs únicos
let customFieldCount = 0;

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
  console.log('[frontend] authToken from localStorage:', token);
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
    customFields: []
  };

  /* Añadir campos personalizados */
  document.querySelectorAll('.custom-field-group').forEach(group => {
    const fieldName = group.querySelector('.custom-field-name')?.value.trim();
    const value = group.querySelector('.custom-field-value')?.value.trim();
    if (fieldName && value) {
      formData.customFields.push({ fieldName, value });
    }
  });

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
      // Si el backend devuelve { error: "..."} → usar ese mensaje
      console.error('[API error]', data);
      throw new Error(data.error || data.message || 'Failed to create patient');
    }

    console.log('✅ Success:', data);

    /* Limpiar formulario y UI */
    patientForm.reset();
    if (typeof patientModal !== 'undefined') patientModal.close();
    showToast('Patient created successfully!', 'success');

  } catch (error) {
    console.error('❌ Error:', error);
    showToast(error.message || 'Error creating patient', 'error');
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
    const patientsArray = Array.isArray(data) ? data : data.patients;

    renderPatients(patientsArray);
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

  // Función auxiliar para calcular edad a partir de la fecha de nacimiento
  const getAgeFromDOB = (dobStr) => {
    const birth = new Date(dobStr);
    const ageDifMs = Date.now() - birth.getTime();
    const ageDate = new Date(ageDifMs); // milisegundos desde epoch
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  // Función auxiliar para formatear la fecha (dd/mm/yyyy)
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const cardsHTML = patients.map(p => {

    const age = p.age ?? getAgeFromDOB(p.dateOfBirth ?? p.dob ?? '');
    const dobFormatted = formatDate(p.birthday ?? p.dob ?? '');

    return `
      <div class="bg-white rounded-2xl shadow p-4">
        <div class="bg-gray-800 text-white p-4 rounded-t-xl flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none"
            viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 12c2.28 0 4-1.72 4-4s-1.72-4-4-4-4 1.72-4 4 1.72 4 4 4zM4 20v-1a4 4 0 014-4h8a4 4 0 014 4v1" />
          </svg>
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
}

/* ------------- 3️⃣  Ejecutar cuando el DOM esté listo ------------- */
document.addEventListener('DOMContentLoaded', () => {
  loadPatients();
});

