export function extractSalaryRange(
  salaryStr?: string | null,
): [number, number] {
  if (!salaryStr) return [0, 0];

  const nums = (salaryStr.match(/\d[\d.,]*/g) ?? []).map((raw) =>
    parseInt(raw.replace(/[,.]/g, ''), 10),
  );

  if (!nums.length) return [0, 0];

  if (nums.length === 1) {
    const n = nums[0];

    if (/^\s*(up\s*to|<=|max)/i.test(salaryStr)) return [0, n];
    if (/[+]|(>=|from|min)/i.test(salaryStr)) return [n, Infinity];

    return [n, n];
  }

  const [min, max] = nums;
  return [min, max];
}
