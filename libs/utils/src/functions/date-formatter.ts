export function formatDateToDDMMYYYY(date: Date | string): string {
  const parsedDate = date instanceof Date ? date : new Date(date);
  const day = String(parsedDate.getDate()).padStart(2, '0');
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
  const year = parsedDate.getFullYear();
  return `${day}/${month}/${year}`;
}
