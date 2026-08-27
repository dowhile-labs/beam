// Beam IDs are always exactly 8 mixed-alphanumeric characters (see
// packages/api/src/lib/nanoid.ts). This lets the CLI's single positional
// argument do double duty: `beam "some text"` sends, `beam aB3dE5xZ`
// retrieves.
const ID_PATTERN = /^[0-9A-Za-z]{8}$/;

export function looksLikeBeamId(value: string): boolean {
  return ID_PATTERN.test(value);
}
