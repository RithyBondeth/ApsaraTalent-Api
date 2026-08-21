/**
 * Colour maths used to derive a readable palette from a caller-supplied accent:
 * channel mixing, relative luminance and WCAG contrast ratios.
 */
export function hexChannels(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

export function mixHex(
  hex: string,
  target: [number, number, number],
  weight: number,
): string {
  const source = hexChannels(hex);
  return `#${source
    .map((channel, index) =>
      Math.max(
        0,
        Math.min(
          255,
          Math.round(channel * (1 - weight) + target[index] * weight),
        ),
      )
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`.toUpperCase();
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexChannels(hex).map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [light, dark] = la >= lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}

export function deriveCustomAccentColors(customAccent: string): {
  accent: string;
  accentSoft: string;
  header: string;
  headerText: string;
} {
  const header = mixHex(customAccent, [0, 0, 0], 0.35);
  return {
    accent: customAccent.toUpperCase(),
    accentSoft: mixHex(customAccent, [255, 255, 255], 0.85),
    header,
    headerText:
      contrastRatio(header, '#FFFFFF') >= contrastRatio(header, '#1E293B')
        ? '#FFFFFF'
        : '#1E293B',
  };
}
