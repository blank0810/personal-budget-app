import React from 'react';
import {
	Document,
	Page,
	Text,
	View,
	StyleSheet,
	Font,
	Image,
	renderToBuffer,
} from '@react-pdf/renderer';
import { getCurrencyConfig } from '@/lib/currency';
import path from 'path';

// Register fonts from local files (same as report.templates.tsx)
const fontsDir = path.join(process.cwd(), 'public', 'fonts');

Font.register({
	family: 'DM Serif Display',
	src: path.join(fontsDir, 'DMSerifDisplay-Regular.ttf'),
});

Font.register({
	family: 'DM Sans',
	fonts: [
		{
			src: path.join(fontsDir, 'DMSans-Regular.ttf'),
			fontWeight: 400,
		},
		{
			src: path.join(fontsDir, 'DMSans-Medium.ttf'),
			fontWeight: 500,
		},
		{
			src: path.join(fontsDir, 'DMSans-Bold.ttf'),
			fontWeight: 700,
		},
	],
});

// Currency-symbol fallback. DM Sans has no glyph for several currency signs
// (₱ peso, ₩ won, ฿ baht), which causes the symbol to render with zero advance
// width and collide with the first digit of the amount. This subset font (built
// from DejaVu Sans, Currency Symbols block + ฿) supplies only those glyphs.
// react-pdf resolves a fontFamily array as a per-glyph fallback, so DM Sans
// still renders everything it covers and only the missing signs fall through.
// Registered across weights so bold amounts don't lose the fallback.
const CURRENCY_FALLBACK = 'Currency Fallback';
Font.register({
	family: CURRENCY_FALLBACK,
	fonts: [
		{ src: path.join(fontsDir, 'CurrencyFallback.ttf'), fontWeight: 400 },
		{ src: path.join(fontsDir, 'CurrencyFallback.ttf'), fontWeight: 500 },
		{ src: path.join(fontsDir, 'CurrencyFallback.ttf'), fontWeight: 700 },
	],
});

const BODY_FONT = ['DM Sans', CURRENCY_FALLBACK];

// Colors — clean black and white palette
const TEXT_PRIMARY = '#111111';
const TEXT_MUTED = '#6b7280';
const TEXT_SECONDARY = '#4b5563';
const BORDER = '#e5e5e5';
const TABLE_HEADER_BG = '#f5f5f5';
const PAYMENT_BG = '#f9fafb';
const WHITE = '#ffffff';
const GREEN = '#16a34a';
const RED = '#dc2626';
const GRAY_STAMP = '#9ca3af';

