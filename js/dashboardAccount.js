import { checkAuth, requireAuth, handleLogoutAccount, showToast } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  requireAuth();
  loadUserData();
  loadClinicId();
  loadPendingAssistants();
  loadApprovedAssistants();
  const logo = document.querySelector('.logo');

  logo.style.cursor = 'pointer'
  logo.addEventListener('click', () => {
    window.location.href = '../index.html'
  })
  // Mobile menu logic (replicated/adapted from home.html logic)
  const menuBtn = document.getElementById('menu-btn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');

  if (menuBtn && sidebar && overlay) {
    menuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('-translate-x-full');
      overlay.classList.toggle('hidden');
    });

    overlay.addEventListener('click', () => {
      sidebar.classList.add('-translate-x-full');
      overlay.classList.add('hidden');
    });
  }

  // Tab Switching Logic
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  function switchTab(tabId) {
    // Hide all contents
    tabContents.forEach(content => {
      content.classList.add('hidden');
    });

    // Show selected content
    const selectedContent = document.getElementById(tabId);
    if (selectedContent) {
      selectedContent.classList.remove('hidden');
    }

    // Update button states
    tabButtons.forEach(btn => {
      btn.classList.remove('active', 'text-indigo-600', 'font-semibold');
      btn.classList.add('text-gray-500');

      // Reset the border indicator
      const indicator = btn.querySelector('.active-indicator');
      if (indicator) indicator.classList.add('hidden');
    });

    // Highlight active button
    const activeBtn = document.querySelector(`[data-tab="${tabId}"]`);
    if (activeBtn) {
      activeBtn.classList.remove('text-gray-500');
      activeBtn.classList.add('active', 'text-indigo-600', 'font-semibold');

      const indicator = activeBtn.querySelector('.active-indicator');
      if (indicator) indicator.classList.remove('hidden');
    }
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  // Logout Functionality
  const logoutBtn = document.getElementById('logout-btn');
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    handleLogoutAccount();
  });

  // Optional: Handle form submission for 'User Info'
  const profileForm = document.getElementById('profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', (e) => {
      e.preventDefault();
      alert('Changes saved successfully! (Simulation)');
    });
  }
});

