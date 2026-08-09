const cloneSchedule = (schedule = []) =>
  schedule.map((assignment) => ({
    ...assignment,
    days: (assignment.days || []).map((day) => ({ ...day })),
  }));

export const beginScheduleEdit = (savedSchedule) =>
  cloneSchedule(savedSchedule);

export const cancelScheduleEdit = (savedSchedule) =>
  cloneSchedule(savedSchedule);

export const isScheduleControlEnabled = ({ editingEmployeeId, employeeId }) =>
  editingEmployeeId === employeeId;
