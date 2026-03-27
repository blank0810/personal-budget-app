import React from 'react';
import {
	Document,
	Page,
	Text,
	View,
	StyleSheet,
	Font,
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

// Colors
const PRIMARY = '#0d9488'; // dark teal
const PRIMARY_DARK = '#1a1a2e'; // near-black
const GREEN = '#16a34a';
const RED = '#dc2626';
const GRAY_CANCEL = '#6b7280';
const BG_ALT_ROW = '#f8fafc';
const BG_NOTES = '#f1f5f9';
const BG_BILL_TO = '#f8fafc';
const BORDER_LIGHT = '#e2e8f0';
const TEXT_MUTED = '#64748b';
const TEXT_SECONDARY = '#475569';
const WHITE = '#ffffff';

const styles = StyleSheet.create({
	page: {
		fontFamily: 'DM Sans',
		fontSize: 10,
		color: PRIMARY_DARK,
		paddingTop: 48,
		paddingBottom: 80,
		paddingHorizontal: 48,
		backgroundColor: WHITE,
	},
	// --- Top Section ---
	topSection: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		marginBottom: 24,
	},
	brandName: {
		fontFamily: 'DM Sans',
		fontSize: 11,
		fontWeight: 700,
		color: PRIMARY,
		letterSpacing: 1,
		textTransform: 'uppercase',
	},
	invoiceTitle: {
		fontFamily: 'DM Serif Display',
		fontSize: 24,
		color: PRIMARY_DARK,
		textAlign: 'right',
	},
	// --- Metadata Grid ---
	metaGrid: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		marginBottom: 20,
	},
	metaBlock: {
		marginLeft: 24,
		alignItems: 'flex-end',
	},
	metaLabel: {
		fontSize: 7,
		fontWeight: 700,
		color: TEXT_MUTED,
		textTransform: 'uppercase',
		letterSpacing: 0.8,
		marginBottom: 2,
	},
	metaValue: {
		fontSize: 9,
		fontWeight: 500,
		color: PRIMARY_DARK,
	},
	metaValueMono: {
		fontSize: 10,
		fontWeight: 700,
		color: PRIMARY_DARK,
		fontFamily: 'DM Sans',
		letterSpacing: 0.5,
	},
	// --- Separator ---
	separator: {
		borderBottomWidth: 1,
		borderBottomColor: BORDER_LIGHT,
		marginBottom: 24,
	},
	// --- Bill To ---
	billToContainer: {
		marginBottom: 28,
		padding: 16,
		backgroundColor: BG_BILL_TO,
		borderRadius: 6,
		borderWidth: 1,
		borderColor: BORDER_LIGHT,
	},
	billToLabel: {
		fontSize: 7,
		fontWeight: 700,
		color: TEXT_MUTED,
		textTransform: 'uppercase',
		letterSpacing: 1,
		marginBottom: 8,
	},
	clientName: {
		fontSize: 13,
		fontWeight: 700,
		color: PRIMARY_DARK,
		marginBottom: 3,
	},
	clientDetail: {
		fontSize: 9,
		color: TEXT_SECONDARY,
		lineHeight: 1.6,
	},
	// --- Line Items Table ---
	table: {
		marginBottom: 24,
	},
	tableHeader: {
		flexDirection: 'row',
		backgroundColor: PRIMARY_DARK,
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderTopLeftRadius: 6,
		borderTopRightRadius: 6,
	},
	tableHeaderText: {
		fontSize: 7,
		fontWeight: 700,
		color: WHITE,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	tableRow: {
		flexDirection: 'row',
		paddingVertical: 9,
		paddingHorizontal: 12,
		borderBottomWidth: 1,
		borderBottomColor: BORDER_LIGHT,
	},
	tableRowAlt: {
		backgroundColor: BG_ALT_ROW,
	},
	colNum: { width: 28 },
	colDesc: { flex: 1 },
	colQty: { width: 55, textAlign: 'right' },
	colRate: { width: 80, textAlign: 'right' },
	colAmount: { width: 85, textAlign: 'right' },
	cellText: {
		fontSize: 9,
		color: TEXT_SECONDARY,
	},
	cellTextBold: {
		fontSize: 9,
		fontWeight: 700,
		color: PRIMARY_DARK,
	},
	// --- Totals ---
	totalsContainer: {
		alignItems: 'flex-end',
		marginBottom: 28,
	},
	totalsBox: {
		width: 240,
	},
	totalRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: 5,
	},
	totalLabel: {
		fontSize: 9,
		color: TEXT_MUTED,
	},
	totalValue: {
		fontSize: 9,
		fontWeight: 500,
		color: PRIMARY_DARK,
	},
	totalDivider: {
		borderBottomWidth: 1,
		borderBottomColor: BORDER_LIGHT,
		marginVertical: 4,
	},
	grandTotalRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: 10,
		paddingHorizontal: 14,
		backgroundColor: PRIMARY,
		borderRadius: 6,
		marginTop: 6,
	},
	grandTotalLabel: {
		fontFamily: 'DM Serif Display',
		fontSize: 14,
		color: WHITE,
	},
	grandTotalValue: {
		fontFamily: 'DM Serif Display',
		fontSize: 14,
		color: WHITE,
	},
	// --- Notes ---
	notesSection: {
		padding: 14,
		backgroundColor: BG_NOTES,
		borderRadius: 6,
		marginBottom: 16,
	},
	notesLabel: {
		fontSize: 7,
		fontWeight: 700,
		color: TEXT_MUTED,
		textTransform: 'uppercase',
		letterSpacing: 1,
		marginBottom: 6,
	},
	notesText: {
		fontSize: 9,
		color: TEXT_SECONDARY,
		lineHeight: 1.6,
	},
	// --- Footer ---
	footer: {
		position: 'absolute',
		bottom: 24,
		left: 48,
		right: 48,
		borderTopWidth: 1,
		borderTopColor: BORDER_LIGHT,
		paddingTop: 10,
	},
	footerRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	footerThankYou: {
		fontSize: 8,
		fontWeight: 500,
		color: PRIMARY,
	},
	footerText: {
		fontSize: 7,
		color: TEXT_MUTED,
	},
	// --- Status Stamps ---
	stampContainer: {
		position: 'absolute',
		top: 50,
		right: 44,
		transform: 'rotate(-12deg)',
	},
	stampBadge: {
		paddingHorizontal: 18,
		paddingVertical: 8,
		borderRadius: 6,
		opacity: 0.85,
	},
	stampText: {
		fontFamily: 'DM Serif Display',
		fontSize: 22,
		color: WHITE,
		letterSpacing: 2,
	},
	// Draft watermark
	draftWatermark: {
		position: 'absolute',
		top: 320,
		left: 80,
		transform: 'rotate(-35deg)',
		opacity: 0.06,
	},
	draftWatermarkText: {
		fontFamily: 'DM Serif Display',
		fontSize: 96,
		color: PRIMARY_DARK,
		letterSpacing: 12,
	},
	// Cancelled stamp
	cancelledStampBadge: {
		paddingHorizontal: 18,
		paddingVertical: 8,
		borderRadius: 6,
		borderWidth: 3,
		borderColor: GRAY_CANCEL,
		opacity: 0.7,
	},
	cancelledStampText: {
		fontFamily: 'DM Serif Display',
		fontSize: 22,
		color: GRAY_CANCEL,
		letterSpacing: 2,
		textDecoration: 'line-through',
	},
});

