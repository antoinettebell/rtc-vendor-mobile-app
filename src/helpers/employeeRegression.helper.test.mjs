import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const loadHelper = async (relativePath) => {
  const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
  return import(
    `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
  );
};

const {
  ASSIGNED_LOCATION_CLOSED_MESSAGE,
  canEmployeeOperate,
  getEmployeeOperationalBlock,
} = await loadHelper("./employeeOperationalAccess.helper.js");
const { restoreSavedEmployeeLogin } = await loadHelper(
  "./savedEmployeeLogin.helper.js",
);
const {
  beginScheduleEdit,
  cancelScheduleEdit,
  isScheduleControlEnabled,
} = await loadHelper("./employeeScheduleEdit.helper.js");
const sessionScreenSource = await readFile(
  new URL("../screens/employeeSessionScreen.js", import.meta.url),
  "utf8",
);
const profileScreenSource = await readFile(
  new URL("../screens/userProfileScreen.js", import.meta.url),
  "utf8",
);
const signInScreenSource = await readFile(
  new URL("../screens/signinScreen.js", import.meta.url),
  "utf8",
);
const employeeManagementSource = await readFile(
  new URL("../screens/profileEmployeeManagementScreen.js", import.meta.url),
  "utf8",
);

assert.equal(
  canEmployeeOperate({
    isShiftActive: true,
    isOnBreak: false,
    isAssignedLocationOpen: true,
  }),
  true,
);
assert.equal(
  getEmployeeOperationalBlock({
    isShiftActive: true,
    isOnBreak: false,
    isAssignedLocationOpen: false,
  }).message,
  ASSIGNED_LOCATION_CLOSED_MESSAGE,
);
assert.equal(
  canEmployeeOperate({
    isShiftActive: false,
    isOnBreak: false,
    isAssignedLocationOpen: true,
  }),
  false,
);
assert.equal(
  canEmployeeOperate({
    isShiftActive: true,
    isOnBreak: true,
    isAssignedLocationOpen: true,
  }),
  false,
);

assert.deepEqual(
  restoreSavedEmployeeLogin({
    savedUser: { employeeLoginId: "Cook1", password: "1234" },
    savedUsers: [
      {
        loginMode: "EMPLOYEE",
        employeeLoginId: "cook1",
        vendorAccessCode: "ABC123",
        pin: "1234",
      },
    ],
  }),
  {
    vendorAccessCode: "ABC123",
    employeeLoginId: "cook1",
    pin: "1234",
  },
);

const duplicateLoginRecords = [
  {
    loginMode: "EMPLOYEE",
    vendorAccessCode: "AAA111",
    employeeLoginId: "cook",
    pin: "1111",
  },
  {
    loginMode: "EMPLOYEE",
    vendorAccessCode: "BBB222",
    employeeLoginId: "cook",
    pin: "2222",
  },
];
assert.deepEqual(
  restoreSavedEmployeeLogin({
    savedUser: { employeeLoginId: "cook", pin: "9999" },
    savedUsers: duplicateLoginRecords,
  }),
  { vendorAccessCode: "", employeeLoginId: "cook", pin: "9999" },
  "an ambiguous Apple username must not silently select a vendor",
);
assert.deepEqual(
  restoreSavedEmployeeLogin({
    savedUser: {
      vendorAccessCode: "BBB222",
      employeeLoginId: "cook",
    },
    savedUsers: duplicateLoginRecords,
  }),
  { vendorAccessCode: "BBB222", employeeLoginId: "cook", pin: "2222" },
  "vendor code plus employee login ID selects the correct saved employee",
);

assert.deepEqual(
  restoreSavedEmployeeLogin({
    savedUser: {
      loginMode: "EMPLOYEE",
      vendorAccessCode: "XYZ789",
      employeeLoginId: "owner-safe",
      pin: "9876",
    },
  }),
  {
    vendorAccessCode: "XYZ789",
    employeeLoginId: "owner-safe",
    pin: "9876",
  },
);

assert.equal(
  sessionScreenSource.includes("My Employee Schedule"),
  false,
  "the employee dashboard must not render the schedule panel",
);
assert.match(
  profileScreenSource,
  /employeeDashboard\?\.employee_schedule/,
  "the Profile screen must retain the employee schedule",
);
assert.match(signInScreenSource, /loginMode === "OWNER"/);
assert.match(signInScreenSource, /handleSignIn\(email, password\)/);

const savedSchedule = [
  {
    truck_unit_id: "truck-1",
    location_id: "location-1",
    days: [{ day: "sun", enabled: true, clock_in: "06:00", clock_out: "14:00" }],
  },
];
assert.equal(
  isScheduleControlEnabled({ editingEmployeeId: null, employeeId: "employee-1" }),
  false,
  "schedule controls default to read-only",
);
assert.equal(
  isScheduleControlEnabled({
    editingEmployeeId: "employee-1",
    employeeId: "employee-1",
  }),
  true,
  "the pencil-selected employee enters edit mode",
);
const editDraft = beginScheduleEdit(savedSchedule);
editDraft[0].days[0].clock_out = "12:00";
assert.equal(savedSchedule[0].days[0].clock_out, "14:00");
assert.deepEqual(
  cancelScheduleEdit(savedSchedule),
  savedSchedule,
  "Cancel restores the saved schedule",
);
assert.match(employeeManagementSource, /icon="pencil"/);
assert.match(employeeManagementSource, />Save<\/Text>/);
assert.match(employeeManagementSource, />Cancel<\/Text>/);
assert.match(
  employeeManagementSource,
  /schedule_assignments: assignments, is_working: false/,
  "Save preserves active-shift termination enforcement",
);

console.log("employee regression helper tests passed");