const styles = StyleSheet.create({
	page: {
		fontFamily: BODY_FONT,
		fontSize: 10,
		color: TEXT_PRIMARY,
		paddingTop: 48,
		paddingBottom: 72,
		paddingHorizontal: 48,
		backgroundColor: WHITE,
	},
	// --- Header / Masthead ---
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		marginBottom: 32,
	},
	brandCol: {
		flex: 1,
		paddingRight: 24,
	},
	eyebrow: {
		fontSize: 8,
		fontWeight: 700,
		color: TEXT_MUTED,
		textTransform: 'uppercase',
		letterSpacing: 2,
		marginBottom: 5,
	},
	wordmark: {
		fontFamily: 'DM Serif Display',
		fontSize: 24,
		color: TEXT_PRIMARY,
		lineHeight: 1.1,
	},
	invoiceTitle: {
		fontFamily: 'DM Serif Display',
		fontSize: 28,
		color: TEXT_PRIMARY,
	},
	metaStack: {
		alignItems: 'flex-end',
	},
	metaRow: {
		flexDirection: 'row',
		marginBottom: 3,
	},
	metaLabel: {
		fontSize: 8,
		fontWeight: 500,
		color: TEXT_MUTED,
		width: 65,
		textAlign: 'right',
		marginRight: 8,
	},
	metaValue: {
		fontSize: 9,
		fontWeight: 500,
		color: TEXT_PRIMARY,
		width: 90,
		textAlign: 'right',
	},
	// --- Separator ---
	separator: {
		borderBottomWidth: 1,
		borderBottomColor: BORDER,
		marginBottom: 24,
	},
	// --- From / Bill To ---
	partyRow: {
		flexDirection: 'row',
		marginBottom: 28,
	},
	partyCol: {
		flex: 1,
		paddingRight: 16,
	},
	partyLabel: {
		fontSize: 8,
		fontWeight: 700,
		color: TEXT_MUTED,
		textTransform: 'uppercase',
		letterSpacing: 0.8,
		marginBottom: 6,
	},
	clientName: {
		fontSize: 12,
		fontWeight: 700,
		color: TEXT_PRIMARY,
		marginBottom: 2,
	},
	clientDetail: {
		fontSize: 9,
		color: TEXT_SECONDARY,
		lineHeight: 1.6,
	},
	taxIdText: {
		fontSize: 9,
		color: TEXT_SECONDARY,
		marginTop: 3,
	},
	// --- Line Items Table ---
	table: {
		marginBottom: 28,
	},
	tableHeader: {
		flexDirection: 'row',
		backgroundColor: TABLE_HEADER_BG,
		paddingVertical: 7,
		paddingHorizontal: 10,
		borderTopWidth: 1,
		borderTopColor: TEXT_PRIMARY,
		borderBottomWidth: 1,
		borderBottomColor: TEXT_PRIMARY,
	},
	tableHeaderText: {
		fontSize: 8,
		fontWeight: 700,
		color: TEXT_PRIMARY,
		textTransform: 'uppercase',
		letterSpacing: 0.3,
	},
	tableRow: {
		flexDirection: 'row',
		paddingVertical: 8,
		paddingHorizontal: 10,
		borderBottomWidth: 0.5,
		borderBottomColor: TEXT_PRIMARY,
	},
	colDate: { width: 75, textAlign: 'left' },
	colDesc: { flex: 1 },
	colQty: { width: 60, textAlign: 'right' },
	colRate: { width: 80, textAlign: 'right' },
	colAmount: { width: 85, textAlign: 'right' },
	cellText: {
		fontSize: 9,
		color: TEXT_SECONDARY,
	},
	cellTextBold: {
		fontSize: 9,
		fontWeight: 700,
		color: TEXT_PRIMARY,
	},
	// --- Summary row: payment block (left) + totals (right) ---
	summaryRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		marginBottom: 24,
	},
	paymentCol: {
		flex: 1,
		paddingRight: 24,
	},
	paymentBox: {
		backgroundColor: PAYMENT_BG,
		borderWidth: 1,
		borderColor: BORDER,
		borderRadius: 4,
		paddingVertical: 12,
		paddingHorizontal: 14,
	},
	sectionLabel: {
		fontSize: 8,
		fontWeight: 700,
		color: TEXT_MUTED,
		textTransform: 'uppercase',
		letterSpacing: 0.8,
		marginBottom: 6,
	},
	paymentText: {
		fontSize: 9,
		color: TEXT_SECONDARY,
		lineHeight: 1.6,
	},
	totalsBox: {
		width: 220,
	},
	totalRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: 4,
	},
	totalLabel: {
		fontSize: 9,
		color: TEXT_MUTED,
	},
	totalValue: {
		fontSize: 9,
		fontWeight: 500,
		color: TEXT_PRIMARY,
	},
	grandTotalDivider: {
		borderBottomWidth: 2,
		borderBottomColor: TEXT_PRIMARY,
		marginTop: 6,
		marginBottom: 6,
	},
	grandTotalRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: 4,
	},
	grandTotalLabel: {
		fontSize: 13,
		fontWeight: 700,
		color: TEXT_PRIMARY,
	},
	grandTotalValue: {
		fontSize: 13,
		fontWeight: 700,
		color: TEXT_PRIMARY,
	},
	balanceDivider: {
		borderBottomWidth: 1,
		borderBottomColor: BORDER,
		marginTop: 4,
		marginBottom: 4,
	},
	// --- Notes ---
	notesSection: {
		marginBottom: 16,
	},
	notesLabel: {
		fontSize: 8,
		fontWeight: 700,
		color: TEXT_MUTED,
		textTransform: 'uppercase',
		letterSpacing: 0.8,
		marginBottom: 4,
	},
	notesText: {
		fontSize: 9,
		color: TEXT_SECONDARY,
		lineHeight: 1.6,
	},
	// --- Payment link ---
	paymentBlock: {
		marginTop: 8,
		flexDirection: 'row',
		alignItems: 'flex-start',
	},
	paymentDetails: {
		flex: 1,
	},
	paymentLinkText: {
		fontSize: 8,
		color: TEXT_SECONDARY,
		lineHeight: 1.5,
	},
	paymentQrImage: {
		width: 64,
		height: 64,
		marginLeft: 8,
	},
	// --- Footer ---
	footer: {
		position: 'absolute',
		bottom: 24,
		left: 48,
		right: 48,
		borderTopWidth: 1,
		borderTopColor: BORDER,
		paddingTop: 8,
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	footerText: {
		fontSize: 7,
		color: TEXT_MUTED,
	},
	// --- Status Stamps ---
	stampContainer: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		justifyContent: 'center',
		alignItems: 'center',
	},
	stampBorder: {
		paddingHorizontal: 32,
		paddingVertical: 12,
		borderWidth: 4,
		borderRadius: 6,
		opacity: 0.12,
		transform: 'rotate(-12deg)',
	},
	stampText: {
		fontFamily: 'DM Sans',
		fontSize: 64,
		fontWeight: 700,
		letterSpacing: 8,
	},
	// Draft watermark — centered like the other stamps, just borderless + fainter
	draftWatermark: {
		transform: 'rotate(-12deg)',
		opacity: 0.06,
	},
	draftWatermarkText: {
		fontFamily: 'DM Sans',
		fontSize: 96,
		fontWeight: 700,
		color: TEXT_PRIMARY,
		letterSpacing: 12,
	},
});

