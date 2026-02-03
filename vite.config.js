import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        faq: resolve(__dirname, "faq.html"),
        pricing: resolve(__dirname, "pricing.html"),
        signIn: resolve(__dirname, "signIn.html"),
        signUp: resolve(__dirname, "signUp.html"),
        dashboardHome: resolve(__dirname, "dashboard/home.html"),
        dashboardPatients: resolve(__dirname, "dashboard/patients.html"),
        dashboardAppointments: resolve(__dirname, "dashboard/appointments.html"),
        dashboardAccount: resolve(__dirname, "dashboard/account.html"),
        dashboardReports: resolve(__dirname, "dashboard/reports.html"),
        dashboardInventory: resolve(__dirname, "dashboard/inventory.html"),
        patientsDetails: resolve(__dirname, "dashboard/patientDetails.html"),
        dashboardAppointmentsCalendar: resolve(__dirname, "dashboard/appointmentsCalendar.html"),
        forgotPassword: resolve(__dirname, "forgotPassword.html"),
        resetPassword: resolve(__dirname, "resetPassword.html"),
        verifyEmail: resolve(__dirname, "verify-email.html"),
        terms: resolve(__dirname, "terms.html"),
        privacyPolicy: resolve(__dirname, "privacy-policy.html"),
        refundPolicy: resolve(__dirname, "refund-policy.html"),
        paymentHelp: resolve(__dirname, "payment-help.html")
      },
    },
  },
});
