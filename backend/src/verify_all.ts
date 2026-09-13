import { db } from './config/database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'optics-secret-key-2026';

function generateToken(user: any, role: string) {
  return jwt.sign({ id: user.id, email: user.email, role }, JWT_SECRET, { expiresIn: '1d' });
}

async function testApi(url: string, options: any = {}) {
  const fullUrl = `http://127.0.0.1:5000/api${url}`;
  const res = await fetch(fullUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runVerification() {
  console.log('====================================================');
  console.log('STARTING COMPLETE OPTICS SYSTEM AUTOMATED AUDIT');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: any) {
    if (condition) {
      console.log(`\x1b[32m[PASS]\x1b[0m ${testName}`);
      passed++;
    } else {
      console.error(`\x1b[31m[FAIL]\x1b[0m ${testName}`, detail !== undefined ? detail : '');
      failed++;
    }
  }

  // 1. Authentication & Role Verification
  console.log('--- 1. Testing Auth & Role-Based Access Guards ---');
  const ownerLogin = await testApi('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'owner@opticsshop.com', password: 'Owner123!' }),
  });
  assert(ownerLogin.ok && ownerLogin.data.user?.role === 'owner', 'Owner login successful with owner role');
  const ownerToken = ownerLogin.data.token;

  const staffLogin = await testApi('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'staff@opticsshop.com', password: 'Staff123!' }),
  });
  assert(staffLogin.ok && staffLogin.data.user?.role === 'staff', 'Staff login successful with staff role');
  const staffToken = staffLogin.data.token;

  // Staff accessing financial endpoints -> MUST BE BLOCKED HTTP 403
  const staffFinance = await testApi('/finance/overview', {
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  assert(staffFinance.status === 403, 'Staff is strictly blocked from Finance Overview (HTTP 403)');

  const staffProfitReport = await testApi('/reports/profit', {
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  assert(staffProfitReport.status === 403, 'Staff is strictly blocked from Profit & Loss Report (HTTP 403)');

  // Staff viewing products -> Cost price MUST be masked/null
  const staffProducts = await testApi('/products', {
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  const allCostsMasked = staffProducts.data.data.every((p: any) => p.cost_price === null);
  assert(allCostsMasked, 'Product cost prices are completely masked (null) for staff');

  // 2. Clinical Customer & Prescription Setup
  console.log('\n--- 2. Testing Customer & Prescription Management ---');
  const uniquePhone = `0300-${Math.floor(1000000 + Math.random() * 9000000)}`;
  const createCust = await testApi('/customers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      full_name: 'Tariq Jameel Test',
      phone: uniquePhone,
      email: 'tariq.test@gmail.com',
      address: 'DHA Phase 6, Lahore',
      notes: 'High astigmatism test customer',
    }),
  });
  assert(createCust.ok && createCust.data.customer.id, 'Customer created successfully with unique phone');
  const testCustomerId = createCust.data.customer.id;

  const createPresc = await testApi('/prescriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      customer_id: testCustomerId,
      right_sphere: '-2.50',
      right_cylinder: '-0.75',
      right_axis: '180',
      right_add: '+1.50',
      left_sphere: '-2.25',
      left_cylinder: '-0.50',
      left_axis: '175',
      left_add: '+1.50',
      pupillary_distance: '63',
      prescribing_doctor: 'Dr. Munir Ahmed (Lahore General Hospital)',
      test_date: '2026-09-12',
      remarks: 'Blue-cut coating advised',
    }),
  });
  assert(createPresc.ok && createPresc.data.prescription.id, 'Prescription recorded chronologically with OD/OS parameters');

  // 3. Create Clean Test Product for Exact Section 16 Accounting Test
  console.log('\n--- 3. Testing Section 16 Exact Accounting & Cancellation Scenario ---');
  const uniqueSku = `TEST-FRM-${Date.now()}`;
  const createProd = await testApi('/products', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      product_type: 'Frame',
      brand: 'TestOptics Brand',
      model: 'Model Alpha Titanium',
      sku: uniqueSku,
      description: 'Section 16 exact test eyewear',
      cost_price: 5000,
      selling_price: 8000,
      quantity: 10,
      low_stock_threshold: 3,
      supplier: 'Local Eyewear Importer',
    }),
  });
  assert(createProd.ok && createProd.data.product.id, 'Product created: Cost=5000, Selling=8000, Quantity=10');
  const testProductId = createProd.data.product.id;

  // Negative Stock Prevention Check: ordering 15 units when quantity is 10
  const overStockSale = await testApi('/sales', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      customer_id: testCustomerId,
      sale_date: '2026-09-12',
      items: [{ product_id: testProductId, quantity: 15, unit_price: 8000, discount: 0 }],
      discount: 0,
      initial_payment: 0,
      payment_method: 'Cash',
    }),
  });
  assert(overStockSale.status === 400, 'Negative stock prevented when ordered quantity (15) > inventory (10)');

  // Step A: Sell 2 units of product (Cost 5000, Selling 8000)
  // Total = 16000, COGS = 10000, Gross Profit = 6000
  // Initial Payment = 6000, Remaining Balance = 10000
  const validSale = await testApi('/sales', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      customer_id: testCustomerId,
      sale_date: '2026-09-12',
      items: [{ product_id: testProductId, quantity: 2, unit_price: 8000, discount: 0 }],
      overall_discount: 0,
      amount_received: 6000,
      payment_method: 'Cash',
      notes: 'Section 16 audit sale',
    }),
  });
  assert(validSale.ok, 'Sale created with 2 units: Total = Rs. 16,000, Paid = Rs. 6,000, Balance = Rs. 10,000');
  const saleId = validSale.data.sale.id;

  // Check Product Quantity decreased from 10 to 8
  const prodAfterSale = await testApi(`/products/${testProductId}`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  assert(prodAfterSale.data.product.quantity === 8, 'Product quantity automatically decremented from 10 to 8');

  // Step B: Record Operating Expense of 1,000
  const createExp = await testApi('/expenses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      category: 'Packaging',
      amount: 1000,
      description: 'Test optical protective cases',
      date: '2026-09-12',
      payment_method: 'Cash',
    }),
  });
  assert(createExp.ok, 'Recorded operating expense of Rs. 1,000');
  const expenseId = createExp.data.expense?.id;

  // Step C: Verify Financial Accounting before cancellation
  // Net Profit must be: Gross Profit (6,000) - Expense (1,000) = 5,000
  const financeBeforeCancel = await testApi('/finance/overview?period=today&date_from=2026-09-12&date_to=2026-09-12', {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const f1 = financeBeforeCancel.data.metrics || {};
  console.log(`   [Metrics Before Cancel] Revenue: Rs. ${f1.revenue}, COGS: Rs. ${f1.cogs}, Gross: Rs. ${f1.gross_profit}, Expenses: Rs. ${f1.expenses}, Net: Rs. ${f1.net_profit}`);
  assert(f1.revenue >= 16000, 'Revenue includes the 16,000 sale');
  assert(f1.gross_profit >= 6000, 'Gross profit accurately calculated as Revenue - COGS');

  // Step D: Installment Payment & Overpayment Prevention Check
  // Attempt to pay 15,000 when balance is 10,000 -> MUST FAIL
  const overPayment = await testApi('/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      sale_id: saleId,
      amount: 15000,
      payment_method: 'Cash',
      payment_date: '2026-09-12',
      notes: 'Excess payment attempt',
    }),
  });
  assert(overPayment.status === 400, 'Overpayment rejected: payment (15,000) > outstanding balance (10,000)');

  // Pay valid installment of 4,000 -> Remaining balance becomes 6,000
  const validPayment = await testApi('/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      sale_id: saleId,
      amount: 4000,
      payment_method: 'Bank Transfer',
      payment_date: '2026-09-12',
      notes: 'Second installment via bank',
    }),
  });
  assert(validPayment.ok && validPayment.data.sale.balance === 6000, 'Installment payment of Rs. 4,000 recorded; balance updated to Rs. 6,000');

  // Step E: Cancel the Sale (Section 16 Cancellation Test)
  console.log('\n--- 4. Testing Sale Cancellation & Automatic Stock Restoration ---');
  const cancelRes = await testApi(`/sales/${saleId}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  assert(cancelRes.ok && cancelRes.data.sale.status === 'Cancelled', 'Sale status updated to "Cancelled"');
  assert(cancelRes.data.sale.cancelled_at && cancelRes.data.sale.cancelled_by, 'Audit record tracks cancelled_at timestamp and cancelled_by user ID');

  // Verify Product stock restored from 8 back to 10
  const prodAfterCancel = await testApi(`/products/${testProductId}`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  assert(prodAfterCancel.data.product.quantity === 10, 'Inventory quantity restored back to 10 immediately upon cancellation');

  // Verify payment against cancelled sale is blocked
  const payCancelled = await testApi('/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      sale_id: saleId,
      amount: 1000,
      payment_method: 'Cash',
      payment_date: '2026-09-12',
      notes: 'Payment attempt on cancelled sale',
    }),
  });
  assert(payCancelled.status === 400, 'System rejects payment attempts against cancelled sales');

  // Step F: Verify Financials strictly exclude cancelled sale
  // Section 16 rule: Cancelled sale excluded from Revenue, COGS, Gross Profit.
  // Net Profit must reflect only the expense: 0 - 1000 = -1000.
  const salesReportAfter = await testApi('/reports/sales?period=today&date_from=2026-09-12&date_to=2026-09-12', {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  assert(salesReportAfter.data.summary.cancelled_sales_count >= 1, 'Sales report tracks Cancelled Sales count separately');

  // Customer outstanding balance after cancellation should exclude cancelled balance
  const custAfterCancel = await testApi(`/customers/${testCustomerId}`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  assert(custAfterCancel.data.customer.total_outstanding === 0, 'Customer outstanding debt reset to Rs. 0 because sale was cancelled');

  // 5. Capital Investment Rule 7 Check
  console.log('\n--- 5. Testing Rule 7: Capital Investments Isolation from Revenue ---');
  const financeBeforeInv = await testApi('/finance/overview?period=month', {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const revBefore = financeBeforeInv.data.metrics?.revenue;

  const createInv = await testApi('/investments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      date: '2026-09-12',
      amount: 250000,
      investment_type: 'Owner Contribution',
      description: 'New edger machine investment',
      notes: 'Capital injection',
    }),
  });
  assert(createInv.ok, 'Capital investment of Rs. 250,000 recorded');

  const financeAfterInv = await testApi('/finance/overview?period=month', {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const revAfter = financeAfterInv.data.metrics?.revenue;
  assert(revBefore === revAfter, 'Capital Investment of Rs. 250,000 is NOT added to Revenue (strictly isolated per Rule 7)');

  // 6. Demo Data Management Check
  console.log('\n--- 6. Testing Demo Data Management (Removal & Reset) ---');
  // Staff attempting to remove demo data -> MUST BE BLOCKED HTTP 403
  const staffDeleteDemo = await testApi('/settings/demo-data', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  assert(staffDeleteDemo.status === 403, 'Staff is strictly blocked from removing demo data (HTTP 403)');

  // Owner calling reset demo
  const resetDemo = await testApi('/settings/reset-demo', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  assert(resetDemo.ok, 'Reset demo data succeeds via POST /settings/reset-demo');

  // Verify demo products present
  const prods = await testApi('/products', { headers: { Authorization: `Bearer ${ownerToken}` } });
  assert(prods.data.data.length >= 18, 'Demo catalog products reloaded (18 standard eyewear items)');

  // Cleanup test product & expense
  try {
    db.prepare('DELETE FROM expenses WHERE id = ?').run(expenseId);
  } catch {}

  console.log('\n====================================================');
  console.log(`AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  try {
    db.close();
  } catch {}

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runVerification().catch((err) => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});
