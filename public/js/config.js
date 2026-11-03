// =====================================================================
// iSchool Mentor Hub — Configuration
// =====================================================================
// Put your Cloudflare Worker URL or Google Apps Script Web App URL here:
export const BACKEND_URL = "https://script.google.com/macros/s/AKfycbwo2mj3uga-jjRprQjaDe87ahHo8dBk-jBZPoHv3vyEwfrilyBDeWuRZwiK1Iv5i3a-_Q/exec";

// Put your Google OAuth Client ID here (from Google Cloud Console):
export const GOOGLE_CLIENT_ID = "";

// Helper to check if live Google Sheets backend is configured
export const isCloudConfigured = () => Boolean(BACKEND_URL && BACKEND_URL.startsWith("http"));
