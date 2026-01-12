import { checkAuth, requireAuth, handleLogoutAccount, showToast, getClinicName } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  requireAuth();
  loadUserData();
  loadClinicId();
  loadPendingAssistants();
  loadApprovedAssistants();
  const logo = document.querySelector('.logo');
  getClinicName();

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

  // Handle form submission for 'User Info'
  const profileForm = document.getElementById('profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', updateUserProfile);
  }

  // Handle Subscription Management Button
  const manageSubBtn = document.getElementById('manageSubscriptionBtn');
  if (manageSubBtn) {
    manageSubBtn.addEventListener('click', handleManageSubscription);
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

    // CARGAR DATOS DE LA CLINICA
    const clinicRes = await fetch(`https://medinet360-api.onrender.com/api/clinic/${user.clinicId}`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!clinicRes.ok) {
      console.log("Error loading clinic");
      return;
    }

    const clinic = await clinicRes.json();

    // Populate Header Clinic Name
    document.getElementById("clinicName").textContent = `Clínica: ${clinic.name}` || "";

    // Load Subscription Data
    loadSubscriptionData(clinic);

    // Populate Clinic Info Tab
    const clinicNameDisplay = document.getElementById("clinicNameDisplay");
    const clinicAddressDisplay = document.getElementById("clinicAddressDisplay");
    const clinicPhoneDisplay = document.getElementById("clinicPhoneDisplay");

    if (clinicNameDisplay) clinicNameDisplay.value = clinic.name || "";
    if (clinicAddressDisplay) clinicAddressDisplay.value = clinic.address || "";
    if (clinicPhoneDisplay) clinicPhoneDisplay.value = clinic.phone || "";

    // Load Template Editor
    if (clinic.customFieldTemplate) {
      renderTemplateEditor(clinic.customFieldTemplate);
    }

    // Save clinicId for later use
    const saveTemplateBtn = document.getElementById("saveTemplateBtn");
    const saveClinicInfoBtn = document.getElementById("saveClinicInfoBtn");

    if (saveTemplateBtn) saveTemplateBtn.dataset.clinicId = user.clinicId;
    if (saveClinicInfoBtn) saveClinicInfoBtn.dataset.clinicId = user.clinicId;

    // Guardar ID del usuario en el formulario para usarlo al actualizar
    const profileForm = document.getElementById('profile-form');
    if (profileForm && user._id) {
      profileForm.dataset.userId = user._id; // Asegúrate de que el backend devuelve _id o id
    }

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

async function updateUserProfile(e) {
  e.preventDefault();

  const form = e.target;
  const userId = form.dataset.userId;
  const submitBtn = form.querySelector('button[type="submit"]');

  if (!userId) {
    showToast("Error: No se pudo identificar al usuario.", "error");
    return;
  }

  // Obtener valores
  const name = document.getElementById("name").value.trim();
  const lastName = document.getElementById("lastName").value.trim();
  const email = document.getElementById("email").value.trim();

  // Validaciones básicas
  if (!name || !lastName || !email) {
    showToast("Por favor completa todos los campos requeridos.", "error");
    return;
  }

  // UI de carga
  const originalBtnText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = `
    <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    Guardando...
  `;

  try {
    const token = localStorage.getItem("authToken");
    const res = await fetch(`https://medinet360-api.onrender.com/api/auth/profile/${userId}`, {
      method: 'PUT', // Asumo PUT, si es POST cambiar aquí
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        name,
        lastName,
        email
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Error al actualizar perfil");
    }

    // Actualizar UI con nuevos datos si es necesario (ej. nombre en header si existe)
    document.getElementById("fullName").textContent = `${data.name} ${data.lastName}`;

    // Generar nuevas iniciales
    const firstInitial = data.name ? data.name.charAt(0).toUpperCase() : "";
    const lastInitial = data.lastName ? data.lastName.charAt(0).toUpperCase() : "";
    const initials = `${firstInitial}${lastInitial}`;

    const avatar = document.getElementById("profile-avatar");
    if (avatar && (!data.profileImage || data.profileImage === "")) {
      avatar.textContent = initials;
    }

    showToast("Perfil actualizado exitosamente", "success");

  } catch (error) {
    console.error("Error updating profile:", error);
    showToast(error.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
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
      throw new Error(errorData.error || errorData.message || "Error al aprobar asistente");
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

const saveClinicInfoBtn = document.getElementById("saveClinicInfoBtn");

if (saveClinicInfoBtn) {
  saveClinicInfoBtn.addEventListener("click", updateClinicInfo);
}

async function updateClinicInfo() {
  const clinicId = saveClinicInfoBtn.dataset.clinicId;

  if (!clinicId) {
    showToast("Error: No se identificó la clínica.", "error");
    return;
  }

  const name = document.getElementById("clinicNameDisplay").value.trim();
  const address = document.getElementById("clinicAddressDisplay").value.trim();
  const phone = document.getElementById("clinicPhoneDisplay").value.trim();
  const logoLink = document.getElementById("clinicLogoDisplay").value.trim();

  if (!name) {
    showToast("El nombre de la clínica es obligatorio.", "error");
    return;
  }

  // Loading UI
  const originalText = saveClinicInfoBtn.innerHTML;
  saveClinicInfoBtn.disabled = true;
  saveClinicInfoBtn.innerHTML = "Guardando...";

  try {
    const token = localStorage.getItem("authToken");
    const res = await fetch(`https://medinet360-api.onrender.com/api/clinic/${clinicId}`, {
      method: "PUT", // Using PUT as requested
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        name,
        address,
        phone,
        logoLink
      })
    });

    const data = await res.json();

    if (!res.ok) {
      if (data.errors && Array.isArray(data.errors)) {
        // Backend returned express-validator errors
        const messages = data.errors.map(err => err.msg).join(". ");
        throw new Error(messages);
      } else if (data.message || data.error) {
        throw new Error(data.message || data.error);
      } else {
        throw new Error("Error al actualizar la información de la clínica");
      }
    }

    showToast("Información actualizada exitosamente", "success");

    // Update Header Name as well
    document.getElementById("clinicName").textContent = `Clínica: ${name}`;

  } catch (err) {
    console.error(err);
    showToast(err.message || "Error al actualizar la información", "error");
  } finally {
    saveClinicInfoBtn.disabled = false;
    saveClinicInfoBtn.innerHTML = originalText;
  }
}

// ============================================
// CLINIC TEMPLATE EDITOR
// ============================================

const templateFieldsContainer = document.getElementById("templateFieldsContainer");
const addTemplateFieldBtn = document.getElementById("addTemplateFieldBtn");
const saveTemplateBtn = document.getElementById("saveTemplateBtn");

if (addTemplateFieldBtn) {
  addTemplateFieldBtn.addEventListener("click", () => {
    addTemplateFieldRow();
  });
}

if (saveTemplateBtn) {
  saveTemplateBtn.addEventListener("click", saveClinicTemplate);
}

function renderTemplateEditor(template) {
  if (!templateFieldsContainer) return;
  templateFieldsContainer.innerHTML = ""; // Clear

  if (!template || template.length === 0) return;

  template.forEach(field => {
    addTemplateFieldRow(field);
  });
}

function addTemplateFieldRow(fieldData = {}) {
  const rowId = Date.now();
  const row = document.createElement("div");
  row.className = "template-row flex flex-col md:flex-row gap-4 items-start md:items-center bg-gray-50 p-4 rounded-xl border border-gray-200 animate-fade-in-up";
  row.dataset.id = rowId;

  const labelValue = fieldData.label || "";
  const typeValue = fieldData.type || "text";
  const optionsValue = fieldData.options ? fieldData.options.join(", ") : "";

  row.innerHTML = `
    <div class="flex-1 w-full">
      <label class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Nombre del Campo</label>
      <input type="text" class="field-label w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 outline-none transition" 
        placeholder="Ej. Alergias" value="${labelValue}">
    </div>

    <div class="w-full md:w-48">
      <label class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Tipo</label>
      <select class="field-type w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 outline-none transition"
        onchange="toggleOptionsInput(this)">
        <option value="text" ${typeValue === 'text' ? 'selected' : ''}>Texto</option>
        <option value="number" ${typeValue === 'number' ? 'selected' : ''}>Número</option>
        <option value="date" ${typeValue === 'date' ? 'selected' : ''}>Fecha</option>
        <option value="checkbox" ${typeValue === 'checkbox' ? 'selected' : ''}>Checkbox (Sí/No)</option>
        <option value="select" ${typeValue === 'select' ? 'selected' : ''}>Selección (Menú)</option>
      </select>
    </div>

    <div class="flex-1 w-full field-options-container ${typeValue !== 'select' ? 'hidden' : ''}">
      <label class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 block">Opciones (separadas por coma)</label>
      <input type="text" class="field-options w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 outline-none transition" 
        placeholder="Ej. Opción 1, Opción 2" value="${optionsValue}">
    </div>

    <button onclick="removeTemplateRow(this)" class="mt-4 md:mt-0 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  `;

  templateFieldsContainer.appendChild(row);
}

// Make globally available for onclick
window.removeTemplateRow = function (btn) {
  const row = btn.closest(".template-row");
  row.remove();
}

window.toggleOptionsInput = function (select) {
  const row = select.closest(".template-row");
  const optionsContainer = row.querySelector(".field-options-container");
  if (select.value === 'select') {
    optionsContainer.classList.remove("hidden");
  } else {
    optionsContainer.classList.add("hidden");
  }
}

async function saveClinicTemplate() {
  const clinicId = saveTemplateBtn.dataset.clinicId;
  if (!clinicId) {
    showToast("Error: No se identificó la clínica.", "error");
    return;
  }

  // Scrape Data
  const rows = document.querySelectorAll(".template-row");
  const template = [];
  let isValid = true;

  rows.forEach(row => {
    const label = row.querySelector(".field-label").value.trim();
    const type = row.querySelector(".field-type").value;
    const optionsRaw = row.querySelector(".field-options").value;

    if (!label) {
      isValid = false;
      row.querySelector(".field-label").classList.add("border-red-500");
    } else {
      row.querySelector(".field-label").classList.remove("border-red-500");
    }

    const fieldObj = { label, type };
    if (type === 'select') {
      fieldObj.options = optionsRaw.split(",").map(s => s.trim()).filter(s => s !== "");
    }

    template.push(fieldObj);
  });

  if (!isValid) {
    showToast("Por favor, asigna un nombre a todos los campos.", "error");
    return;
  }

  // UI Loading
  const originalText = saveTemplateBtn.innerHTML;
  saveTemplateBtn.disabled = true;
  saveTemplateBtn.innerHTML = "Guardando...";

  try {
    const token = localStorage.getItem("authToken");
    const res = await fetch(`https://medinet360-api.onrender.com/api/clinic/${clinicId}/custom-fields`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ customFieldTemplate: template })
    });

    if (!res.ok) throw new Error("Error al guardar la plantilla");

    showToast("Plantilla guardada exitosamente", "success");

  } catch (err) {
    console.error(err);
    showToast("Error al guardar la plantilla", "error");
  } finally {
    saveTemplateBtn.disabled = false;
    saveTemplateBtn.innerHTML = originalText;
  }
}

