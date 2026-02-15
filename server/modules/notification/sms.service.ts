const SMS_API_URL = process.env.SMS_API_URL || 'https://sms-api-ph-gceo.onrender.com';
const SMS_API_KEY = process.env.SMS_API_KEY || '';
const SMS_USER_ID = process.env.SMS_USER_ID || '';

const PH_NUMBER_REGEX = /^\+639\d{9}$/;

export const SmsService = {
	/**
	 * Validate a Philippine mobile number (+639XXXXXXXXX format)
	 */
	isValidPhNumber(phone: string): boolean {
		return PH_NUMBER_REGEX.test(phone);
	},

	/**
	 * Send an SMS via the PH SMS API.
	 * Returns true on success, false on failure — never throws.
	 */
	async send(to: string, message: string): Promise<boolean> {
		if (!SMS_API_KEY) {
			console.warn('SMS_API_KEY not configured, skipping SMS');
			return false;
		}

		if (!this.isValidPhNumber(to)) {
			console.warn(`Invalid PH number: ${to}`);
			return false;
		}

		try {
			const res = await fetch(`${SMS_API_URL}/send/sms`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': SMS_API_KEY,
				},
				body: JSON.stringify({ recipient: to, message, userId: SMS_USER_ID || undefined }),
			});

			if (!res.ok) {
				const body = await res.text().catch(() => 'unknown');
				console.error(`SMS API error ${res.status}: ${body}`);
				return false;
			}

			return true;
		} catch (error) {
			console.error('SMS send failed:', error);
			return false;
		}
	},
};
