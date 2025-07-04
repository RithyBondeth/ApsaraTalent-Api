export function extractSalaryRange(salaryStr?: string | null): [number, number] {
    if (!salaryStr) return [0, 0];
  
    // 1️⃣  Grab every group of digits+commas/points → ['300', '500'] or ['7,000', '9,500']
    const nums = (salaryStr.match(/\d[\d.,]*/g) ?? []).map(raw =>
      parseInt(raw.replace(/[,.]/g, ''), 10) // remove separators, parse to int
    );
  
    if (!nums.length) return [0, 0];
  
    // 2️⃣  If only one number found, decide whether it’s a min or a max phrase
    if (nums.length === 1) {
      const n = nums[0];
      if (/^\s*(up\s*to|≤|max)/i.test(salaryStr)) return [0, n];       // “up to 800$”
      if (/[+]|(≥|from|min)/i.test(salaryStr)) return [n, Infinity]; // “500$+” or “from 500$”
      // default: treat as exact salary
      return [n, n];
    }
  
    // 3️⃣  Two or more numbers – take the first two as min/max
    const [min, max] = nums;
    return [min, max];
  }