// ==========================================
// SUBSCRIPTION MANAGEMENT
// ==========================================

function loadSubscriptionData(clinic) {
  const currentPlanEl = document.getElementById('currentPlan');
  const subscriptionStatusEl = document.getElementById('subscriptionStatus');
  const subscriptionEndDateEl = document.getElementById('subscriptionEndDate');
  const planFeaturesEl = document.getElementById('planFeatures');
  const gracePeriodAlertEl = document.getElementById('gracePeriodAlert');
  const gracePeriodEndDateEl = document.getElementById('gracePeriodEndDate');

  if (!currentPlanEl) return; // Tab not loaded yet

  // Map plan names
  const planNames = {
    'free': 'Free',
    'clinic_pro': 'Clinic Pro',
    'clinic_plus': 'Clinic Plus'
  };

  const plan = clinic.plan || 'free';
  const status = clinic.subscriptionStatus || 'active';
  const endDate = clinic.subscriptionEndDate ? new Date(clinic.subscriptionEndDate) : null;
  const now = new Date();

  // Check if in grace period (canceled but still active)
  const isInGracePeriod = status === 'canceled' && endDate && endDate > now;

  // Update plan name
  currentPlanEl.textContent = planNames[plan] || 'Free';

  // Show/Hide Grace Period Alert
  if (isInGracePeriod && gracePeriodAlertEl && gracePeriodEndDateEl) {
    gracePeriodAlertEl.classList.remove('hidden');
    gracePeriodEndDateEl.textContent = endDate.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } else if (gracePeriodAlertEl) {
    gracePeriodAlertEl.classList.add('hidden');
  }

  // Update status badge
  const statusConfig = {
    'active': { text: 'Activo', class: 'bg-green-100 text-green-700' },
    'trialing': { text: 'Prueba', class: 'bg-blue-100 text-blue-700' },
    'past_due': { text: 'Pago Vencido', class: 'bg-red-100 text-red-700' },
    'canceled': {
      text: isInGracePeriod ? 'Cancelado - Activo' : 'Cancelado',
      class: isInGracePeriod ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'
    },
    'paused': { text: 'Pausado', class: 'bg-yellow-100 text-yellow-700' }
  };

  const statusInfo = statusConfig[status] || statusConfig['active'];
  subscriptionStatusEl.textContent = statusInfo.text;
  subscriptionStatusEl.className = `px-3 py-1 rounded-full text-xs font-semibold uppercase ${statusInfo.class}`;

  // Update end date if exists
  if (endDate) {
    if (isInGracePeriod) {
      // Calculate days remaining
      const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
      subscriptionEndDateEl.textContent = `Expira en ${daysRemaining} ${daysRemaining === 1 ? 'día' : 'días'} (${endDate.toLocaleDateString('es-ES')})`;
      subscriptionEndDateEl.className = 'text-sm font-semibold text-orange-600';
    } else {
      subscriptionEndDateEl.textContent = `Vence: ${endDate.toLocaleDateString('es-ES')}`;
      subscriptionEndDateEl.className = 'text-sm text-gray-600';
    }
  } else {
    subscriptionEndDateEl.textContent = '';
  }

  // Update features based on plan
  const features = {
    'free': [
      'Hasta 5 pacientes',
      'Gestión de citas'
    ],
    'clinic_pro': [
      'Pacientes ilimitados',
      'Gestión de citas',
      'Hasta 2 asistentes'
    ],
    'clinic_plus': [
      'Pacientes ilimitados',
      'Gestión de citas',
      'Asistentes ilimitados',
      'Analíticas avanzadas'
    ]
  };

  const planFeatures = features[plan] || features['free'];

  planFeaturesEl.innerHTML = `
    <h5 class="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Características de tu plan</h5>
    <ul class="space-y-2 text-gray-700">
      ${planFeatures.map(feature => `
        <li class="flex items-center gap-2">
          <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span>${feature}</span>
        </li>
      `).join('')}
    </ul>
  `;
}


