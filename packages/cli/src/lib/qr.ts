import QRCode from "qrcode";

// Renders a compact QR code as terminal-friendly text (half-block characters)
// so it can be printed directly under the beam URL.
export async function renderQrTerminal(text: string): Promise<string> {
  return QRCode.toString(text, { type: "terminal", small: true });
}