// --- Types ---

interface InvoiceLineItemData {
	id: string;
	description: string;
	quantity: number;
	unitPrice: number;
	amount: number;
	date: Date | null;
	sortOrder: number;
}

interface InvoicePDFData {
	id: string;
	invoiceNumber: string;
	status: string;
	variant?: 'invoice' | 'receipt';
	userName: string | null;
	userEmail: string | null;
	userPhone: string | null;
	businessName: string | null;
	businessAddress: string | null;
	businessTaxId: string | null;
	paymentInstructions: string | null;
	paymentLink?: string | null;
	paymentQr?: string | null;
	clientName: string;
	clientEmail: string | null;
	clientAddress: string | null;
	clientPhone: string | null;
	issueDate: Date;
	dueDate: Date;
	subtotal: number;
	taxRate: number | null;
	taxAmount: number;
	totalAmount: number;
	notes: string | null;
	paidAt: Date | null;
	lineItems: InvoiceLineItemData[];
}

// --- Helpers ---

function createCurrencyFormatter(currencyCode: string) {
	const config = getCurrencyConfig(currencyCode);
	return (val: number): string =>
		new Intl.NumberFormat(config.locale, {
			style: 'currency',
			currency: currencyCode,
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		})
			.format(val)
			// ja-JP emits the fullwidth yen sign (￥, U+FFE5), a CJK-block glyph
			// absent from DM Sans and the fallback. Normalize to the standard
			// half-width ¥ (U+00A5), which DM Sans renders and which reads better
			// in a Latin-typeset document.
			.replace(/￥/g, '¥');
}

function formatDate(date: Date): string {
	return new Date(date).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});
}

/** Render multi-line text (split on newlines) as stacked Text rows. */
function MultiLineText({
	text,
	style,
}: {
	text: string;
	style: (typeof styles)[keyof typeof styles];
}) {
	return (
		<>
			{text.split('\n').map((line, i) => (
				<Text key={i} style={style}>
					{line}
				</Text>
			))}
		</>
	);
}

