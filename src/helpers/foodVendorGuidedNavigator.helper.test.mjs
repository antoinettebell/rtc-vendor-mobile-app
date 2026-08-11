import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [appSource, promptSource, managementSource] = await Promise.all([
  readFile(new URL("../../App.js", import.meta.url), "utf8"),
  readFile(new URL("../screens/authMenuSetupPromptScreen.js", import.meta.url), "utf8"),
  readFile(new URL("../screens/profileEmployeeManagementScreen.js", import.meta.url), "utf8"),
]);

const finalNavigator = appSource.slice(
  appSource.indexOf("const FinalSignupStepsNavigator"),
  appSource.indexOf("// bottom tab navigator"),
);

assert.match(promptSource, /navigate\("profileEmployeeManagementScreen", \{ onboardingFlow: true \}\)/);
assert.match(finalNavigator, /name="profileEmployeeManagementScreen"/);
assert.match(managementSource, /route\?\.params\?\.onboardingFlow === true/);
assert.match(managementSource, /Next: Menu Setup/);
assert.match(managementSource, />Skip</);

console.log("Food Vendor guided navigator wiring tests passed.");
