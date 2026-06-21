export const getFiscalYearMonths = (fy) => {
  const prevYear = fy - 1;
  return [
    `10-${prevYear}`, `11-${prevYear}`, `12-${prevYear}`,
    `01-${fy}`, `02-${fy}`, `03-${fy}`,
    `04-${fy}`, `05-${fy}`, `06-${fy}`,
    `07-${fy}`, `08-${fy}`, `09-${fy}`
  ];
};

export const getFiscalYearMonthDetails = (fy) => {
  const prevYearThai = fy - 1;
  const currentYearThai = fy;
  const prevYearGregorian = fy - 1 - 543;
  const currentYearGregorian = fy - 543;

  return [
    { label: `ต.ค. ${String(prevYearThai).slice(-2)}`, value: `10-${prevYearThai}`, date: new Date(prevYearGregorian, 9, 1) },
    { label: `พ.ย. ${String(prevYearThai).slice(-2)}`, value: `11-${prevYearThai}`, date: new Date(prevYearGregorian, 10, 1) },
    { label: `ธ.ค. ${String(prevYearThai).slice(-2)}`, value: `12-${prevYearThai}`, date: new Date(prevYearGregorian, 11, 1) },
    { label: `ม.ค. ${String(currentYearThai).slice(-2)}`, value: `01-${currentYearThai}`, date: new Date(currentYearGregorian, 0, 1) },
    { label: `ก.พ. ${String(currentYearThai).slice(-2)}`, value: `02-${currentYearThai}`, date: new Date(currentYearGregorian, 1, 1) },
    { label: `มี.ค. ${String(currentYearThai).slice(-2)}`, value: `03-${currentYearThai}`, date: new Date(currentYearGregorian, 2, 1) },
    { label: `เม.ย. ${String(currentYearThai).slice(-2)}`, value: `04-${currentYearThai}`, date: new Date(currentYearGregorian, 3, 1) },
    { label: `พ.ค. ${String(currentYearThai).slice(-2)}`, value: `05-${currentYearThai}`, date: new Date(currentYearGregorian, 4, 1) },
    { label: `มิ.ย. ${String(currentYearThai).slice(-2)}`, value: `06-${currentYearThai}`, date: new Date(currentYearGregorian, 5, 1) },
    { label: `ก.ค. ${String(currentYearThai).slice(-2)}`, value: `07-${currentYearThai}`, date: new Date(currentYearGregorian, 6, 1) },
    { label: `ส.ค. ${String(currentYearThai).slice(-2)}`, value: `08-${currentYearThai}`, date: new Date(currentYearGregorian, 7, 1) },
    { label: `ก.ย. ${String(currentYearThai).slice(-2)}`, value: `09-${currentYearThai}`, date: new Date(currentYearGregorian, 8, 1) },
  ];
};

export const getCurrentFiscalYear = () => {
  const today = new Date();
  const year = today.getFullYear() + 543;
  const month = today.getMonth() + 1; // 1-12
  // Fiscal year starts in October (month 10)
  if (month >= 10) return year + 1;
  return year;
};

// Available fiscal years to select
export const getAvailableFiscalYears = () => {
  return [2573, 2572, 2571, 2570, 2569];
};
