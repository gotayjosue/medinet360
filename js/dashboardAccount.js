document.addEventListener('DOMContentLoaded', () => {
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
  const logoutBtns = document.querySelectorAll('.logout-btn');
  logoutBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      // In a real app, clear tokens/session here
      // For now, redirect to sign in
      window.location.href = '../signIn.html';
    });
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
