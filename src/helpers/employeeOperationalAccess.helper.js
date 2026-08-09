export const ASSIGNED_LOCATION_CLOSED_MESSAGE =
  "Your assigned location is closed. Open this location before taking orders.";

export const getEmployeeOperationalBlock = ({
  isShiftActive,
  isOnBreak,
  isAssignedLocationOpen,
  hasEndedCurrentOperationalDayShift = false,
}) => {
  if (isOnBreak) {
    return {
      title: "Shift paused",
      message:
        "Your shift is paused for break. Please resume your shift to log back in.",
    };
  }
  if (!isShiftActive) {
    return {
      title: hasEndedCurrentOperationalDayShift
        ? "Shift ended"
        : "Shift not started",
      message: hasEndedCurrentOperationalDayShift
        ? "Your shift has ended. Please see your manager to be clocked back in."
        : "You are not currently clocked in. Please start your shift to continue.",
    };
  }
  if (!isAssignedLocationOpen) {
    return {
      title: "Assigned location closed",
      message: ASSIGNED_LOCATION_CLOSED_MESSAGE,
    };
  }
  return null;
};

export const canEmployeeOperate = (state) =>
  getEmployeeOperationalBlock(state) === null;
