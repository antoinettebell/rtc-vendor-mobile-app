const reactNativeGlobals = {
  __DEV__: "readonly",
  alert: "readonly",
  clearInterval: "readonly",
  clearTimeout: "readonly",
  console: "readonly",
  fetch: "readonly",
  FormData: "readonly",
  global: "readonly",
  navigator: "readonly",
  process: "readonly",
  require: "readonly",
  setInterval: "readonly",
  setTimeout: "readonly",
};

module.exports = [
  {
    ignores: [
      "android/**",
      "ios/**",
      "node_modules/**",
      "coverage/**",
      "patches/**",
    ],
  },
  {
    files: ["**/*.js", "**/*.jsx"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: reactNativeGlobals,
    },
    rules: {
      "no-dupe-keys": "error",
      "no-redeclare": "error",
      "no-self-assign": "error",
      "no-unreachable": "error",
    },
  },
];
