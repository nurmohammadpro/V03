export const COOKIE_NAME = "v03-auth-token";
export const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL || "/api/auth/manus";
  const appId = import.meta.env.VITE_APP_ID || "v03";
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  // Build URL with base to handle both absolute and relative paths
  const base = oauthPortalUrl.startsWith("http")
    ? oauthPortalUrl
    : window.location.origin;
  const path = oauthPortalUrl.startsWith("http")
    ? ""
    : oauthPortalUrl;

  const url = new URL(`${path}/app-auth`, base);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
