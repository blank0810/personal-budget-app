import QRCode from 'qrcode';

const QR_SIZE = 256;

/** Generate a base64 PNG data URI QR for a URL, or null if none/invalid. */
export async function urlToQrDataUri(url: string | null | undefined): Promise<string | null> {
	if (!url) return null;
	try {
		return await QRCode.toDataURL(url, { margin: 1, width: QR_SIZE });
	} catch {
		return null;
	}
}
