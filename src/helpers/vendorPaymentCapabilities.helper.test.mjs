import assert from "node:assert/strict";
import { getWalkUpPosAccess, getVendorPaymentCapabilities } from "./vendorPaymentCapabilities.helper.js";

const basic = { capabilities: { employeeWalkUpPos: false, walkUpPosPaymentMethods: [] } };
const growth = { capabilities: { employeeWalkUpPos: true, walkUpPosPaymentMethods: ["CASH"] } };
assert.deepEqual(getWalkUpPosAccess({ foodTruck: { plan: basic } }).allowed, false);
assert.equal(getWalkUpPosAccess({ foodTruck: { plan: growth } }).allowed, true);
assert.equal(getVendorPaymentCapabilities({}, { plan: growth }).cash, true);
assert.equal(getWalkUpPosAccess({ userType: "EMPLOYEE", employeeCapabilities: { employeeWalkUpPos: false } }).allowed, false);
assert.equal(getWalkUpPosAccess({ userType: "EMPLOYEE", employeeCapabilities: { employeeWalkUpPos: true, walkUpPosPaymentMethods: ["CASH"] } }).allowed, true);
assert.equal(getWalkUpPosAccess({ foodTruck: { plan: growth } }).allowed, true);
assert.equal(getWalkUpPosAccess({ foodTruck: { plan: basic } }).allowed, false);
console.log("vendor walk-up capability tests passed");