// --- Section Components ---

function HeaderSection({ invoice }: { invoice: InvoicePDFData }) {
	const hasBrand = !!invoice.businessName;

	return (
		<View style={styles.header}>
			<View style={styles.brandCol}>
				{hasBrand ? (
					<>
						<Text style={styles.eyebrow}>Invoice</Text>
						<Text style={styles.wordmark}>
							{invoice.businessName}
						</Text>
					</>
				) : (
					<Text style={styles.invoiceTitle}>INVOICE</Text>
				)}
			</View>
			<View style={styles.metaStack}>
				<View style={styles.metaRow}>
					<Text style={styles.metaLabel}>Invoice #</Text>
					<Text style={{ ...styles.metaValue, fontWeight: 700 }}>
						{invoice.invoiceNumber}
					</Text>
				</View>
				<View style={styles.metaRow}>
					<Text style={styles.metaLabel}>Issue Date</Text>
					<Text style={styles.metaValue}>
						{formatDate(invoice.issueDate)}
					</Text>
				</View>
				<View style={styles.metaRow}>
					<Text style={styles.metaLabel}>Due Date</Text>
					<Text style={styles.metaValue}>
						{formatDate(invoice.dueDate)}
					</Text>
				</View>
			</View>
		</View>
	);
}

function StatusStamp({ status }: { status: string }) {
	if (status === 'DRAFT') {
		return (
			<View style={styles.stampContainer}>
				<View style={styles.draftWatermark}>
					<Text style={styles.draftWatermarkText}>DRAFT</Text>
				</View>
			</View>
		);
	}

	if (status === 'PAID') {
		return (
			<View style={styles.stampContainer}>
				<View style={{ ...styles.stampBorder, borderColor: GREEN }}>
					<Text style={{ ...styles.stampText, color: GREEN }}>
						PAID
					</Text>
				</View>
			</View>
		);
	}

	if (status === 'OVERDUE') {
		return (
			<View style={styles.stampContainer}>
				<View style={{ ...styles.stampBorder, borderColor: RED }}>
					<Text style={{ ...styles.stampText, fontSize: 56, letterSpacing: 6, color: RED }}>
						OVERDUE
					</Text>
				</View>
			</View>
		);
	}

	if (status === 'CANCELLED') {
		return (
			<View style={styles.stampContainer}>
				<View
					style={{ ...styles.stampBorder, borderColor: GRAY_STAMP }}
				>
					<Text
						style={{
							...styles.stampText,
							fontSize: 48,
							letterSpacing: 5,
							color: GRAY_STAMP,
						}}
					>
						CANCELLED
					</Text>
				</View>
			</View>
		);
	}

	// SENT status: no stamp
	return null;
}

function FromBillToSection({ invoice }: { invoice: InvoicePDFData }) {
	// Business name carries the masthead wordmark; the From block is the
	// sender's contact card. Lead with the person, fall back to business name
	// when no person name is set.
	const senderName = invoice.userName ?? invoice.businessName;

	return (
		<View style={styles.partyRow}>
			{/* From */}
			<View style={styles.partyCol}>
				<Text style={styles.partyLabel}>From</Text>
				{senderName ? (
					<Text style={styles.clientName}>{senderName}</Text>
				) : null}
				{invoice.userEmail ? (
					<Text style={styles.clientDetail}>{invoice.userEmail}</Text>
				) : null}
				{invoice.userPhone ? (
					<Text style={styles.clientDetail}>{invoice.userPhone}</Text>
				) : null}
				{invoice.businessAddress ? (
					<MultiLineText
						text={invoice.businessAddress}
						style={styles.clientDetail}
					/>
				) : null}
				{invoice.businessTaxId ? (
					<Text style={styles.taxIdText}>
						Tax ID: {invoice.businessTaxId}
					</Text>
				) : null}
			</View>
			{/* Bill To */}
			<View style={styles.partyCol}>
				<Text style={styles.partyLabel}>Bill To</Text>
				<Text style={styles.clientName}>{invoice.clientName}</Text>
				{invoice.clientEmail ? (
					<Text style={styles.clientDetail}>{invoice.clientEmail}</Text>
				) : null}
				{invoice.clientPhone ? (
					<Text style={styles.clientDetail}>{invoice.clientPhone}</Text>
				) : null}
				{invoice.clientAddress ? (
					<MultiLineText
						text={invoice.clientAddress}
						style={styles.clientDetail}
					/>
				) : null}
			</View>
		</View>
	);
}

