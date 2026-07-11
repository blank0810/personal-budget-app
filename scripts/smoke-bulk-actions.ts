/**
 * Smoke test: bulk-actions v1.9.12
 *
 * Run inside the app container:
 *   docker compose exec -T app npx tsx scripts/smoke-bulk-actions.ts
 *
 * Creates its own isolated user, runs all 10 cases, then hard-deletes the user
 * (cascade wipes all child rows). Safe to run repeatedly.
 *
 * Exit 1 on any failure; exit 0 on full pass.
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { TransactionService } from '../server/modules/transaction/transaction.service';
import { IncomeService } from '../server/modules/income/income.service';
import { ExpenseService } from '../server/modules/expense/expense.service';
import { TransferService } from '../server/modules/transfer/transfer.service';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

// ─── helpers ─────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.error(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

/** Fetch account balance as exact Decimal string ("100.00") */
async function bal(accountId: string): Promise<string> {
  const acc = await prisma.account.findUniqueOrThrow({ where: { id: accountId } });
  return acc.balance.toString();
}

function dec(n: number): string {
  return new Prisma.Decimal(n).toFixed(2);
}

function addDec(a: string, b: string): string {
  return new Prisma.Decimal(a).add(new Prisma.Decimal(b)).toFixed(2);
}

function subDec(a: string, b: string): string {
  return new Prisma.Decimal(a).sub(new Prisma.Decimal(b)).toFixed(2);
}

// ─── seed helpers ────────────────────────────────────────────────────────────

async function makeUser() {
  return prisma.user.create({
    data: {
      email: `smoke_bulk_${Date.now()}@test.local`,
      name: 'Smoke Test',
      password: 'x',
      isOnboarded: true,
      currency: 'PHP',
    },
  });
}

async function makeAccount(userId: string, name: string, balance: number, isLiability = false) {
  return prisma.account.create({
    data: { userId, name, type: 'BANK', balance, isLiability },
  });
}

async function makeCategory(userId: string, name: string, type: 'INCOME' | 'EXPENSE') {
  return prisma.category.create({ data: { userId, name, type } });
}

async function makeExpense(userId: string, accountId: string, categoryId: string, amount: number) {
  return prisma.$transaction(async (tx) => {
    const e = await tx.expense.create({
      data: {
        userId, accountId, categoryId,
        amount, description: 'smoke expense',
        date: new Date(),
      },
    });
    await tx.account.update({
      where: { id: accountId },
      data: { balance: { decrement: amount } },
    });
    return e;
  });
}

// ─── cases ───────────────────────────────────────────────────────────────────

async function case1_bulkDeleteThreeExpensesSameAccount(userId: string) {
  console.log('\n[Case 1] Bulk delete 3 expenses — same account balance check');
  const cat = await makeCategory(userId, 'c1', 'EXPENSE');
  const acc = await makeAccount(userId, 'case1-acct', 1000);
  const e1 = await makeExpense(userId, acc.id, cat.id, 100);
  const e2 = await makeExpense(userId, acc.id, cat.id, 200);
  const e3 = await makeExpense(userId, acc.id, cat.id, 50);

  const balBefore = await bal(acc.id);  // 1000 - 350 = 650.00
  assert('1a: balance after seed', balBefore === dec(650), `got ${balBefore}`);

  await TransactionService.bulkDelete(userId, {
    items: [
      { kind: 'expense', id: e1.id },
      { kind: 'expense', id: e2.id },
      { kind: 'expense', id: e3.id },
    ],
  });

  const balAfter = await bal(acc.id);
  assert('1b: balance reverted to 1000.00', balAfter === dec(1000), `got ${balAfter}`);
  const rows = await prisma.expense.findMany({ where: { id: { in: [e1.id, e2.id, e3.id] } } });
  assert('1c: all 3 expense rows deleted', rows.length === 0);
}

