/**
 * Return type for UserService.getForLayout()
 */
export type UserForLayout = {
	name: string | null;
	email: string;
	currency: string;
	role: string;
	lastSeenChangelogAt: Date | null;
};

/**
 * Return type for UserService.getProfile()
 */
export type UserProfile = {
	id: string;
	name: string | null;
	email: string;
	password: string | null;
	phoneNumber: string | null;
	createdAt: Date;
	authAccounts: {
		provider: string;
		providerAccountId: string;
	}[];
};

/**
 * Return type for UserService.getEmailAndCreatedAt()
 */
export type UserEmailAndCreatedAt = {
	email: string;
	createdAt: Date;
};

/**
 * Return type for UserService.getEmailAndName()
 */
export type UserEmailAndName = {
	email: string;
	name: string | null;
};

/**
 * Return type for UserService.getPhoneAndName()
 */
export type UserPhoneAndName = {
	phoneNumber: string | null;
	name: string | null;
};

/**
 * Return type for UserService.getNameEmailCurrency()
 */
export type UserNameEmailCurrency = {
	name: string | null;
	email: string;
	currency: string;
};