function LineItemsTable({
	lineItems,
	fmt,
}: {
	lineItems: InvoiceLineItemData[];
	fmt: (val: number) => string;
}) {
	const hasAnyDate = lineItems.some((item) => item.date != null);

	return (
		<View style={styles.table}>
			{/* Table Header */}
			<View style={styles.tableHeader}>
				{hasAnyDate && (
					<Text style={{ ...styles.tableHeaderText, ...styles.colDate }}>
						Date
					</Text>
				)}
				<Text style={{ ...styles.tableHeaderText, ...styles.colDesc }}>
					Description
				</Text>
				<Text style={{ ...styles.tableHeaderText, ...styles.colQty }}>
					Hrs/Qty
				</Text>
				<Text style={{ ...styles.tableHeaderText, ...styles.colRate }}>
					Rate
				</Text>
				<Text
					style={{ ...styles.tableHeaderText, ...styles.colAmount }}
				>
					Amount
				</Text>
			</View>

			{/* Table Rows */}
			{lineItems.map((item) => (
				<View key={item.id} style={styles.tableRow}>
					{hasAnyDate && (
						<Text style={{ ...styles.cellText, ...styles.colDate }}>
							{item.date ? formatDate(item.date) : ''}
						</Text>
					)}
					<View style={styles.colDesc}>
						{item.description.split('\n').map((line, i) => (
							<Text key={i} style={styles.cellText}>
								{line}
							</Text>
						))}
					</View>
					<Text style={{ ...styles.cellText, ...styles.colQty }}>
						{item.quantity}
					</Text>
					<Text style={{ ...styles.cellText, ...styles.colRate }}>
						{fmt(item.unitPrice)}
					</Text>
					<Text
						style={{ ...styles.cellTextBold, ...styles.colAmount }}
					>
						{fmt(item.amount)}
					</Text>
				</View>
			))}
		</View>
	);
}

function TotalsBox({
	invoice,
	fmt,
}: {
	invoice: InvoicePDFData;
	fmt: (val: number) => string;
}) {
	return (
		<View style={styles.totalsBox}>
			<View style={styles.totalRow}>
				<Text style={styles.totalLabel}>Subtotal</Text>
				<Text style={styles.totalValue}>{fmt(invoice.subtotal)}</Text>
			</View>
			{invoice.taxRate != null && invoice.taxRate > 0 && (
				<View style={styles.totalRow}>
					<Text style={styles.totalLabel}>
						Tax ({invoice.taxRate}%)
					</Text>
					<Text style={styles.totalValue}>
						{fmt(invoice.taxAmount)}
					</Text>
				</View>
			)}
			<View style={styles.grandTotalDivider} />
			<View style={styles.grandTotalRow}>
				<Text style={styles.grandTotalLabel}>Total</Text>
				<Text style={styles.grandTotalValue}>
					{fmt(invoice.totalAmount)}
				</Text>
			</View>
			{invoice.status === 'PAID' && (
				<>
					<View style={styles.totalRow}>
						<Text style={{ ...styles.totalLabel, color: GREEN }}>
							Paid
						</Text>
						<Text style={{ ...styles.totalValue, color: GREEN }}>
							-{fmt(invoice.totalAmount)}
						</Text>
					</View>
					<View style={styles.balanceDivider} />
					<View style={styles.grandTotalRow}>
						<Text style={{ ...styles.grandTotalLabel, fontSize: 11 }}>
							Balance Due
						</Text>
						<Text
							style={{
								...styles.grandTotalValue,
								fontSize: 11,
								color: GREEN,
							}}
						>
							{fmt(0)}
						</Text>
					</View>
				</>
			)}
			{invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
				<>
					<View style={styles.balanceDivider} />
					<View style={styles.grandTotalRow}>
						<Text style={{ ...styles.grandTotalLabel, fontSize: 11 }}>
							Balance Due
						</Text>
						<Text style={{ ...styles.grandTotalValue, fontSize: 11 }}>
							{fmt(invoice.totalAmount)}
						</Text>
					</View>
				</>
			)}
		</View>
	);
}

