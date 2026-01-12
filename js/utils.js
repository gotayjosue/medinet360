// Function to add expand/collapse animation to FAQ details elements
export function expandDetails() {
  document.querySelectorAll('.faq-list details').forEach((detail) => {
    const summary = detail.querySelector('summary');
    const content = detail.querySelector('.content');

    // Remove the 'open' attribute and class initially
    detail.removeAttribute('open');
    content.style.maxHeight = '0px';

    summary.addEventListener('click', (e) => {
      e.preventDefault();

      const isOpen = detail.classList.contains('open');

      if (isOpen) {
        // Close with animation
        content.style.maxHeight = content.scrollHeight + 'px';
        requestAnimationFrame(() => {
          content.style.maxHeight = '0px';
        });

        detail.classList.remove('open');

        setTimeout(() => {
          detail.removeAttribute('open');
        }, 400); // Duration equal to the transition
      } else {
        // Open with animation
        detail.setAttribute('open', true);
        detail.classList.add('open');

        content.style.maxHeight = '0px';
        requestAnimationFrame(() => {
          content.style.maxHeight = content.scrollHeight + 'px';
        });
      }
    });
  });
}


// Decode JWT token (without verification - only for reading payload)
export function decodeJWT(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

// Check if token is expired
export function isTokenExpired(token) {
  if (!token) return true;

  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) return true;

  // exp is in seconds, Date.now() is in milliseconds
  const currentTime = Date.now() / 1000;
  return decoded.exp < currentTime;
}

// Validate token existence and expiration
export function validateToken() {
  const token = localStorage.getItem('authToken');

  if (!token) {
    return false;
  }

  if (isTokenExpired(token)) {
    // Token expired, clean up and return false
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    return false;
  }

  return true;
}

export function checkAuth() {
  const token = localStorage.getItem('authToken');
  const signInButton = document.getElementById('signInButton');

  if (!signInButton) return;

  // Validate token exists and is not expired
  if (token && !isTokenExpired(token)) {
    signInButton.textContent = 'Logout';
    signInButton.addEventListener('click', handleLogout);
  } else {
    // Token doesn't exist or is expired
    if (token && isTokenExpired(token)) {
      // Clean up expired token
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUser');
    }
    signInButton.textContent = 'Sign In';
    signInButton.addEventListener('click', () => {
      window.location.href = 'signIn.html';
    });
  }
}

export async function handleLogout() {
  try {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    showToast("Logout successfuly", "success", 4000)
    window.location.href = 'index.html';
  } catch (error) {
    console.error('Error during logout:', error);
    localStorage.clear();
    window.location.href = '/index.html';
  }
}

export async function handleLogoutAccount() {
  try {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    showToast("Logout successfuly", "success", 4000)
    window.location.href = '../index.html';
  } catch (error) {
    console.error('Error during logout:', error);
    localStorage.clear();
    window.location.href = '../index.html';
  }
}

// Protección de rutas del dashboard
export function requireAuth() {
  if (!validateToken()) {
    const token = localStorage.getItem('authToken');
    const message = token ? "Your session has expired. Please sign in again." : "You must be logged in";
    showToast(message, "error");
    setTimeout(() => {
      window.location.href = '/signIn.html';
    }, 900);
  }
}

//Alert message
// Toast helpers
function ensureToastContainer() {
  if (document.getElementById('toastContainer')) return;
  const container = document.createElement('div');
  container.id = 'toastContainer';
  Object.assign(container.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    zIndex: '999999',
    alignItems: 'flex-end'
  });
  document.body.appendChild(container);
}

export function showToast(message, type = 'info', duration = 4000) {
  ensureToastContainer();
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');

  const bg = type === 'success' ? '#16a34a' : type === 'error' ? '#dc2626' : '#374151';
  const icon = type === 'success' ? '✓' : type === 'error' ? '⚠' : 'ℹ';

  toast.innerHTML = `<strong style="margin-right:8px">${icon}</strong><span>${message}</span>`;
  Object.assign(toast.style, {
    background: bg,
    color: '#fff',
    padding: '10px 14px',
    borderRadius: '8px',
    boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
    opacity: '0',
    transform: 'translateY(-8px)',
    transition: 'opacity .22s ease, transform .22s ease',
    maxWidth: '320px',
    fontFamily: 'Roboto, system-ui, -apple-system, "Segoe UI", Arial',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    zIndex: '999999',
  });

  container.appendChild(toast);
  // animate in
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  // remove after duration
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-8px)';
    setTimeout(() => toast.remove(), 240);
  }, duration);
  return toast;
}


export function formatDateForInput(dateStr) {
  // Normaliza nulos
  if (!dateStr) return '';

  // Si es un objeto Date
  if (dateStr instanceof Date) {
    if (isNaN(dateStr.getTime())) return '';
    return dateStr.toISOString().split('T')[0];
  }

  // Si es string, intentar parsear con Date y devolver YYYY-MM-DD
  try {
    // Maneja ISO, "Wed Nov 18 1998 ..." y otros formatos
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) return '';
    return parsed.toISOString().split('T')[0];
  } catch (err) {
    return '';
  }
}


// Función auxiliar para formatear la fecha (dd/mm/yyyy) SIN offset
export function formatDate(dateStr) {
  if (!dateStr) return 'N/D';

  // Si ya es string YYYY-MM-DD, parsear directamente
  if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`; // "17/11/1998"
  }

  // Fallback para otros formatos (Date objects, ISO strings, etc.)
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'N/D';

  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

//Function to calculate the age

export function getAgeFromDOB(dobStr) {
  if (!dobStr) return null;

  // Si es string YYYY-MM-DD, calcular edad sin offset
  if (typeof dobStr === 'string' && dobStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dobStr.split('-').map(Number);
    const today = new Date();
    let age = today.getFullYear() - year;
    const m = today.getMonth() + 1 - month;

    if (m < 0 || (m === 0 && today.getDate() < day)) {
      age--;
    }
    return age;
  }

  // Fallback para otros formatos
  const birth = new Date(dobStr);
  if (isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();

  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

export function fixDateForUTC(dateInput) {
  const d = new Date(dateInput);
  d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
}

// Sleep function
export const sleep = (ms) => new Promise(res => setTimeout(res, ms));

// Convertir hora a minutos
export function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// Get clinic name
export async function getClinicName() {
  const clinicNameText = document.getElementById('clinicNameText');
  const token = localStorage.getItem('authToken');
  if (!token) return;

  // Fetch clinic name from profile
  try {
    const res = await fetch('https://medinet360-api.onrender.com/api/auth/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    // Check for 401 Unauthorized (token expired or invalid)
    if (res.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUser');
      showToast("Your session has expired. Please sign in again.", "error");
      setTimeout(() => {
        window.location.href = '/signIn.html';
      }, 900);
      return;
    }

    const data = await res.json();
    const clinicId = data.clinicId;

    const clinicRes = await fetch(`https://medinet360-api.onrender.com/api/clinic/${clinicId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    // Check for 401 on clinic fetch too
    if (clinicRes.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUser');
      showToast("Your session has expired. Please sign in again.", "error");
      setTimeout(() => {
        window.location.href = '/signIn.html';
      }, 900);
      return;
    }

    const clinicData = await clinicRes.json();
    clinicNameText.textContent = clinicData.name;
  } catch (error) {
    console.error("Error fetching clinic name:", error);
    showToast("Error fetching clinic name", "error");
    return "Unknown Clinic";
  }
}