// --- Types ---

interface InvoiceLineItemData {
	id: string;
	description: string;
	quantity: number;
	unitPrice: number;
	amount: number;
	sortOrder: number;
}

interface InvoicePDFData {
	id: string;
	invoiceNumber: string;
	status: string;
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
		}).format(val);
}

function formatDate(date: Date): string {
	return new Date(date).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});
}

function getStatusLabel(status: string): string {
	switch (status) {
		case 'PAID':
			return 'Paid';
		case 'SENT':
			return 'Sent';
		case 'OVERDUE':
			return 'Overdue';
		case 'DRAFT':
			return 'Draft';
		case 'CANCELLED':
			return 'Cancelled';
		default:
			return status;
	}
}

// --- Section Components ---

function TopSection() {
	return (
		<View style={styles.topSection}>
			<View>
				<Text style={styles.brandName}>Budget Planner</Text>
			</View>
			<View>
				<Text style={styles.invoiceTitle}>INVOICE</Text>
			</View>
		</View>
	);
}

function MetadataGrid({ invoice }: { invoice: InvoicePDFData }) {
	return (
		<View style={styles.metaGrid}>
			<View style={styles.metaBlock}>
				<Text style={styles.metaLabel}>Invoice #</Text>
				<Text style={styles.metaValueMono}>{invoice.invoiceNumber}</Text>
			</View>
			<View style={styles.metaBlock}>
				<Text style={styles.metaLabel}>Issue Date</Text>
				<Text style={styles.metaValue}>{formatDate(invoice.issueDate)}</Text>
			</View>
			<View style={styles.metaBlock}>
				<Text style={styles.metaLabel}>Due Date</Text>
				<Text style={styles.metaValue}>{formatDate(invoice.dueDate)}</Text>
			</View>
			<View style={styles.metaBlock}>
				<Text style={styles.metaLabel}>Status</Text>
				<Text style={styles.metaValue}>{getStatusLabel(invoice.status)}</Text>
			</View>
		</View>
	);
}