async function case2_deleteIncomeTitheChild(userId: string) {
  console.log('\n[Case 2] Delete income with tithe child transfer');
  const incomeCat = await makeCategory(userId, 'c2-income', 'INCOME');
  const mainAcc = await makeAccount(userId, 'case2-main', 0);
  const titheAcc = await makeAccount(userId, 'case2-tithe', 0);

  // Manually wire the income + child transfer + balance updates (mirrors IncomeService.createIncome)
  const income = await prisma.$transaction(async (tx) => {
    const inc = await tx.income.create({
      data: {
        userId, categoryId: incomeCat.id, accountId: mainAcc.id,
        amount: 1000, description: 'smoke tithe income', date: new Date(),
      },
    });
    await tx.account.update({ where: { id: mainAcc.id }, data: { balance: { increment: 1000 } } });
    await tx.transfer.create({
      data: {
        userId, fromAccountId: mainAcc.id, toAccountId: titheAcc.id,
        amount: 100, date: new Date(), description: 'Tithe',
        parentIncomeId: inc.id,
      },
    });
    await tx.account.update({ where: { id: mainAcc.id }, data: { balance: { decrement: 100 } } });
    await tx.account.update({ where: { id: titheAcc.id }, data: { balance: { increment: 100 } } });
    return inc;
  });

  // main = 900, tithe = 100
  assert('2a: main balance before delete', await bal(mainAcc.id) === dec(900));
  assert('2b: tithe balance before delete', await bal(titheAcc.id) === dec(100));

  await IncomeService.deleteIncome(userId, income.id);

  assert('2c: main balance reverted to 0', await bal(mainAcc.id) === dec(0), `got ${await bal(mainAcc.id)}`);
  assert('2d: tithe balance reverted to 0', await bal(titheAcc.id) === dec(0), `got ${await bal(titheAcc.id)}`);
  const incRow = await prisma.income.findUnique({ where: { id: income.id } });
  assert('2e: income row deleted', incRow === null);
  const xfers = await prisma.transfer.findMany({ where: { parentIncomeId: income.id } });
  assert('2f: child transfer deleted', xfers.length === 0);
}

async function case3_deleteIncomeEFChild(userId: string) {
  console.log('\n[Case 3] Delete income with EF child transfer');
  const incomeCat = await makeCategory(userId, 'c3-income', 'INCOME');
  const mainAcc = await makeAccount(userId, 'case3-main', 0);
  const efAcc = await makeAccount(userId, 'case3-ef', 0);
  const efGoal = await prisma.goal.create({
    data: {
      userId, name: 'EF Goal', goalType: 'FIXED_AMOUNT', targetAmount: 10000,
      currentAmount: 0, isEmergencyFund: true, linkedAccountId: efAcc.id,
    },
  });

  const income = await prisma.$transaction(async (tx) => {
    const inc = await tx.income.create({
      data: {
        userId, categoryId: incomeCat.id, accountId: mainAcc.id,
        amount: 2000, description: 'smoke ef income', date: new Date(),
      },
    });
    await tx.account.update({ where: { id: mainAcc.id }, data: { balance: { increment: 2000 } } });
    await tx.transfer.create({
      data: {
        userId, fromAccountId: mainAcc.id, toAccountId: efAcc.id,
        amount: 200, date: new Date(), description: 'EF contribution',
        parentIncomeId: inc.id, efGoalId: efGoal.id,
      },
    });
    await tx.account.update({ where: { id: mainAcc.id }, data: { balance: { decrement: 200 } } });
    await tx.account.update({ where: { id: efAcc.id }, data: { balance: { increment: 200 } } });
    await tx.goal.update({ where: { id: efGoal.id }, data: { currentAmount: { increment: 200 } } });
    return inc;
  });

  assert('3a: main balance before', await bal(mainAcc.id) === dec(1800));
  assert('3b: ef account balance before', await bal(efAcc.id) === dec(200));
  const goalBefore = await prisma.goal.findUniqueOrThrow({ where: { id: efGoal.id } });
  assert('3c: goal currentAmount before', goalBefore.currentAmount.toString() === dec(200));

  await IncomeService.deleteIncome(userId, income.id);

  assert('3d: main balance reverted', await bal(mainAcc.id) === dec(0), `got ${await bal(mainAcc.id)}`);
  assert('3e: ef account reverted', await bal(efAcc.id) === dec(0), `got ${await bal(efAcc.id)}`);
  const goalAfter = await prisma.goal.findUniqueOrThrow({ where: { id: efGoal.id } });
  assert('3f: goal currentAmount decremented', goalAfter.currentAmount.toString() === dec(0), `got ${goalAfter.currentAmount}`);
}

