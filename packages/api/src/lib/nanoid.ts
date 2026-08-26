import { customAlphabet } from "nanoid";

// Mixed alphanumeric, 8 chars, URL-safe (no ambiguous separators needed since
// we don't use '-' or '_').
const alphabet =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export const generateId = customAlphabet(alphabet, 8);
