import React from "react";
import EarningsScreen from "./earningsScreen";

const EmployeesScreen = (props) => (
  <EarningsScreen {...props} screenMode="employees" />
);

export default EmployeesScreen;
