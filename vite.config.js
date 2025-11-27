import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  root: "src/",
  build: {
    outDir: "../dist",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "src/index.html"),
        faq: resolve(__dirname, "src/faq.html"),
        pricing: resolve(__dirname, "src/pricing.html"),
        signIn: resolve(__dirname, "src/signIn.html"),
        signUp: resolve(__dirname, "src/signUp.html"),
        dashboardHome: resolve(__dirname, "src/dashboard/home.html"),
        dashboardPatients: resolve(__dirname, "src/dashboard/patients.html"),
        dashboardAppointments: resolve(__dirname, "src/dashboard/appointments.html"),
        dashboardAccount: resolve(__dirname, "src/dashboard/account.html"),
        dashboardReports: resolve(__dirname, "src/dashboard/reports.html"),
        patientsDetails: resolve(__dirname, "src/dashboard/patientDetails.html"),
        dashboardAppointmentsCalendar: resolve(__dirname, "src/dashboard/appointmentsCalendar.html"),
      },
    },
  },
});