async function loadUserData() {
  const token = localStorage.getItem("authToken");
  if (!token) return console.log("No user logged in");

  try {
    const res = await fetch("https://medinet360-api.onrender.com/api/auth/profile", {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!res.ok) {
      console.log("Error loading user");
      return;
    }

    const user = await res.json();

    // Ocultar ciertas secciones si el usuario es asistente
    if (user.role === "assistant") {
      document.getElementById('requests').style.display = 'none';
      document.getElementById('assistants').style.display = 'none';
      document.getElementById('requestsBtn').style.display = 'none';
      document.getElementById('assistantsBtn').style.display = 'none';
    }

    // RELLENA LOS CAMPOS DEL PERFIL
    document.getElementById("name").value = user.name || "";
    document.getElementById("lastName").value = user.lastName || "";
    document.getElementById("fullName").textContent = user.name + " " + user.lastName || "";
    document.getElementById("email").value = user.email || "";
    document.getElementById("role").textContent = `Role: ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}` || "";
    // GENERAR INICIALES
    const firstInitial = user.name ? user.name.charAt(0).toUpperCase() : "";
    const lastInitial = user.lastName ? user.lastName.charAt(0).toUpperCase() : "";
    const initials = `${firstInitial}${lastInitial}`;

    // Elementos del DOM
    const avatar = document.getElementById("profile-avatar");
    const profileImage = document.getElementById("profileImage");

    // SI NO HAY FOTO → MOSTRAR INICIALES
    if (!user.profileImage || user.profileImage === "") {
      profileImage.classList.add("hidden");

      avatar.textContent = initials;
      avatar.classList.remove("hidden");
    }
    // SI HAY FOTO → MOSTRAR FOTO
    else {
      avatar.classList.add("hidden");

      profileImage.src = user.profileImage;
      profileImage.classList.remove("hidden");
    }


  } catch (err) {
    console.log("Fetch error:", err);
  }
}

// AGREGAR ASISTENTE
const addAssistantBtn = document.getElementById("addAssistantBtn");
const addAssistantDialog = document.getElementById("addAssistantDialog");
const closeDialogBtn = document.getElementById("closeDialogBtn");
const copyCodeBtn = document.getElementById("copyCodeBtn");

addAssistantBtn.addEventListener("click", () => {
  addAssistantDialog.showModal();
});

closeDialogBtn.addEventListener("click", () => {
  addAssistantDialog.close();
});

copyCodeBtn.addEventListener("click", () => {
  const codeInput = document.getElementById("assistantCode");
  codeInput.select();
  document.execCommand("copy");
  showToast("Código copiado al portapapeles", "success");
});

async function loadClinicId() {
  const token = localStorage.getItem("authToken");
  if (!token) return console.log("No user logged in");

  try {
    const res = await fetch("https://medinet360-api.onrender.com/api/auth/profile", {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!res.ok) {
      console.log("Error loading user");
      return;
    }

    const user = await res.json();
    const clinicId = user.clinicId;
    document.getElementById("assistantCode").value = clinicId || "";
  } catch (err) {
    console.log("Fetch error:", err);
  }
}

// ============================================
// ASSISTANT APPROVAL SYSTEM
// ============================================

async function loadPendingAssistants() {
  const token = localStorage.getItem("authToken");
  if (!token) {
    console.log("No user logged in");
    return;
  }

  const loadingEl = document.getElementById("loadingAssistants");
  const listEl = document.getElementById("pendingAssistantsList");
  const emptyEl = document.getElementById("emptyAssistants");

  try {
    const res = await fetch("https://medinet360-api.onrender.com/api/assistants/pending", {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!res.ok) {
      console.log("Error loading pending assistants");
      loadingEl.classList.add("hidden");
      emptyEl.classList.remove("hidden");
      return;
    }

    const assistants = await res.json();

    // Hide loading
    loadingEl.classList.add("hidden");

    // Render assistants or show empty state
    if (assistants && assistants.length > 0) {
      renderPendingAssistants(assistants);
      listEl.classList.remove("hidden");
      emptyEl.classList.add("hidden");
    } else {
      listEl.classList.add("hidden");
      emptyEl.classList.remove("hidden");
    }

  } catch (err) {
    console.log("Fetch error:", err);
    loadingEl.classList.add("hidden");
    emptyEl.classList.remove("hidden");
  }
}

function renderPendingAssistants(assistants) {
  const listEl = document.getElementById("pendingAssistantsList");
  listEl.innerHTML = ""; // Clear existing content

  assistants.forEach(assistant => {
    const card = document.createElement("div");
    card.className = "bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow";
    card.id = `assistant-${assistant._id}`;

    card.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <!-- Avatar with initials -->
          <div class="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-lg font-semibold">
            ${assistant.name.charAt(0).toUpperCase()}${assistant.lastName.charAt(0).toUpperCase()}
          </div>
          
          <!-- Assistant Info -->
          <div>
            <h4 class="text-lg font-semibold text-gray-800">${assistant.name} ${assistant.lastName}</h4>
            <p class="text-sm text-gray-500">${assistant.email}</p>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-2">
          <!-- Reject Button -->
          <button 
            onclick="rejectAssistant('${assistant._id}', this)"
            class="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors shadow-sm hover:shadow-md flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Rechazar
          </button>
          
          <!-- Approve Button -->
          <button 
            onclick="approveAssistant('${assistant._id}', this)"
            class="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors shadow-sm hover:shadow-md flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            Aprobar
          </button>
        </div>
      </div>
    `;

    listEl.appendChild(card);
  });
}

async function approveAssistant(assistantId, buttonElement) {
  const token = localStorage.getItem("authToken");
  if (!token) {
    showToast("No estás autenticado", "error");
    return;
  }

  // Disable button and show loading state
  buttonElement.disabled = true;
  buttonElement.innerHTML = `
    <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    Aprobando...
  `;

  try {
    const res = await fetch("https://medinet360-api.onrender.com/api/assistants/approve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ assistantId })
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Error al aprobar asistente");
    }

    // Success - remove card from DOM with animation
    const card = document.getElementById(`assistant-${assistantId}`);
    if (card) {
      card.style.transition = "opacity 0.3s, transform 0.3s";
      card.style.opacity = "0";
      card.style.transform = "translateX(20px)";

      setTimeout(() => {
        card.remove();

        // Check if list is now empty
        const listEl = document.getElementById("pendingAssistantsList");
        if (listEl.children.length === 0) {
          listEl.classList.add("hidden");
          document.getElementById("emptyAssistants").classList.remove("hidden");
        }
      }, 300);
    }

    showToast("Asistente aprobado exitosamente", "success");

  } catch (err) {
    console.error("Error approving assistant:", err);
    showToast(err.message || "Error al aprobar asistente", "error");

    // Re-enable button on error
    buttonElement.disabled = false;
    buttonElement.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
      Aprobar
    `;
  }
}

// Reject Assistant Function
async function rejectAssistant(assistantId, buttonElement) {
  const token = localStorage.getItem("authToken");
  if (!token) {
    showToast("No estás autenticado", "error");
    return;
  }

  // Disable button and show loading state
  buttonElement.disabled = true;
  buttonElement.innerHTML = `
    <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    Rechazando...
  `;

  try {
    const res = await fetch("https://medinet360-api.onrender.com/api/assistants/reject", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ assistantId })
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Error al rechazar asistente");
    }

    // Success - remove card from DOM with animation
    const card = document.getElementById(`assistant-${assistantId}`);
    if (card) {
      card.style.transition = "opacity 0.3s, transform 0.3s";
      card.style.opacity = "0";
      card.style.transform = "translateX(-20px)";

      setTimeout(() => {
        card.remove();

        // Check if list is now empty
        const listEl = document.getElementById("pendingAssistantsList");
        if (listEl.children.length === 0) {
          listEl.classList.add("hidden");
          document.getElementById("emptyAssistants").classList.remove("hidden");
        }
      }, 300);
    }

    showToast("Solicitud rechazada", "success");

  } catch (err) {
    console.error("Error rejecting assistant:", err);
    showToast(err.message || "Error al rechazar asistente", "error");

    // Re-enable button on error
    buttonElement.disabled = false;
    buttonElement.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
      Rechazar
    `;
  }
}

// ============================================
// APPROVED ASSISTANTS LIST
// ============================================

async function loadApprovedAssistants() {
  const token = localStorage.getItem("authToken");
  if (!token) {
    console.log("No user logged in");
    return;
  }

  try {
    const res = await fetch("https://medinet360-api.onrender.com/api/assistants/all", {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!res.ok) {
      console.log("Error loading approved assistants");
      return;
    }

    const assistants = await res.json();

    // Render approved assistants
    if (assistants && assistants.length > 0) {
      renderApprovedAssistants(assistants);
    }

  } catch (err) {
    console.log("Fetch error:", err);
  }
}


function renderApprovedAssistants(assistants) {
  const assistantsTab = document.getElementById("assistants");

  // Clear existing content
  assistantsTab.innerHTML = `
    <div class="space-y-4">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-2xl font-bold text-gray-800">Mis Asistentes</h3>
        <span class="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
          ${assistants.length} ${assistants.length === 1 ? 'Asistente' : 'Asistentes'}
        </span>
      </div>
      <div id="approvedAssistantsList" class="space-y-4"></div>
    </div>
  `;

  const listEl = document.getElementById("approvedAssistantsList");

  assistants.forEach(assistant => {
    const card = document.createElement("div");
    card.className = "bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border border-transparent hover:border-indigo-100";
    card.id = `assistant-card-${assistant._id}`;

    card.innerHTML = `
      <div class="cursor-pointer" onclick="toggleAssistantCard('${assistant._id}')">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <!-- Avatar with initials -->
            <div class="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-lg font-semibold shadow-sm">
              ${assistant.name.charAt(0).toUpperCase()}${assistant.lastName.charAt(0).toUpperCase()}
            </div>
            
            <!-- Assistant Info -->
            <div>
              <h4 class="text-lg font-bold text-gray-800">${assistant.name} ${assistant.lastName}</h4>
              <p class="text-sm text-gray-500 font-medium">${assistant.email}</p>
            </div>
          </div>

          <!-- Status & Chevron -->
          <div class="flex items-center gap-4">
             <span class="hidden md:flex px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wide items-center gap-1">
              <span class="w-2 h-2 bg-green-500 rounded-full"></span>
              Activo
            </span>
            <div class="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
              <svg id="chevron-${assistant._id}" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 chevron-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Collapsible Body -->
      <div id="body-${assistant._id}" class="assistant-card-body">
        
        <!-- Loading Spinner -->
        <div id="loading-${assistant._id}" class="hidden py-8 flex justify-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>

        <!-- Permissions Content -->
        <div id="content-${assistant._id}" class="hidden">
          <h5 class="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Permisos del Asistente</h5>
          
          <form id="form-${assistant._id}" onsubmit="updateAssistantPermissions(event, '${assistant._id}')">
            <div class="permissions-grid">
              
              <div class="permission-item">
                <label>
                  <input type="checkbox" name="permissions" value="createPatient" class="permission-checkbox">
                  <span>Crear Pacientes</span>
                </label>
              </div>

              <div class="permission-item">
                <label>
                  <input type="checkbox" name="permissions" value="editPatient" class="permission-checkbox">
                  <span>Editar Pacientes</span>
                </label>
              </div>

              <div class="permission-item">
                <label>
                  <input type="checkbox" name="permissions" value="deletePatient" class="permission-checkbox">
                  <span>Eliminar Pacientes</span>
                </label>
              </div>

              <div class="permission-item">
                <label>
                  <input type="checkbox" name="permissions" value="createAppointment" class="permission-checkbox">
                  <span>Crear Citas</span>
                </label>
              </div>

              <div class="permission-item">
                <label>
                  <input type="checkbox" name="permissions" value="editAppointment" class="permission-checkbox">
                  <span>Editar Citas</span>
                </label>
              </div>

              <div class="permission-item">
                <label>
                  <input type="checkbox" name="permissions" value="deleteAppointment" class="permission-checkbox">
                  <span>Eliminar Citas</span>
                </label>
              </div>

            </div>

            <div class="flex justify-end pt-2">
              <button type="submit" class="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 hover:shadow-indigo-500/40 transition-all transform active:scale-95 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                Actualizar Permisos
              </button>
            </div>
          </form>
        </div>

      </div>
    `;

    listEl.appendChild(card);
  });

  // Add "Agregar Asistente" button at the end
  const buttonContainer = document.createElement("div");
  buttonContainer.className = "flex justify-center mt-8 pb-8";
  buttonContainer.innerHTML = `
    <button id="addAssistantBtn" class="flex items-center gap-2 px-6 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-medium hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all group">
      <div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-indigo-100 text-gray-400 group-hover:text-indigo-600 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
      </div>
      Agregar Nuevo Asistente
    </button>
  `;
  assistantsTab.querySelector(".space-y-4").appendChild(buttonContainer);

  // Re-attach event listener for the button (since we recreated it)
  buttonContainer.querySelector("button").addEventListener("click", () => {
    const dialog = document.getElementById("addAssistantDialog");
    dialog.showModal();
  });
}

// TOGGLE CARD & FETCH PERMISSIONS
async function toggleAssistantCard(assistantId) {
  const body = document.getElementById(`body-${assistantId}`);
  const chevron = document.getElementById(`chevron-${assistantId}`);
  const content = document.getElementById(`content-${assistantId}`);
  const loading = document.getElementById(`loading-${assistantId}`);

  // Toggle classes
  const isOpen = body.classList.contains('open');

  if (isOpen) {
    // Close
    body.classList.remove('open');
    chevron.classList.remove('rotate');
  } else {
    // Open
    body.classList.add('open');
    chevron.classList.add('rotate');

    // Check if data is already loaded (simple check: if form input has checked attribute set?? No, better flag)
    // Or just check if content is hidden and empty inputs.
    // Let's rely on a data attribute or just checking if we already fetched.
    if (!body.dataset.loaded) {
      await fetchAssistantPermissions(assistantId);
      body.dataset.loaded = "true";
    }
  }
}

async function fetchAssistantPermissions(assistantId) {
  const loading = document.getElementById(`loading-${assistantId}`);
  const content = document.getElementById(`content-${assistantId}`);
  const form = document.getElementById(`form-${assistantId}`);

  loading.classList.remove('hidden');
  content.classList.add('hidden');

  const token = localStorage.getItem("authToken");

  try {
    const res = await fetch(`https://medinet360-api.onrender.com/api/assistants/permissions/${assistantId}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (!res.ok) throw new Error("Error cargando permisos");

    const data = await res.json();
    const permissions = data.permissions || {};

    // Populate Checkboxes
    const checkboxes = form.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
      if (permissions[cb.value]) {
        cb.checked = true;
      } else {
        cb.checked = false;
      }
    });

    loading.classList.add('hidden');
    content.classList.remove('hidden');

  } catch (err) {
    console.error(err);
    loading.innerHTML = `<p class="text-red-500 text-sm">Error al cargar permisos. Intenta de nuevo.</p>`;
    showToast("Error al cargar permisos", "error");
  }
}

// UPDATE PERMISSIONS
async function updateAssistantPermissions(e, assistantId) {
  e.preventDefault();

  const form = document.getElementById(`form-${assistantId}`);
  const btn = form.querySelector('button[type="submit"]');
  const checkboxes = form.querySelectorAll('input[type="checkbox"]');

  const permissions = {};
  checkboxes.forEach(cb => {
    permissions[cb.value] = cb.checked;
  });

  // Loading state
  const originalBtnContent = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Guardando...`;

  const token = localStorage.getItem("authToken");

  try {
    const res = await fetch(`https://medinet360-api.onrender.com/api/assistants/update-permissions/${assistantId}`, {
      method: 'PUT',
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        permissions
      })
    });

    if (!res.ok) throw new Error("Error actualizando permisos");

    const data = await res.json();
    showToast("Permisos actualizados correctamente", "success");

  } catch (err) {
    console.error(err);
    showToast("Error al actualizar permisos", "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalBtnContent;
  }
}

// Make functions globally accessible for onclick handlers
window.approveAssistant = approveAssistant;
window.rejectAssistant = rejectAssistant;
window.toggleAssistantCard = toggleAssistantCard;
window.updateAssistantPermissions = updateAssistantPermissions;