function PaymentLinkBlock({ invoice }: { invoice: InvoicePDFData }) {
	if (!invoice.paymentLink) return null;
	return (
		<View style={styles.paymentBlock}>
			<View style={styles.paymentDetails}>
				<Text style={styles.paymentLinkText}>{invoice.paymentLink}</Text>
			</View>
			{invoice.paymentQr ? (
				<Image src={invoice.paymentQr} style={styles.paymentQrImage} />
			) : null}
		</View>
	);
}

function SummarySection({
	invoice,
	fmt,
}: {
	invoice: InvoicePDFData;
	fmt: (val: number) => string;
}) {
	const isReceipt = invoice.variant === 'receipt';
	const hasPaymentLink = !isReceipt && !!invoice.paymentLink;
	const hasInstructions = !isReceipt && !!invoice.paymentInstructions;
	const showPaymentBox = hasPaymentLink || hasInstructions;

	return (
		<View style={styles.summaryRow}>
			<View style={styles.paymentCol}>
				{showPaymentBox ? (
					<View style={styles.paymentBox}>
						<Text style={styles.sectionLabel}>Pay this invoice</Text>
						{hasPaymentLink ? (
							<PaymentLinkBlock invoice={invoice} />
						) : null}
						{hasInstructions ? (
							<MultiLineText
								text={invoice.paymentInstructions!}
								style={styles.paymentText}
							/>
						) : null}
					</View>
				) : null}
			</View>
			<TotalsBox invoice={invoice} fmt={fmt} />
		</View>
	);
}

function NotesSection({ notes }: { notes: string }) {
	return (
		<View style={styles.notesSection}>
			<Text style={styles.notesLabel}>Notes</Text>
			<MultiLineText text={notes} style={styles.notesText} />
		</View>
	);
}

function FooterSection({ invoiceNumber }: { invoiceNumber: string }) {
	return (
		<View style={styles.footer} fixed>
			<Text style={styles.footerText}>Invoice {invoiceNumber}</Text>
			<Text
				style={styles.footerText}
				render={({ pageNumber, totalPages }) =>
					`Page ${pageNumber} of ${totalPages}`
				}
			/>
		</View>
	);
}

// --- Main Document ---

function InvoiceDocument({
	invoice,
	currency,
}: {
	invoice: InvoicePDFData;
	currency: string;
}) {
	const fmt = createCurrencyFormatter(currency);

	return (
		<Document title={`Invoice ${invoice.invoiceNumber}`}>
			<Page size="A4" style={styles.page}>
				<StatusStamp status={invoice.status} />
				<HeaderSection invoice={invoice} />
				<View style={styles.separator} />
				<FromBillToSection invoice={invoice} />
				<LineItemsTable lineItems={invoice.lineItems} fmt={fmt} />
				<SummarySection invoice={invoice} fmt={fmt} />
				{invoice.notes && <NotesSection notes={invoice.notes} />}
				<FooterSection invoiceNumber={invoice.invoiceNumber} />
			</Page>
		</Document>
	);
}

/**
 * Render an invoice PDF to a buffer.
 * All Decimal fields on the invoice should be converted to numbers before calling.
 */
export async function renderInvoicePDF(
	invoice: InvoicePDFData,
	currency: string
): Promise<Buffer> {
	const buffer = await renderToBuffer(
		<InvoiceDocument invoice={invoice} currency={currency} />
	);
	return Buffer.from(buffer);
}
