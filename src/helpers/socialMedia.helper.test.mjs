import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const helperSource = await readFile(new URL("./socialMedia.helper.js", import.meta.url), "utf8");
const helperModuleUrl = `data:text/javascript;base64,${Buffer.from(helperSource).toString("base64")}`;
const {
  displaySocialMediaHandle,
  normalizeSocialMediaHandle,
  normalizeSocialMediaObject,
  socialMediaProfileUrl,
} = await import(helperModuleUrl);

assert.equal(normalizeSocialMediaHandle("  @jazzyfriedrice  ", "instagram"), "jazzyfriedrice");
assert.equal(displaySocialMediaHandle("jazzyfriedrice", "threads"), "@jazzyfriedrice");
assert.throws(
  () => normalizeSocialMediaHandle("https://tiktok.com/@jazzyfriedrice", "tiktok"),
  /without a link/,
);
assert.deepEqual(
  normalizeSocialMediaObject([
    { mediaType: "FACEBOOK", mediaUrl: "https://facebook.com/jazzyfriedrice" },
    { mediaType: "TWITTER", mediaUrl: "@jazzyfriedrice" },
  ]),
  { instagram: "", facebook: "jazzyfriedrice", x: "jazzyfriedrice", threads: "", tiktok: "" },
);
assert.equal(
  socialMediaProfileUrl("instagram", "@jazzyfriedrice"),
  "https://www.instagram.com/jazzyfriedrice",
);

console.log("social media helper tests passed");