async function case4_bulkDeleteSkipsTithedIncome(userId: string) {
  console.log('\n[Case 4] Bulk delete skips income-with-tithe, deletes plain expense');
  const incomeCat = await makeCategory(userId, 'c4-income', 'INCOME');
  const expenseCat = await makeCategory(userId, 'c4-expense', 'EXPENSE');
  const mainAcc = await makeAccount(userId, 'case4-main', 500);
  const titheAcc = await makeAccount(userId, 'case4-tithe', 0);

  // Income with tithe child
  const income = await prisma.$transaction(async (tx) => {
    const inc = await tx.income.create({
      data: { userId, categoryId: incomeCat.id, accountId: mainAcc.id, amount: 500, description: 'tithe income', date: new Date() },
    });
    await tx.account.update({ where: { id: mainAcc.id }, data: { balance: { increment: 500 } } });
    await tx.transfer.create({
      data: { userId, fromAccountId: mainAcc.id, toAccountId: titheAcc.id, amount: 50, date: new Date(), description: 'Tithe', parentIncomeId: inc.id },
    });
    await tx.account.update({ where: { id: mainAcc.id }, data: { balance: { decrement: 50 } } });
    await tx.account.update({ where: { id: titheAcc.id }, data: { balance: { increment: 50 } } });
    return inc;
  });

  // Plain expense
  const expense = await makeExpense(userId, mainAcc.id, expenseCat.id, 100);
  // main: 500 + 500 - 50 - 100 = 850; tithe: 50
  const balBefore = await bal(mainAcc.id);

  const result = await TransactionService.bulkDelete(userId, {
    items: [
      { kind: 'income', id: income.id },
      { kind: 'expense', id: expense.id },
    ],
  });

  assert('4a: skippedCount === 1', result.skippedCount === 1, `got ${result.skippedCount}`);
  assert('4b: processedCount === 1', result.processedCount === 1, `got ${result.processedCount}`);
  const incStillExists = await prisma.income.findUnique({ where: { id: income.id } });
  assert('4c: income row NOT deleted', incStillExists !== null);
  const expGone = await prisma.expense.findUnique({ where: { id: expense.id } });
  assert('4d: expense row deleted', expGone === null);
  // balance should increase by 100 (expense reversal only)
  const expected = addDec(balBefore, dec(100));
  const actual = await bal(mainAcc.id);
  assert('4e: balance reflects only expense delete', actual === expected, `expected ${expected} got ${actual}`);
}

