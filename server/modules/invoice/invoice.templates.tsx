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

// Colors — clean black and white palette
const TEXT_PRIMARY = '#111111';
const TEXT_MUTED = '#6b7280';
const TEXT_SECONDARY = '#4b5563';
const BORDER = '#e5e5e5';
const TABLE_HEADER_BG = '#f5f5f5';
const WHITE = '#ffffff';
const GREEN = '#16a34a';
const RED = '#dc2626';
const GRAY_STAMP = '#9ca3af';

const styles = StyleSheet.create({
	page: {
		fontFamily: 'DM Sans',
		fontSize: 10,
		color: TEXT_PRIMARY,
		paddingTop: 48,
		paddingBottom: 72,
		paddingHorizontal: 48,
		backgroundColor: WHITE,
	},
	// --- Header ---
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		marginBottom: 32,
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
	// --- Bill To ---
	billToContainer: {
		marginBottom: 28,
	},
	billToLabel: {
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
	// --- Line Items Table ---
	table: {
		marginBottom: 28,
	},
	tableHeader: {
		flexDirection: 'row',
		backgroundColor: TABLE_HEADER_BG,
		paddingVertical: 7,
		paddingHorizontal: 10,
		borderBottomWidth: 1,
		borderBottomColor: BORDER,
	},
	tableHeaderText: {
		fontSize: 8,
		fontWeight: 700,
		color: TEXT_SECONDARY,
		textTransform: 'uppercase',
		letterSpacing: 0.3,
	},
	tableRow: {
		flexDirection: 'row',
		paddingVertical: 8,
		paddingHorizontal: 10,
		borderBottomWidth: 1,
		borderBottomColor: BORDER,
	},
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
	// --- Totals ---
	totalsContainer: {
		alignItems: 'flex-end',
		marginBottom: 28,
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
		justifyContent: 'flex-end',
	},
	footerText: {
		fontSize: 7,
		color: TEXT_MUTED,
	},
	// --- Status Stamps ---
	stampContainer: {
		position: 'absolute',
		top: 55,
		right: 44,
		transform: 'rotate(-12deg)',
	},
	stampBorder: {
		paddingHorizontal: 16,
		paddingVertical: 6,
		borderWidth: 3,
		borderRadius: 4,
		opacity: 0.75,
	},
	stampText: {
		fontFamily: 'DM Sans',
		fontSize: 20,
		fontWeight: 700,
		letterSpacing: 3,
	},
	// Draft watermark
	draftWatermark: {
		position: 'absolute',
		top: 320,
		left: 80,
		transform: 'rotate(-35deg)',
		opacity: 0.05,
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

// --- Section Components ---

function HeaderSection({ invoice }: { invoice: InvoicePDFData }) {
	return (
		<View style={styles.header}>
			<Text style={styles.invoiceTitle}>INVOICE</Text>
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
			<View style={styles.draftWatermark}>
				<Text style={styles.draftWatermarkText}>DRAFT</Text>
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
					<Text style={{ ...styles.stampText, color: RED }}>
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
							color: GRAY_STAMP,
							textDecoration: 'line-through',
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
							<Text style={{ ...styles.totalLabel, color: '#16a34a' }}>Paid</Text>
							<Text style={{ ...styles.totalValue, color: '#16a34a' }}>
								-{fmt(invoice.totalAmount)}
							</Text>
						</View>
						<View style={{ borderBottomWidth: 1, borderBottomColor: '#e5e5e5', marginTop: 4, marginBottom: 4 }} />
						<View style={styles.grandTotalRow}>
							<Text style={{ ...styles.grandTotalLabel, fontSize: 11 }}>Balance Due</Text>
							<Text style={{ ...styles.grandTotalValue, fontSize: 11, color: '#16a34a' }}>
								{fmt(0)}
							</Text>
						</View>
					</>
				)}
				{invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
					<>
						<View style={{ borderBottomWidth: 1, borderBottomColor: '#e5e5e5', marginTop: 6, marginBottom: 4 }} />
						<View style={styles.grandTotalRow}>
							<Text style={{ ...styles.grandTotalLabel, fontSize: 11 }}>Balance Due</Text>
							<Text style={{ ...styles.grandTotalValue, fontSize: 11 }}>
								{fmt(invoice.totalAmount)}
							</Text>
						</View>
					</>
				)}
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

function FooterSection() {
	return (
		<View style={styles.footer} fixed>
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
				<BillToSection invoice={invoice} />
				<LineItemsTable lineItems={invoice.lineItems} fmt={fmt} />
				<TotalsSection invoice={invoice} fmt={fmt} />
				{invoice.notes && <NotesSection notes={invoice.notes} />}
				<FooterSection />
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
