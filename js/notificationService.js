import { showToast, toMinutes } from './utils.js';

export const NotificationService = {
  intervalId: null,
  appointments: [],
  notifiedAppointments: new Set(), // Track notified appointments to avoid duplicates

  // Initialize the service
  init(appointments = []) {
    this.appointments = appointments;
    this.loadPreference();
    this.startPolling();
    this.renderToggleUI();
  },

  // Update appointments list when it changes
  updateAppointments(newAppointments) {
    this.appointments = newAppointments;
  },

  // Request permission
  async requestPermission() {
    if (!("Notification" in window)) {
      showToast("Este navegador no soporta notificaciones de escritorio", "error");
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }

    return false;
  },

  // Toggle notifications on/off
  async toggleNotifications() {
    const isEnabled = this.isEnabled();

    if (!isEnabled) {
      const granted = await this.requestPermission();
      if (granted) {
        localStorage.setItem('notificationsEnabled', 'true');
        showToast("Notificaciones activadas", "success");
        this.renderToggleUI();

        // Test notification
        new Notification("Medinet360", {
          body: "Las notificaciones están activas. Te avisaremos de tus próximas citas.",
          icon: "/images/favicon-32x32.png"
        });
      } else {
        showToast("Debes permitir las notificaciones en tu navegador", "error");
      }
    } else {
      localStorage.setItem('notificationsEnabled', 'false');
      showToast("Notificaciones desactivadas", "info");
      this.renderToggleUI();
    }
  },

  // Check if enabled
  isEnabled() {
    return localStorage.getItem('notificationsEnabled') === 'true' && Notification.permission === "granted";
  },

  // Load preference (and check permission sync)
  loadPreference() {
    if (Notification.permission !== "granted") {
      localStorage.setItem('notificationsEnabled', 'false');
    }
  },

  // Start the polling interval
  startPolling() {
    if (this.intervalId) clearInterval(this.intervalId);

    // Check every 60 seconds
    this.intervalId = setInterval(() => {
      if (this.isEnabled()) {
        this.checkAppointments();
      }
    }, 60000);

    // Run immediately once
    if (this.isEnabled()) {
      this.checkAppointments();
    }
  },

  // Check for upcoming appointments
  checkAppointments() {
    const d = new Date();
    const now = d;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    // Filter for today's appointments only
    const todayAppointments = this.appointments.filter(apt => apt.date === todayStr && apt.status !== 'canceled' && apt.status !== 'completed');

    todayAppointments.forEach(apt => {
      const aptTime = this.getAppointmentDate(apt);
      const diffMinutes = (aptTime - now) / 1000 / 60;

      // Check for 60m, 30m, 15m windows (with a small buffer of +/- 1 minute)
      if (this.shouldNotify(apt._id, diffMinutes, 60)) {
        this.sendNotification(apt, "1 hora");
      } else if (this.shouldNotify(apt._id, diffMinutes, 30)) {
        this.sendNotification(apt, "30 minutos");
      } else if (this.shouldNotify(apt._id, diffMinutes, 15)) {
        this.sendNotification(apt, "15 minutos");
      }
    });
  },

  // Helper to determine if we should notify
  shouldNotify(id, diffMinutes, targetMinutes) {
    // Allow a 1-minute window (e.g., if target is 60, match 59.0 to 60.0)
    // We use a unique key for each notification type per appointment
    const key = `${id}-${targetMinutes}`;

    if (diffMinutes <= targetMinutes && diffMinutes > targetMinutes - 1.5) {
      if (!this.notifiedAppointments.has(key)) {
        this.notifiedAppointments.add(key);
        return true;
      }
    }
    return false;
  },

  // Construct Date object from appointment data
  getAppointmentDate(apt) {
    const [year, month, day] = apt.date.split('-').map(Number);
    const [hours, minutes] = apt.hour.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes);
  },

  // Trigger the actual notification
  sendNotification(apt, timeText) {
    const patientName = `${apt.patientId?.name || 'Paciente'} ${apt.patientId?.lastName || ''}`;
    const endTime = this.calculateEndTime(apt.hour, apt.duration);

    const title = `Cita en ${timeText}`;
    const options = {
      body: `Paciente: ${patientName}\nHora: ${apt.hour} - ${endTime}\nDuración: ${apt.duration} min`,
      icon: "/images/favicon-32x32.png",
      requireInteraction: true, // Keep it visible until user clicks
      tag: `apt-${apt._id}` // Replace existing notification for same appointment if any
    };

    const notification = new Notification(title, options);

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  },

  calculateEndTime(hour, duration) {
    const [h, m] = hour.split(':').map(Number);
    const totalMin = h * 60 + m + parseInt(duration);
    const endH = Math.floor(totalMin / 60).toString().padStart(2, '0');
    const endM = (totalMin % 60).toString().padStart(2, '0');
    return `${endH}:${endM}`;
  },

  // Render the toggle button in the UI
  renderToggleUI() {
    const container = document.querySelector('.notification-container');
    if (!container) return; // Should be added to HTML first

    const isEnabled = this.isEnabled();

    container.innerHTML = `
      <button id="notificationToggle" class="p-2 rounded-full transition-colors ${isEnabled ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}" title="${isEnabled ? 'Notificaciones activas' : 'Activar notificaciones'}">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="${isEnabled ? 'currentColor' : 'none'}" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      </button>
    `;

    document.getElementById('notificationToggle').addEventListener('click', () => {
      this.toggleNotifications();
    });
  }
};