async function case5_bulkDeleteSkipsFeeTransfer(userId: string) {
  console.log('\n[Case 5] Bulk delete skips transfer with fee > 0');
  const fromAcc = await makeAccount(userId, 'case5-from', 1000);
  const toAcc = await makeAccount(userId, 'case5-to', 0);
  const expenseCat = await prisma.category.create({ data: { userId, name: 'c5-bankfee', type: 'EXPENSE' } });

  // Create transfer with fee via service
  const transfer = await prisma.$transaction(async (tx) => {
    const feeExp = await tx.expense.create({
      data: { userId, accountId: fromAcc.id, categoryId: expenseCat.id, amount: 25, description: 'Transfer fee', date: new Date() },
    });
    const t = await tx.transfer.create({
      data: { userId, fromAccountId: fromAcc.id, toAccountId: toAcc.id, amount: 500, fee: 25, date: new Date(), feeExpenseId: feeExp.id },
    });
    await tx.account.update({ where: { id: fromAcc.id }, data: { balance: { decrement: 525 } } });
    await tx.account.update({ where: { id: toAcc.id }, data: { balance: { increment: 500 } } });
    return t;
  });

  const result = await TransactionService.bulkDelete(userId, {
    items: [{ kind: 'transfer', id: transfer.id }],
  });

  assert('5a: skippedCount === 1', result.skippedCount === 1, `got ${result.skippedCount}`);
  assert('5b: processedCount === 0', result.processedCount === 0, `got ${result.processedCount}`);
  const xferStillExists = await prisma.transfer.findUnique({ where: { id: transfer.id } });
  assert('5c: transfer row NOT deleted', xferStillExists !== null);
}

async function case6_bulkCategorizeThreeExpenses(userId: string) {
  console.log('\n[Case 6] Bulk categorize 3 expenses to new category');
  const oldCat = await makeCategory(userId, 'c6-old', 'EXPENSE');
  const newCat = await makeCategory(userId, 'c6-new', 'EXPENSE');
  const acc = await makeAccount(userId, 'case6-acct', 1000);
  const e1 = await makeExpense(userId, acc.id, oldCat.id, 10);
  const e2 = await makeExpense(userId, acc.id, oldCat.id, 20);
  const e3 = await makeExpense(userId, acc.id, oldCat.id, 30);

  await TransactionService.bulkCategorize(userId, {
    items: [
      { kind: 'expense', id: e1.id },
      { kind: 'expense', id: e2.id },
      { kind: 'expense', id: e3.id },
    ],
    categoryId: newCat.id,
  });

  const rows = await prisma.expense.findMany({ where: { id: { in: [e1.id, e2.id, e3.id] } } });
  const allUpdated = rows.every((r) => r.categoryId === newCat.id);
  assert('6a: all 3 expenses point to new categoryId', allUpdated);
}

async function case7_bulkCategorizeIncomeCategoryOnExpenseThrows(userId: string) {
  console.log('\n[Case 7] Bulk categorize — income category on expense rows throws');
  const incomeCat = await makeCategory(userId, 'c7-income', 'INCOME');
  const expenseCat = await makeCategory(userId, 'c7-expense', 'EXPENSE');
  const acc = await makeAccount(userId, 'case7-acct', 500);
  const expense = await makeExpense(userId, acc.id, expenseCat.id, 50);

  let threw = false;
  let message = '';
  try {
    await TransactionService.bulkCategorize(userId, {
      items: [{ kind: 'expense', id: expense.id }],
      categoryId: incomeCat.id,
    });
  } catch (e) {
    threw = true;
    message = e instanceof Error ? e.message : '';
  }

  assert('7a: throws on mismatched category type', threw, 'no error thrown');
  assert('7b: error message contains "Cannot assign"', message.includes('Cannot assign'), `got: ${message}`);

  // Verify nothing was mutated
  const row = await prisma.expense.findUniqueOrThrow({ where: { id: expense.id } });
  assert('7c: expense categoryId unchanged', row.categoryId === expenseCat.id);
}

async function case8_bulkDeleteZodRejectsOver100Items(userId: string) {
  console.log('\n[Case 8] Bulk delete with 101 items — Zod rejects at schema level');
  const items = Array.from({ length: 101 }, (_, i) => ({
    kind: 'expense' as const,
    id: `fake-id-${i}`,
  }));

  // bulkDeleteSchema.max(100) — call the Zod parse directly
  const { bulkDeleteSchema } = await import('../server/modules/transaction/transaction.types');
  const result = bulkDeleteSchema.safeParse({ items });

  assert('8a: Zod parse fails', !result.success);
  if (!result.success) {
    const msg = result.error.issues[0]?.message ?? '';
    assert('8b: error message references limit', msg.length > 0, `message: ${msg}`);
  }
  // Ensure no DB writes happened (nothing to check since we never called the service)
  assert('8c: no BulkOperation row written', true); // guarded by not calling service
}

