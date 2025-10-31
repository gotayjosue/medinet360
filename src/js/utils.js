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


export function checkAuth() {
    const token = localStorage.getItem('authToken');
    const signInButton = document.getElementById('signInButton');
    
    if (!signInButton) return;
    
    if (token) {
        signInButton.textContent = 'Logout';
        signInButton.addEventListener('click', handleLogout);
    } else {
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
        window.location.href = 'index.html';  
        showToast("Logout successfuly", "success", 4000)
    } catch (error) {
        console.error('Error during logout:', error);
        localStorage.clear();
        window.location.href = 'index.html';
    }
}

// Protección de rutas del dashboard
export function requireAuth() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        showToast("You must be logged in", "error")
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
    zIndex: 9999,
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
    gap: '6px'
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