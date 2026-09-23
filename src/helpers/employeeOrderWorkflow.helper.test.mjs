import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("./employeeOrderWorkflow.helper.js", import.meta.url),
  "utf8",
);
const constantsSource = await readFile(
  new URL("../utils/constants.js", import.meta.url),
  "utf8",
);
const orderStatuses = Object.fromEntries(
  [...constantsSource.matchAll(/(placed|accepted|preparing|ready_for_pickup|driver_picked_up|completed):\s*"([A-Z_]+)"/g)].map(
    ([, key, value]) => [key, value],
  ),
);
const runnableSource = source
  .replace('import { orderStatusStrings } from "../utils/constants";\n', "")
  .replaceAll("export const ", "const ")
  .concat(
    "\nreturn { LIVE_ORDER_REFRESH_INTERVAL_MS, getEmployeeNextOrderStatus, getEmployeeOrderActionLabel, canEmployeeRejectOrder, getOrderFulfillmentLabel };",
  );
const helper = Function("orderStatusStrings", runnableSource)(orderStatuses);

const delivery = {
  orderSource: "CUSTOMER_APP",
  fulfillmentType: "DELIVERY",
  orderStatus: orderStatuses.placed,
};
const pickup = { ...delivery, fulfillmentType: "PICKUP" };
const walkUp = {
  orderSource: "WALK_UP_EMPLOYEE",
  orderStatus: orderStatuses.placed,
};

assert.equal(helper.LIVE_ORDER_REFRESH_INTERVAL_MS, 5000);
assert.equal(helper.getEmployeeNextOrderStatus(delivery), orderStatuses.accepted);
assert.equal(helper.getEmployeeOrderActionLabel(delivery), "Accept");
assert.equal(helper.canEmployeeRejectOrder(delivery), true);
assert.equal(helper.getOrderFulfillmentLabel(delivery), "Delivery");
assert.equal(helper.getOrderFulfillmentLabel(pickup), "Pickup");
assert.equal(helper.getEmployeeNextOrderStatus(walkUp), orderStatuses.preparing);
assert.equal(helper.canEmployeeRejectOrder(walkUp), false);

for (const screenPath of [
  "../screens/employeeSessionScreen.js",
  "../screens/employeeOrderManagementScreen.js",
  "../screens/employeePosBoardScreen.js",
  "../screens/homeScreen.js",
  "../screens/orderScreen.js",
  "../screens/orderDetailsScreen.js",
]) {
  const screen = await readFile(new URL(screenPath, import.meta.url), "utf8");
  assert.match(
    screen,
    /LIVE_ORDER_REFRESH_INTERVAL_MS/,
    `${screenPath} must participate in shared order-status refresh`,
  );
}

for (const employeeScreenPath of [
  "../screens/employeeSessionScreen.js",
  "../screens/employeeOrderManagementScreen.js",
  "../screens/employeePosBoardScreen.js",
]) {
  const screen = await readFile(
    new URL(employeeScreenPath, import.meta.url),
    "utf8",
  );
  assert.match(screen, /canEmployeeRejectOrder/);
  assert.match(screen, /getEmployeeNextOrderStatus/);
  assert.match(screen, /getOrderFulfillmentLabel/);
}

console.log("employee order workflow tests passed");