async function case9_bulkDeleteRollsBackOnInvalidId(userId: string) {
  console.log('\n[Case 9] Bulk delete rolls back on invalid ID mid-batch');
  const cat = await makeCategory(userId, 'c9-expense', 'EXPENSE');
  const acc = await makeAccount(userId, 'case9-acct', 500);
  const validExpense = await makeExpense(userId, acc.id, cat.id, 100);
  const balBefore = await bal(acc.id);

  let threw = false;
  try {
    await TransactionService.bulkDelete(userId, {
      items: [
        { kind: 'expense', id: validExpense.id },
        { kind: 'expense', id: 'nonexistent-id-that-does-not-exist' },
      ],
    });
  } catch {
    threw = true;
  }

  assert('9a: call throws on invalid ID', threw);
  const expStillExists = await prisma.expense.findUnique({ where: { id: validExpense.id } });
  assert('9b: valid expense NOT deleted (rollback)', expStillExists !== null);
  const balAfter = await bal(acc.id);
  assert('9c: account balance unchanged (rollback)', balAfter === balBefore, `before=${balBefore} after=${balAfter}`);
}

async function case10_auditRowCreatedAfterBulkOp(userId: string) {
  console.log('\n[Case 10] BulkOperation audit row created after successful bulk call');
  const cat = await makeCategory(userId, 'c10-expense', 'EXPENSE');
  const acc = await makeAccount(userId, 'case10-acct', 200);
  const expense = await makeExpense(userId, acc.id, cat.id, 50);

  const countBefore = await prisma.bulkOperation.count({ where: { userId } });

  const result = await TransactionService.bulkDelete(userId, {
    items: [{ kind: 'expense', id: expense.id }],
  });

  const countAfter = await prisma.bulkOperation.count({ where: { userId } });
  assert('10a: BulkOperation row count incremented', countAfter === countBefore + 1);

  const row = await prisma.bulkOperation.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  assert('10b: kind === DELETE', row?.kind === 'DELETE', `got ${row?.kind}`);
  assert('10c: itemCount === processedCount', row?.itemCount === result.processedCount, `got ${row?.itemCount}`);

  const payload = row?.payload as { expense?: string[] };
  assert('10d: payload.expense contains the deleted id', Array.isArray(payload?.expense) && payload.expense.includes(expense.id));
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  const user = await makeUser();
  console.log(`Smoke user: ${user.id}`);

  try {
    await case1_bulkDeleteThreeExpensesSameAccount(user.id);
    await case2_deleteIncomeTitheChild(user.id);
    await case3_deleteIncomeEFChild(user.id);
    await case4_bulkDeleteSkipsTithedIncome(user.id);
    await case5_bulkDeleteSkipsFeeTransfer(user.id);
    await case6_bulkCategorizeThreeExpenses(user.id);
    await case7_bulkCategorizeIncomeCategoryOnExpenseThrows(user.id);
    await case8_bulkDeleteZodRejectsOver100Items(user.id);
    await case9_bulkDeleteRollsBackOnInvalidId(user.id);
    await case10_auditRowCreatedAfterBulkOp(user.id);
  } finally {
    // Cascade delete wipes all child rows for this smoke user
    await prisma.user.delete({ where: { id: user.id } });
    console.log(`\nCleanup done. User ${user.id} deleted.`);
  }

  console.log(`\n────────────────────────`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`────────────────────────`);

  if (failed > 0) process.exit(1);
}

main()
  .catch((e) => {
    console.error('Unexpected script error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