function StatusStamp({ status }: { status: string }) {
	if (status === 'DRAFT') {
		return (
			<View style={styles.draftWatermark}>
				<Text style={styles.draftWatermarkText}>DRAFT</Text>
			</View>
		);
	}

	if (status === 'PAID') {
		return (
			<View style={styles.stampContainer}>
				<View style={{ ...styles.stampBadge, backgroundColor: GREEN }}>
					<Text style={styles.stampText}>PAID</Text>
				</View>
			</View>
		);
	}

	if (status === 'OVERDUE') {
		return (
			<View style={styles.stampContainer}>
				<View style={{ ...styles.stampBadge, backgroundColor: RED }}>
					<Text style={styles.stampText}>OVERDUE</Text>
				</View>
			</View>
		);
	}

	if (status === 'CANCELLED') {
		return (
			<View style={styles.stampContainer}>
				<View style={styles.cancelledStampBadge}>
					<Text style={styles.cancelledStampText}>CANCELLED</Text>
				</View>
			</View>
		);
	}

	// SENT status: no watermark/stamp (clean)
	return null;
}

function BillToSection({ invoice }: { invoice: InvoicePDFData }) {
	return (
		<View style={styles.billToContainer}>
			<Text style={styles.billToLabel}>Bill To</Text>
			<Text style={styles.clientName}>{invoice.clientName}</Text>
			{invoice.clientEmail && (
				<Text style={styles.clientDetail}>{invoice.clientEmail}</Text>
			)}
			{invoice.clientPhone && (
				<Text style={styles.clientDetail}>{invoice.clientPhone}</Text>
			)}
			{invoice.clientAddress && (
				<Text style={styles.clientDetail}>
					{invoice.clientAddress}
				</Text>
			)}
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
	return (
		<View style={styles.table}>
			{/* Table Header */}
			<View style={styles.tableHeader}>
				<Text style={{ ...styles.tableHeaderText, ...styles.colNum }}>
					#
				</Text>
				<Text style={{ ...styles.tableHeaderText, ...styles.colDesc }}>
					Description
				</Text>
				<Text style={{ ...styles.tableHeaderText, ...styles.colQty }}>
					Hrs/Qty
				</Text>
				<Text
					style={{ ...styles.tableHeaderText, ...styles.colRate }}
				>
					Rate
				</Text>
				<Text
					style={{ ...styles.tableHeaderText, ...styles.colAmount }}
				>
					Amount
				</Text>
			</View>

			{/* Table Rows */}
			{lineItems.map((item, index) => (
				<View
					key={item.id}
					style={{
						...styles.tableRow,
						...(index % 2 === 1 ? styles.tableRowAlt : {}),
					}}
				>
					<Text style={{ ...styles.cellText, ...styles.colNum }}>
						{index + 1}
					</Text>
					<Text style={{ ...styles.cellText, ...styles.colDesc }}>
						{item.description}
					</Text>
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

function TotalsSection({
	invoice,
	fmt,
}: {
	invoice: InvoicePDFData;
	fmt: (val: number) => string;
}) {
	return (
		<View style={styles.totalsContainer}>
			<View style={styles.totalsBox}>
				<View style={styles.totalRow}>
					<Text style={styles.totalLabel}>Subtotal</Text>
					<Text style={styles.totalValue}>
						{fmt(invoice.subtotal)}
					</Text>
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
				<View style={styles.totalDivider} />
				<View style={styles.grandTotalRow}>
					<Text style={styles.grandTotalLabel}>TOTAL</Text>
					<Text style={styles.grandTotalValue}>
						{fmt(invoice.totalAmount)}
					</Text>
				</View>
			</View>
		</View>
	);
}

function NotesSection({ notes }: { notes: string }) {
	return (
		<View style={styles.notesSection}>
			<Text style={styles.notesLabel}>Notes</Text>
			<Text style={styles.notesText}>{notes}</Text>
		</View>
	);
}

function FooterSection({ invoice }: { invoice: InvoicePDFData }) {
	return (
		<View style={styles.footer} fixed>
			<View style={styles.footerRow}>
				<Text style={styles.footerThankYou}>
					Thank you for your business
				</Text>
				<Text
					style={styles.footerText}
					render={({ pageNumber, totalPages }) =>
						`Page ${pageNumber} of ${totalPages}`
					}
				/>
			</View>
			<View style={{ ...styles.footerRow, marginTop: 4 }}>
				<Text style={styles.footerText}>
					{invoice.invoiceNumber} | {invoice.clientName}
				</Text>
			</View>
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
		<Document
			title={`Invoice ${invoice.invoiceNumber}`}
			author="Budget Planner"
		>
			<Page size="A4" style={styles.page}>
				<StatusStamp status={invoice.status} />
				<TopSection />
				<MetadataGrid invoice={invoice} />
				<View style={styles.separator} />
				<BillToSection invoice={invoice} />
				<LineItemsTable lineItems={invoice.lineItems} fmt={fmt} />
				<TotalsSection invoice={invoice} fmt={fmt} />
				{invoice.notes && <NotesSection notes={invoice.notes} />}
				<FooterSection invoice={invoice} />
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
