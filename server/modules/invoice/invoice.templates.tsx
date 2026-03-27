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
const TEAL = '#0D9488';
const GREEN = '#059669';
const RED = '#DC2626';
const GRAY_50 = '#F9FAFB';
const GRAY_100 = '#F3F4F6';
const GRAY_300 = '#D1D5DB';
const GRAY_500 = '#6B7280';
const GRAY_700 = '#374151';
const GRAY_900 = '#111827';

const styles = StyleSheet.create({
	page: {
		fontFamily: 'DM Sans',
		fontSize: 10,
		color: GRAY_900,
		paddingTop: 48,
		paddingBottom: 72,
		paddingHorizontal: 48,
		backgroundColor: '#FFFFFF',
	},
	// Header
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 32,
		borderBottomWidth: 2,
		borderBottomColor: TEAL,
		paddingBottom: 16,
	},
	headerTitle: {
		fontFamily: 'DM Serif Display',
		fontSize: 28,
		color: TEAL,
	},
	invoiceNumber: {
		fontFamily: 'DM Serif Display',
		fontSize: 16,
		color: GRAY_700,
		textAlign: 'right',
	},
	headerDates: {
		fontSize: 9,
		color: GRAY_500,
		textAlign: 'right',
		marginTop: 4,
	},
	// Status stamps
	statusStamp: {
		position: 'absolute',
		top: 60,
		right: 48,
		paddingHorizontal: 16,
		paddingVertical: 6,
		borderWidth: 3,
		borderRadius: 4,
		opacity: 0.7,
		transform: 'rotate(-15deg)',
	},
	statusStampText: {
		fontFamily: 'DM Serif Display',
		fontSize: 24,
		fontWeight: 700,
	},
	// Bill To section
	billTo: {
		marginBottom: 28,
		padding: 16,
		backgroundColor: GRAY_50,
		borderRadius: 4,
	},
	billToLabel: {
		fontSize: 8,
		fontWeight: 700,
		color: GRAY_500,
		textTransform: 'uppercase',
		letterSpacing: 1,
		marginBottom: 6,
	},
	clientName: {
		fontSize: 13,
		fontWeight: 700,
		color: GRAY_900,
		marginBottom: 2,
	},
	clientDetail: {
		fontSize: 9,
		color: GRAY_700,
		lineHeight: 1.5,
	},
	// Line items table
	table: {
		marginBottom: 24,
	},
	tableHeader: {
		flexDirection: 'row',
		backgroundColor: TEAL,
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 4,
	},
	tableHeaderText: {
		fontSize: 8,
		fontWeight: 700,
		color: '#FFFFFF',
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	tableRow: {
		flexDirection: 'row',
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderBottomWidth: 1,
		borderBottomColor: GRAY_100,
	},
	tableRowAlt: {
		backgroundColor: GRAY_50,
	},
	colNum: { width: 30 },
	colDesc: { flex: 1 },
	colQty: { width: 50, textAlign: 'right' },
	colPrice: { width: 80, textAlign: 'right' },
	colAmount: { width: 80, textAlign: 'right' },
	cellText: {
		fontSize: 9,
		color: GRAY_700,
	},
	cellTextBold: {
		fontSize: 9,
		fontWeight: 700,
		color: GRAY_900,
	},
	// Totals
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
		color: GRAY_500,
	},
	totalValue: {
		fontSize: 9,
		fontWeight: 500,
		color: GRAY_900,
	},
	totalDivider: {
		borderBottomWidth: 1,
		borderBottomColor: GRAY_300,
		marginVertical: 4,
	},
	grandTotalRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: 8,
		backgroundColor: TEAL,
		paddingHorizontal: 12,
		borderRadius: 4,
		marginTop: 4,
	},
	grandTotalLabel: {
		fontFamily: 'DM Serif Display',
		fontSize: 13,
		color: '#FFFFFF',
	},
	grandTotalValue: {
		fontFamily: 'DM Serif Display',
		fontSize: 13,
		color: '#FFFFFF',
	},
	// Notes
	notesSection: {
		padding: 12,
		backgroundColor: GRAY_50,
		borderLeftWidth: 3,
		borderLeftColor: TEAL,
		borderRadius: 4,
	},
	notesLabel: {
		fontSize: 8,
		fontWeight: 700,
		color: GRAY_500,
		textTransform: 'uppercase',
		letterSpacing: 1,
		marginBottom: 4,
	},
	notesText: {
		fontSize: 9,
		color: GRAY_700,
		lineHeight: 1.5,
	},
	// Footer
	footer: {
		position: 'absolute',
		bottom: 24,
		left: 48,
		right: 48,
		borderTopWidth: 1,
		borderTopColor: GRAY_300,
		paddingTop: 8,
	},
	footerRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	footerText: {
		fontSize: 7,
		color: GRAY_500,
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
			<View>
				<Text style={styles.headerTitle}>INVOICE</Text>
			</View>
			<View>
				<Text style={styles.invoiceNumber}>
					{invoice.invoiceNumber}
				</Text>
				<Text style={styles.headerDates}>
					Issue Date: {formatDate(invoice.issueDate)}
				</Text>
				<Text style={styles.headerDates}>
					Due Date: {formatDate(invoice.dueDate)}
				</Text>
			</View>
		</View>
	);
}

function StatusStamp({ status }: { status: string }) {
	if (status === 'PAID') {
		return (
			<View
				style={{
					...styles.statusStamp,
					borderColor: GREEN,
				}}
			>
				<Text style={{ ...styles.statusStampText, color: GREEN }}>
					PAID
				</Text>
			</View>
		);
	}

	if (status === 'OVERDUE') {
		return (
			<View
				style={{
					...styles.statusStamp,
					borderColor: RED,
				}}
			>
				<Text style={{ ...styles.statusStampText, color: RED }}>
					OVERDUE
				</Text>
			</View>
		);
	}

	return null;
}

function BillToSection({ invoice }: { invoice: InvoicePDFData }) {
	return (
		<View style={styles.billTo}>
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
					Qty
				</Text>
				<Text
					style={{ ...styles.tableHeaderText, ...styles.colPrice }}
				>
					Price
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
					<Text style={{ ...styles.cellText, ...styles.colPrice }}>
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
	const generatedDate = new Date().toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});

	return (
		<View style={styles.footer} fixed>
			<View style={styles.footerRow}>
				<Text style={styles.footerText}>
					{invoice.invoiceNumber} | {invoice.clientName}
				</Text>
				<Text
					style={styles.footerText}
					render={({ pageNumber, totalPages }) =>
						`Page ${pageNumber} of ${totalPages}`
					}
				/>
			</View>
			<Text style={{ ...styles.footerText, marginTop: 4 }}>
				Generated on {generatedDate}
			</Text>
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
				<HeaderSection invoice={invoice} />
				<StatusStamp status={invoice.status} />
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
