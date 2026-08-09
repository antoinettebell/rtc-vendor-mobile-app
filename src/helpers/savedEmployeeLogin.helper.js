const normalize = (value) => String(value || "").trim();

export const restoreSavedEmployeeLogin = ({ savedUser, savedUsers = [] }) => {
  const directLoginId = normalize(savedUser?.employeeLoginId);
  const identityLoginId = normalize(savedUser?.emailid).startsWith("employee:")
    ? normalize(savedUser.emailid).split(":").slice(2).join(":")
    : "";
  const loginId = directLoginId || identityLoginId;
  const directVendorCode = normalize(savedUser?.vendorAccessCode).toUpperCase();
  const loginMatches = savedUsers.filter(
    (candidate) =>
      candidate?.loginMode === "EMPLOYEE" &&
      normalize(candidate?.employeeLoginId).toLowerCase() ===
        loginId.toLowerCase(),
  );
  const matchingRecord = directVendorCode
    ? loginMatches.find(
        (candidate) =>
          normalize(candidate?.vendorAccessCode).toUpperCase() ===
          directVendorCode,
      )
    : loginMatches.length === 1
      ? loginMatches[0]
      : null;
  const source = { ...matchingRecord, ...savedUser };

  return {
    vendorAccessCode: directVendorCode || normalize(source.vendorAccessCode),
    employeeLoginId: normalize(source.employeeLoginId || loginId).toLowerCase(),
    pin: normalize(source.pin || source.password),
  };
};
