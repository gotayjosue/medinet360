import {
  checkAuth,
  requireAuth,
  showToast,
  formatDateForInput,
  formatDate,
  getAgeFromDOB
} from "./utils";

let currentPatientId = null; // Guardar el ID del paciente actual

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) {
    document.body.innerHTML = '<p>Paciente no especificado</p>';
    return;
  }

  currentPatientId = id; // Guardar el ID para usar en la actualización

  const token = localStorage.getItem('authToken');
  if (!token) {
    window.location.href = '/signIn.html';
    return;
  }

  try {
    const res = await fetch(`https://medinet360api.vercel.app/api/patients/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || `Error ${res.status}`);
    }

    const patient = await res.json();
    populatePatientData(patient); // Llenar datos en la página
    populateUpdateForm(patient);  // Llenar formulario de actualización

  } catch (err) {
    console.error('Error loading patient:', err);
    document.body.innerHTML = `<p>Error cargando paciente: ${err.message}</p>`;
  }
});

// Función para llenar datos en la página principal
function populatePatientData(patient) {

  const fixedDate = formatDate(patient.birthday);

  const maleSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M12 12c2.28 0 4-1.72 4-4s-1.72-4-4-4-4 1.72-4 4 1.72 4 4 4zM4 20v-1a4 4 0 014-4h8a4 4 0 014 4v1" />
    </svg>`;

  const femaleSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" stroke="currentColor">
      <circle cx="12" cy="7" r="3" />
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M7 20l5-8 5 8" />
    </svg>`;

  const genderIcon = (patient.gender && patient.gender.toLowerCase() === 'female') ? femaleSvg : maleSvg;
  const age = getAgeFromDOB(patient.birthday)

  document.getElementById('patientImage').innerHTML = genderIcon;
  document.getElementById('patientName').textContent = `${patient.name ?? ''} ${patient.lastName ?? ''}`;
  document.getElementById('patientEmail').textContent = patient.email ?? 'N/D';
  document.getElementById('patientPhone').textContent = patient.phone ?? 'N/D';
  document.getElementById('patientBirthday').textContent = fixedDate ?? patient.dob ?? 'N/D';
  document.getElementById('patientAge').textContent = `${age} years old` ?? 'N/D';
  document.getElementById('patientGender').textContent = `${patient.gender}` ?? 'N/D';
  document.getElementById('patientNotes').textContent = patient.notes ?? '...';

  // Custom fields
  const cfContainer = document.getElementById('patientDetails');
  if (cfContainer) {
    (patient.customFields || []).forEach(cf => {
      const separator = document.createElement('hr');
      const el = document.createElement('p');
      const fieldValue = document.createElement('p');

      fieldValue.id = 'customField';
      el.className = 'text-sm';

      el.innerHTML = `<strong>${cf.fieldName}:</strong>`;
      fieldValue.textContent = cf.value;

      cfContainer.appendChild(el);
      cfContainer.appendChild(fieldValue);
      cfContainer.appendChild(separator);
    });
  }
}

let customFieldCount = 0;

// Función para llenar el formulario de actualización
function populateUpdateForm(patient) {

  document.getElementById('name').value = patient.name || '';
  document.getElementById('lastName').value = patient.lastName || '';
  document.getElementById('email').value = patient.email || '';
  document.getElementById('phone').value = patient.phone || '';
  document.getElementById('birthday').value = formatDateForInput(patient.birthday) || '';
  document.getElementById('gender').value = patient.gender || '';
  document.getElementById('notes').value = patient.notes || '';

  // Limpiar custom fields existentes en el formulario
  const customFieldsContainer = document.getElementById('customFieldsContainer');
  customFieldsContainer.innerHTML = '';

  // Llenar custom fields
  (patient.customFields || []).forEach((cf, index) => {
    customFieldCount++
    const fieldGroup = document.createElement('div');
    fieldGroup.className = 'custom-field-group space-y-2 mt-4';

    const labelContainer = document.createElement('div');
    labelContainer.className = 'flex items-center justify-between';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Field Name';
    nameInput.value = cf.fieldName || '';
    nameInput.className = 'custom-field-name block text-sm font-medium text-gray-700 border p-1 rounded';

    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.name = `customField_${customFieldCount}`;
    valueInput.id = `customField_${customFieldCount}`;
    valueInput.placeholder = 'Field Value';
    valueInput.value = cf.value || '';
    valueInput.className = 'custom-field-value mt-1 block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm';

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.innerHTML = '×';
    deleteButton.className = 'ml-2 text-red-500 hover:text-red-700';
    deleteButton.addEventListener('click', () => fieldGroup.remove());

    labelContainer.appendChild(nameInput);
    labelContainer.appendChild(deleteButton);
    fieldGroup.appendChild(labelContainer);
    fieldGroup.appendChild(valueInput);

    customFieldsContainer.appendChild(fieldGroup);
  });
}

// Modal elements
const updateModal = document.getElementById('patientFormModal');
const updateButton = document.getElementById('updatePatientButton');
const deleteButton = document.getElementById('deletePatientButton');
const closeButton = document.getElementById('closeModalButton');
const updateForm = document.getElementById('updatePatientForm');
const cancelButton = document.getElementById('cancelButton');



// Abrir modal y cargar datos
updateButton.addEventListener('click', () => {
  updateModal.showModal();
});

closeButton.addEventListener('click', () => {
  updateModal.close();
});

cancelButton.addEventListener('click', () => {
  updateModal.close();
});



// Función para añadir nuevos custom fields en el formulario de actualización
document.getElementById('addFieldsButton').addEventListener('click', () => {
  customFieldCount++
  const customFieldsContainer = document.getElementById('customFieldsContainer');

  const fieldGroup = document.createElement('div');
  fieldGroup.className = 'custom-field-group space-y-2 mt-4';

  const labelContainer = document.createElement('div');
  labelContainer.className = 'flex items-center justify-between';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = 'Enter field Name';
  nameInput.className = 'custom-field-name block text-sm font-medium text-gray-700 border-none p-1 focus:ring-0 focus:outline-none';

  const valueInput = document.createElement('input');
  valueInput.type = 'text';
  valueInput.name = `customField_${customFieldCount}`
  valueInput.id = `customField_${customFieldCount}`
  valueInput.placeholder = 'Field Value';
  valueInput.className = 'custom-field-value mt-1 block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm';

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.innerHTML = '×';
  deleteButton.className = 'ml-2 text-red-500 hover:text-red-700';
  deleteButton.addEventListener('click', () => fieldGroup.remove());

  labelContainer.appendChild(nameInput);
  labelContainer.appendChild(deleteButton);
  fieldGroup.appendChild(labelContainer);
  fieldGroup.appendChild(valueInput);

  customFieldsContainer.appendChild(fieldGroup);
});

// Enviar formulario de actualización
updatePatientForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const token = localStorage.getItem('authToken');
  if (!token || !currentPatientId) {
    showToast('Authentication required', 'error');
    return;
  }

  const birthdayValue = document.getElementById('birthday').value; // "1998-11-17"

  // Convertir a ISO string explícitamente
  const birthdayISO = new Date(birthdayValue + 'T00:00:00Z').toISOString();

  // Recolectar datos del formulario
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

  // Recolectar custom fields
  document.querySelectorAll('#updateCustomFieldsContainer .custom-field-group').forEach(group => {
    const fieldName = group.querySelector('.custom-field-name')?.value.trim();
    const value = group.querySelector('.custom-field-value')?.value.trim();

    if (fieldName && value) {
      formData.customFields.push({ fieldName, value });
    }
  });

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

  if (hasError) {
    showToast('Complete the marked custom fields.', 'error');
    // Enfocar el primer input con error
    const firstError = document.querySelector('.custom-field-name.border-red-500');
    if (firstError) firstError.focus();
    return; // detiene el envío
  }

  try {
    const response = await fetch(`https://medinet360api.vercel.app/api/patients/${currentPatientId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(formData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Failed to update patient');
    }

    showToast('Patient updated successfully!', 'success');
    updateModal.close();

    // Recargar los datos del paciente
    window.location.reload();

  } catch (error) {
    console.error('Error updating patient:', error);
    showToast(error.message || 'Error updating patient', 'error');
  }
});

