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

//Selecting elements for the add custom fields functionality
const addFieldsButton = document.getElementById('addFieldsButton');
const patientForm = document.getElementById('patientForm');

// Counter para generar IDs únicos
let customFieldCount = 0;

//Add custom fields function
addFieldsButton.addEventListener('click', () => {
    customFieldCount++;
    
    // Crear el contenedor para el nuevo campo
    const fieldContainer = document.createElement('div');
    fieldContainer.className = 'space-y-2 mt-4';
    
    // Crear el label editable
    const label = document.createElement('input');
    label.type = 'text';
    label.placeholder = 'Enter field name';
    label.className = 'block text-sm font-medium text-gray-700 border-none p-1 focus:ring-0 focus:outline-none';
    
    // Crear el input para el valor
    const input = document.createElement('input');
    input.type = 'text';
    input.name = `customField_${customFieldCount}`;
    input.id = `customField_${customFieldCount}`;
    input.className = 'mt-1 block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500';
    
    // Agregar un botón para eliminar el campo
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.innerHTML = '×';
    deleteButton.className = 'ml-2 text-red-500 hover:text-red-700';
    
    // Crear un contenedor para el label y el botón de eliminar
    const labelContainer = document.createElement('div');
    labelContainer.className = 'flex items-center justify-between';
    labelContainer.appendChild(label);
    labelContainer.appendChild(deleteButton);
    
    // Agregar los elementos al contenedor
    fieldContainer.appendChild(labelContainer);
    fieldContainer.appendChild(input);
    
    // Insertar el nuevo campo antes del último div (botones)
    const lastDiv = patientForm.lastElementChild;
    patientForm.insertBefore(fieldContainer, lastDiv);
    
    // Evento para eliminar el campo
    deleteButton.addEventListener('click', () => {
        fieldContainer.remove();
    });
});


//Add patient function
patientForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const token = localStorage.getItem('authToken');
    if (!token) {
        alert('Authentication required. Please sign in again.');
        window.location.href = '../signIn.html';
        return;
    }

    // Recolectar los datos básicos
    const formData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        customFields: []
    };

    // Recolectar campos personalizados
    const customFields = document.querySelectorAll('[id^="customField_"]');
    customFields.forEach(field => {
        const label = field.parentElement.querySelector('input[type="text"]').value;
        formData.customFields.push({
            fieldName: label,
            value: field.value
        });
    });

    try {
        const response = await fetch('https://medinet360-api.onrender.com/api/patients', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });

        // Get the response body
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to create patient');
        }

        console.log('Success:', data);
        
        // Limpiar el formulario y cerrar el modal
        patientForm.reset();
        patientModal.close();
        
        // Mejorar el mensaje de éxito
        showToast('Patient created successfully!', 'success');
        
    } catch (error) {
        console.error('Error:', error);
        showToast(error.message || 'Error creating patient', 'error');
    }
});

