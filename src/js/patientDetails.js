document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) {
    document.body.innerHTML = '<p>Paciente no especificado</p>';
    return;
  }

  const token = localStorage.getItem('authToken');
  if (!token) {
    window.location.href = '/signIn.html';
    return;
  }

  try {
    const res = await fetch(`https://medinet360-api.onrender.com/api/patients/${id}`, {
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

    // Función auxiliar para formatear la fecha (dd/mm/yyyy)
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };


    const fixedDate = formatDate(patient.birthday)

    

    // SVGs for gender
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

    document.getElementById('patientImage').innerHTML = genderIcon
    document.getElementById('patientName').textContent = `${patient.name ?? ''} ${patient.lastName ?? ''}`;
    document.getElementById('patientEmail').textContent = patient.email ?? 'N/D';
    document.getElementById('patientPhone').textContent = patient.phone ?? 'N/D';
    document.getElementById('patientBirthday').textContent = fixedDate ?? patient.dob ?? 'N/D';
    document.getElementById('patientAge').textContent = `${patient.age} years old` ?? 'N/D';
    document.getElementById('patientGender').textContent = `${patient.gender}` ?? 'N/D';
    document.getElementById('patientNotes').textContent = patient.notes ?? '...';

    // Custom fields
    const cfContainer = document.getElementById('patientDetails');
    const separator = document.createElement('hr')
    if (cfContainer) {
      (patient.customFields || []).forEach(cf => {
        const el = document.createElement('p');
        const fieldValue = document.createElement('p');

        fieldValue.id = 'customField'
        el.className = 'text-sm';

        el.innerHTML = `<strong>${cf.fieldName}:</strong>`;
        fieldValue.textContent = cf.value

        cfContainer.appendChild(separator)
        cfContainer.appendChild(el);
        cfContainer.appendChild(fieldValue)
      });
    }
  } catch (err) {
    console.error('Error loading patient:', err);
    document.body.innerHTML = `<p>Error cargando paciente: ${err.message}</p>`;
  }
});