// Función para eliminar paciente

// Crear modal de confirmación
const confirmModal = document.createElement('dialog');
confirmModal.className = 'rounded-lg shadow-2xl max-w-md w-full backdrop:bg-black backdrop:bg-opacity-50';
confirmModal.innerHTML = `
<div class="bg-white p-6 rounded-lg">
  <div class="flex items-center gap-4 mb-4">
    <div class="bg-red-100 p-3 rounded-full">
      <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
      </svg>
    </div>
    <div>
      <h3 class="text-lg font-semibold text-gray-900">Eliminar Paciente</h3>
      <p class="text-sm text-gray-600">Esta acción no se puede deshacer</p>
    </div>
  </div>
  <p class="text-gray-700 mb-6">¿Estás seguro de que deseas eliminar este paciente?</p>
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

const cancelDeleteBtn = confirmModal.querySelector('#cancelDelete');
const confirmDeleteBtn = confirmModal.querySelector('#confirmDelete');

if (cancelDeleteBtn) {
  cancelDeleteBtn.addEventListener('click', () => {
    confirmModal.close();
  });
}

if (confirmDeleteBtn) {
  confirmDeleteBtn.addEventListener('click', async () => {
    confirmModal.close();

    const token = localStorage.getItem('authToken');
    if (!token || !currentPatientId) {
      showToast('Authentication required', 'error');
      return;
    }

    try {
      const response = await fetch(`https://medinet360api.vercel.app/api/patients/${currentPatientId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to delete patient');
      }

      showToast('Patient deleted successfully!', 'success');
      // Redirigir a la lista de pacientes después de 1 segundo
      setTimeout(() => {
        window.location.href = 'patients.html';
      }, 1000);

    } catch (error) {
      console.error('Error deleting patient:', error);
      showToast(error.message || 'Error deleting patient', 'error');
    }
  });
}

deleteButton.addEventListener('click', () => {
  confirmModal.showModal();
});
