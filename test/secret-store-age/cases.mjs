/** Synthetic, public test values; labels are safe to include in test output. */
export const valueCases = [
  ['empty', ''],
  ['whitespace', ' \t\r\n '],
  ['nul', '\0a\0'],
  ['bom', '\uFEFFpreserve'],
  ['unicode', '日本語 café e\u0301 🔐'],
  ['maximum-ascii', 'x'.repeat(64 * 1024)],
  ['maximum-multibyte', '🔐'.repeat(16 * 1024)],
];
