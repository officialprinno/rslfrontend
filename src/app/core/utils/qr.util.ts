import QRCode from 'qrcode';

export async function generateQrDataUrl(
  data: string,
  size = 120,
): Promise<string | null> {
  const value = data.trim();
  if (!value) return null;
  try {
    return await QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
    });
  } catch {
    return null;
  }
}
