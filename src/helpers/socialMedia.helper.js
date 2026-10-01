export const SOCIAL_MEDIA_PLATFORMS = Object.freeze([
  Object.freeze({ key: "instagram", label: "Instagram", prefix: "@", maxLength: 30 }),
  Object.freeze({ key: "facebook", label: "Facebook", prefix: "", maxLength: 75 }),
  Object.freeze({ key: "x", label: "X", prefix: "@", maxLength: 15 }),
  Object.freeze({ key: "threads", label: "Threads", prefix: "@", maxLength: 30 }),
  Object.freeze({ key: "tiktok", label: "TikTok", prefix: "@", maxLength: 24 }),
]);

const PLATFORM_MAP = Object.freeze(
  Object.fromEntries(SOCIAL_MEDIA_PLATFORMS.map((platform) => [platform.key, platform])),
);

const LEGACY_TYPE_MAP = Object.freeze({
  INSTAGRAM: "instagram",
  FACEBOOK: "facebook",
  TWITTER: "x",
  X: "x",
  THREADS: "threads",
  TIKTOK: "tiktok",
});

const HANDLE_PATTERNS = Object.freeze({
  instagram: /^[A-Za-z0-9._]{1,30}$/,
  facebook: /^[A-Za-z0-9._-]{1,75}$/,
  x: /^[A-Za-z0-9_]{1,15}$/,
  threads: /^[A-Za-z0-9._]{1,30}$/,
  tiktok: /^[A-Za-z0-9._]{1,24}$/,
});

const emptySocialMedia = () =>
  Object.fromEntries(SOCIAL_MEDIA_PLATFORMS.map(({ key }) => [key, ""]));

const extractCandidate = (value, { allowLegacyUrl = false } = {}) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(?:https?:\/\/|www\.)/i.test(raw)) {
    if (!allowLegacyUrl) return null;
    try {
      const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
      return decodeURIComponent(parsed.pathname)
        .split("/")
        .filter(Boolean)
        .at(-1) || "";
    } catch (_) {
      return "";
    }
  }
  return raw;
};

export const normalizeSocialMediaHandle = (value, platformKey, options = {}) => {
  const key = String(platformKey || "").toLowerCase();
  const candidate = extractCandidate(value, options);
  if (candidate === "") return "";
  const normalized = String(candidate || "").replace(/^@+/, "").trim();
  if (!HANDLE_PATTERNS[key]?.test(normalized)) {
    const platform = PLATFORM_MAP[key];
    throw new Error(`Enter a valid ${platform?.label || "social media"} handle without a link.`);
  }
  return normalized;
};

export const normalizeSocialMediaObject = (value = {}) => {
  const isLegacyArray = Array.isArray(value);
  const source = isLegacyArray ? {} : value || {};
  if (isLegacyArray) {
    value.forEach((entry) => {
      const key = LEGACY_TYPE_MAP[String(entry?.mediaType || "").toUpperCase()];
      if (!key || source[key] !== undefined) return;
      try {
        source[key] = normalizeSocialMediaHandle(entry?.mediaUrl, key, { allowLegacyUrl: true });
      } catch (_) {
        // Malformed legacy URLs are omitted; current handle-object input stays strict.
      }
    });
  }

  return Object.fromEntries(SOCIAL_MEDIA_PLATFORMS.map(({ key }) => [
    key,
    normalizeSocialMediaHandle(source[key], key),
  ]));
};

export const displaySocialMediaHandle = (value, platformKey) => {
  const normalized = normalizeSocialMediaHandle(value, platformKey);
  if (!normalized) return "";
  return `${PLATFORM_MAP[platformKey]?.prefix || ""}${normalized}`;
};

export const socialMediaProfileUrl = (platformKey, value) => {
  const handle = normalizeSocialMediaHandle(value, platformKey);
  if (!handle) return null;
  const encoded = encodeURIComponent(handle);
  const builders = {
    instagram: () => `https://www.instagram.com/${encoded}`,
    facebook: () => `https://www.facebook.com/${encoded}`,
    x: () => `https://x.com/${encoded}`,
    threads: () => `https://www.threads.net/@${encoded}`,
    tiktok: () => `https://www.tiktok.com/@${encoded}`,
  };
  return builders[platformKey]?.() || null;
};

export const blankSocialMedia = emptySocialMedia;
