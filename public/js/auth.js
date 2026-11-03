import { GOOGLE_CLIENT_ID, isCloudConfigured } from "./config.js";
import { getAuthToken, setAuthToken, loadBootstrap, loadDay } from "./api.js";
import { ui, td, $ } from "./state.js";

let gsiInitialized = false;

export function initGoogleSignIn(onSuccess, onNotAuthorized, onError) {
  if (!isCloudConfigured() || !GOOGLE_CLIENT_ID) return;
  if (typeof window.google === "undefined" || !window.google.accounts) {
    setTimeout(() => initGoogleSignIn(onSuccess, onNotAuthorized, onError), 300);
    return;
  }
  if (gsiInitialized) return;
  gsiInitialized = true;

  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: async response => {
      if (!response || !response.credential) return;
      setAuthToken(response.credential);
      await resumeCloudSession(onSuccess, onNotAuthorized, onError);
    }
  });

  const btnContainer = $("google-btn-container");
  if (btnContainer) {
    window.google.accounts.id.renderButton(btnContainer, {
      theme: "outline",
      size: "large",
      width: 320,
      text: "signin_with"
    });
  }
}

export async function resumeCloudSession(onSuccess, onNotAuthorized, onError) {
  const token = getAuthToken();
  if (!token || !isCloudConfigured()) return false;
  try {
    const meRow = await loadBootstrap();
    await loadDay(ui.date || td());
    onSuccess({
      id: Number(meRow.id),
      n: meRow.name,
      email: meRow.email,
      u: meRow.email,
      role: meRow.role,
      on: 1
    });
    return true;
  } catch (err) {
    if (err.code === "NOT_AUTHORIZED") {
      onNotAuthorized(err.email || "");
    } else {
      setAuthToken("");
      if (onError) onError(err.message || "Sign in failed.");
    }
    return false;
  }
}

export function signOutCloud() {
  setAuthToken("");
  if (window.google && window.google.accounts && window.google.accounts.id) {
    window.google.accounts.id.disableAutoSelect();
  }
}

