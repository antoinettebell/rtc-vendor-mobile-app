const isExternalHostname = (hostname) => {
  const host = String(hostname || "").replace(/^\[|\]$/g, "").toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return false;
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) || host.includes(":")) return false;
  return host.includes(".") && !host.startsWith(".") && !host.endsWith(".");
};

export const normalizeExternalWebLink = (value) => {
  const raw = String(value || "").trim();
  if (!raw || raw.length > 2048 || /[\u0000-\u001F\u007F\s]/.test(raw)) return null;

  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw)
    ? raw
    : `https://${raw.replace(/^\/+/, "")}`;

  try {
    const parsed = new URL(candidate);
    if (!["https:", "http:"].includes(parsed.protocol)) return null;
    if (parsed.username || parsed.password || !isExternalHostname(parsed.hostname)) return null;
    return candidate;
  } catch (_) {
    return null;
  }
};
