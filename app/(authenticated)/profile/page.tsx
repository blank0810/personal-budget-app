import { permanentRedirect } from 'next/navigation';

/**
 * Settings moved to /settings/*. This redirect is permanent and must stay:
 * notification emails already delivered have /profile baked into their footer,
 * and the Google OAuth callback referenced it too.
 */
export default function ProfileRedirect() {
	permanentRedirect('/settings/profile');
}
