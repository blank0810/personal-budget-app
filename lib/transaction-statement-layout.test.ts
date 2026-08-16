import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TransactionStatement } from '@/components/modules/reports/TransactionStatement';
import type { TransactionStatement as TransactionStatementData } from '@/server/modules/report/report.types';

const statement: TransactionStatementData = {
	periodStart: new Date('2026-08-01T00:00:00.000Z'),
	periodEnd: new Date('2026-08-31T00:00:00.000Z'),
	openingBalance: 1200,
	closingBalance: 1350,
	totalIncome: 300,
	totalExpenses: 150,
	netChange: 150,
	transactions: [
		{
			id: 'transaction-1',
			date: new Date('2026-08-15T00:00:00.000Z'),
			description: 'Monthly groceries',
			categoryId: 'category-1',
			categoryName: 'Groceries',
			type: 'EXPENSE',
			amount: 150,
			budgetStatus: 'budgeted',
			budgetName: 'Household',
			runningBalance: 1350,
		},
	],
};

describe('TransactionStatement table layout', () => {
	it('uses one table for the header, transactions, and closing balance', () => {
		const markup = renderToStaticMarkup(
			createElement(TransactionStatement, {
				data: statement,
				accountName: 'All Accounts',
				userName: 'Demo User',
			}),
		);

		expect(markup.match(/<table\b/g)).toHaveLength(1);
		expect(markup).toContain('<thead');
		expect(markup).toContain('<tbody');
		expect(markup).toContain('<tfoot');
		expect(markup).toContain('Category');
		expect(markup).toContain('Budget Status');
		expect(markup).toContain('Closing Balance');
		expect(markup).toMatch(
			/<td[^>]*class="[^"]*text-left[^"]*"[^>]*><div[^>]*>Groceries<\/div><\/td>/,
		);
	});
});
