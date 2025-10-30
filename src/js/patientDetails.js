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

    document.getElementById('patientName').textContent = `${patient.name ?? ''} ${patient.lastName ?? ''}`;
    document.getElementById('patientEmail').textContent = patient.email ?? 'N/D';
    document.getElementById('patientPhone').textContent = patient.phone ?? 'N/D';
    document.getElementById('patientBirthday').textContent = patient.birthday ?? patient.dob ?? 'N/D';

    // Custom fields
    const cfContainer = document.getElementById('patientCustomFields');
    if (cfContainer) {
      cfContainer.innerHTML = '';
      (patient.customFields || []).forEach(cf => {
        const el = document.createElement('p');
        el.className = 'text-sm';
        el.innerHTML = `<strong>${cf.fieldName}:</strong> ${cf.value}`;
        cfContainer.appendChild(el);
      });
    }
  } catch (err) {
    console.error('Error loading patient:', err);
    document.body.innerHTML = `<p>Error cargando paciente: ${err.message}</p>`;
  }
});