async function handleManageSubscription() {
  const btn = document.getElementById('manageSubscriptionBtn');
  const originalHTML = btn.innerHTML;

  try {
    btn.disabled = true;
    btn.innerHTML = `
      <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>Cargando...</span>
    `;

    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('No estás autenticado');
    }

    // Get user profile
    const profileRes = await fetch('https://medinet360-api.onrender.com/api/auth/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!profileRes.ok) {
      throw new Error('Error al obtener perfil de usuario');
    }

    const user = await profileRes.json();

    // Get clinic data
    const clinicRes = await fetch(`https://medinet360-api.onrender.com/api/clinic/${user.clinicId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!clinicRes.ok) {
      throw new Error('Error al obtener datos de la clínica');
    }

    const clinic = await clinicRes.json();
    const plan = clinic.plan || 'free';

    // Check if clinic has Paddle subscription or is on Free plan
    if (!clinic.paddleCustomerId || plan === 'free') {
      btn.disabled = false;
      btn.innerHTML = originalHTML;

      const shouldGoToPricing = confirm(
        'No tienes una suscripción activa de Paddle.\n\n' +
        '¿Quieres ir a la página de precios para suscribirte?'
      );

      if (shouldGoToPricing) {
        window.location.href = '../pricing.html';
      }
      return;
    }
    const response = await fetch('https://medinet360-api.onrender.com/api/paddle/create-portal-session', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Error al crear sesión del portal');
    }

    const data = await response.json();

    if (data.url) {
      // Redirect to Paddle portal
      window.open(data.url, '_blank');
    } else {
      throw new Error('No se recibió URL del portal');
    }

  } catch (error) {
    console.error('Error managing subscription:', error);
    showToast('Error al abrir el portal de suscripción', 'error');
    btn.disabled = false;
    btn.innerHTML = originalHTML;
  }
}

