// =====================================================================
// iSchool Mentor Hub — Configuration
// =====================================================================
// Put your Cloudflare Worker URL or Google Apps Script Web App URL here:
export const BACKEND_URL = "";

// Put your Google OAuth Client ID here (from Google Cloud Console):
export const GOOGLE_CLIENT_ID = "";

// Helper to check if live Google Sheets backend is configured
export const isCloudConfigured = () => Boolean(BACKEND_URL && BACKEND_URL.startsWith("http"));
