export function flagEmoji(code) {
  if (!code || code.length !== 2) return '🌐';
  const A = 0x1f1e6;
  const upper = code.toUpperCase();
  return (
    String.fromCodePoint(A + (upper.charCodeAt(0) - 65)) +
    String.fromCodePoint(A + (upper.charCodeAt(1) - 65))
  );
}
