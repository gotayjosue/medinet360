import { checkAuth, requireAuth, handleLogoutAccount, showToast } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  requireAuth();
  loadUserData();
  loadClinicId();
  const logo = document.querySelector('.logo');

  logo.style.cursor = 'pointer'
  logo.addEventListener('click', () =>{
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
    const res = await fetch("https://medinet360api.vercel.app/api/auth/profile", {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!res.ok) {
      console.log("Error loading user");
      return;
    }

    const user = await res.json();

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
    const res = await fetch("https://medinet360api.vercel.app/api/auth/profile", {
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




