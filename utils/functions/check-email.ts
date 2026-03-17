export const checkEmail = (text: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
