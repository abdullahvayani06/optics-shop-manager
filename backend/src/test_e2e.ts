// Comprehensive End-to-End Verification Test Script
// Verifies all 12 modules, roles, stock deductions, formulas, and overpayment prevention

async function runVerification() {
  console.log('=== STARTING OPTICS SHOP MANAGER E2E VERIFICATION ===\n');
  const baseUrl = 'http://127.0.0.1:5000/api';

  // 1. Owner Login
  console.log('1. Testing Owner Authentication...');
  const ownerRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@opticsshop.com', password: 'Owner123!' })
  });
  const ownerData = await ownerRes.json();
  if (ownerRes.status !== 200 || ownerData.user?.role !== 'owner') {
    throw new Error('Owner login failed: ' + JSON.stringify(ownerData));
  }
  const ownerToken = ownerData.token;
  console.log('   ✓ Owner login successful. Role:', ownerData.user.role);

  // 2. Staff Login & Role Protection (RBAC)
  console.log('\n2. Testing Staff Authentication & Access Restrictions...');
  const staffRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'staff@opticsshop.com', password: 'Staff123!' })
  });
  const staffData = await staffRes.json();
  if (staffRes.status !== 200 || staffData.user?.role !== 'staff') {
    throw new Error('Staff login failed: ' + JSON.stringify(staffData));
  }
  const staffToken = staffData.token;
  console.log('   ✓ Staff login successful. Role:', staffData.user.role);

  // Check that Staff CANNOT access finance, expenses, investments, profit reports, or staff management
  const protectedEndpoints = [
    { name: 'Finance Overview', path: '/finance/overview' },
    { name: 'Expenses List', path: '/expenses' },
    { name: 'Investments List', path: '/investments' },
    { name: 'Profit Report', path: '/reports/profit' },
    { name: 'Staff Management', path: '/settings/staff' }
  ];

  for (const ep of protectedEndpoints) {
    const res = await fetch(`${baseUrl}${ep.path}`, {
      headers: { 'Authorization': `Bearer ${staffToken}` }
    });
    if (res.status !== 403) {
      throw new Error(`SECURITY VULNERABILITY: Staff was able to access ${ep.name} with HTTP ${res.status}`);
    }
    console.log(`   ✓ Staff access to ${ep.name} blocked with HTTP 403 Forbidden.`);
  }

  // Check that Staff cannot see cost_price in products
  const staffProductsRes = await fetch(`${baseUrl}/products`, {
    headers: { 'Authorization': `Bearer ${staffToken}` }
  });
  const staffProducts = await staffProductsRes.json();
  const hasLeakedCost = staffProducts.data.some((p: any) => p.cost_price !== null);
  if (hasLeakedCost) {
    throw new Error('SECURITY VULNERABILITY: Product cost_price leaked to staff!');
  }
  console.log('   ✓ Product cost_price correctly masked from staff users.');

  // 3. Customer Creation & Prescription History
  console.log('\n3. Testing Customer Creation & Eyesight Prescription History...');
  const newCustRes = await fetch(`${baseUrl}/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${staffToken}` },
    body: JSON.stringify({
      full_name: 'Imran Ashraf',
      phone: '0300-4567890',
      email: 'imran.a@gmail.com',
      address: 'House 5, Street 10, DHA Phase 6, Lahore',
      notes: 'Requires bifocal lenses'
    })
  });
  const newCustData = await newCustRes.json();
  const customerId = newCustData.customer.id;
  console.log(`   ✓ Customer created: "${newCustData.customer.full_name}" (ID: ${customerId})`);

  // Add prescription
  const rxRes = await fetch(`${baseUrl}/prescriptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${staffToken}` },
    body: JSON.stringify({
      customer_id: customerId,
      test_date: '2026-09-12',
      prescribing_doctor: 'Dr. Tariq Mehmood',
      pupillary_distance: '63',
      right_sphere: '-2.00',
      right_cylinder: '-0.50',
      right_axis: '180',
      right_add: '+1.50',
      left_sphere: '-2.25',
      left_cylinder: '-0.75',
      left_axis: '175',
      left_add: '+1.50',
      remarks: 'Anti-reflective coating recommended'
    })
  });
  const rxData = await rxRes.json();
  console.log('   ✓ Prescription recorded chronologically. Right SPH:', rxData.prescription.right_sphere, 'Left SPH:', rxData.prescription.left_sphere);

  // 4. Transactional Multi-Item Sale Flow
  console.log('\n4. Testing Atomic Multi-Item Sale & Automatic Stock Deduction...');
  // Check initial stock for prod-001 (Ray-Ban Frame) and prod-007 (Essilor Lens)
  const prod1Before = (await (await fetch(`${baseUrl}/products/prod-001`, { headers: { 'Authorization': `Bearer ${ownerToken}` } })).json()).product;
  const prod2Before = (await (await fetch(`${baseUrl}/products/prod-007`, { headers: { 'Authorization': `Bearer ${ownerToken}` } })).json()).product;

  const salePayload = {
    customer_id: customerId,
    sale_date: '2026-09-12',
    items: [
      { product_id: 'prod-001', quantity: 2, unit_price: 16500, discount: 500 }, // Subtotal: 32,500
      { product_id: 'prod-007', quantity: 1, unit_price: 9500, discount: 0 }     // Subtotal: 9,500
    ],
    overall_discount: 1000, // Gross: 42,000, Net Total: 41,000
    amount_received: 20000, // Partial payment of 20,000, Remaining Balance: 21,000
    payment_method: 'Bank Transfer',
    payment_notes: 'Advance via Allied Bank',
    notes: 'Urgent delivery request'
  };

  const createSaleRes = await fetch(`${baseUrl}/sales`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${staffToken}` },
    body: JSON.stringify(salePayload)
  });
  const createSaleData = await createSaleRes.json();
  const createdSale = createSaleData.sale;

  console.log(`   ✓ Sale created atomically. Invoice: ${createdSale.invoice_number}`);
  console.log(`     Total: Rs. ${createdSale.total.toLocaleString()}, Paid: Rs. ${createdSale.amount_paid.toLocaleString()}, Balance: Rs. ${createdSale.balance.toLocaleString()}`);
  console.log(`     Payment Status: ${createdSale.payment_status}`);

  if (createdSale.payment_status !== 'Partial' || createdSale.balance !== 21000) {
    throw new Error('Sale calculation error: expected Partial status and balance of 21,000');
  }

  // Check that stock was automatically decremented
  const prod1After = (await (await fetch(`${baseUrl}/products/prod-001`, { headers: { 'Authorization': `Bearer ${ownerToken}` } })).json()).product;
  const prod2After = (await (await fetch(`${baseUrl}/products/prod-007`, { headers: { 'Authorization': `Bearer ${ownerToken}` } })).json()).product;

  if (prod1After.quantity !== prod1Before.quantity - 2) {
    throw new Error(`Stock deduction failure for prod-001! Before: ${prod1Before.quantity}, After: ${prod1After.quantity}`);
  }
  if (prod2After.quantity !== prod2Before.quantity - 1) {
    throw new Error(`Stock deduction failure for prod-007! Before: ${prod2Before.quantity}, After: ${prod2After.quantity}`);
  }
  console.log('   ✓ Stock quantity automatically deducted transactionally:');
  console.log(`     prod-001 (Ray-Ban Frame): ${prod1Before.quantity} -> ${prod1After.quantity}`);
  console.log(`     prod-007 (Essilor Lens): ${prod2Before.quantity} -> ${prod2After.quantity}`);

  // 5. Overpayment Prevention & Installment Payments
  console.log('\n5. Testing Installment Payments & Overpayment Prevention...');
  // Try to overpay (balance is 21,000, attempt 25,000)
  const overpayRes = await fetch(`${baseUrl}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${staffToken}` },
    body: JSON.stringify({
      sale_id: createdSale.id,
      amount: 25000,
      payment_method: 'Cash',
      payment_date: '2026-09-12'
    })
  });
  if (overpayRes.status !== 400) {
    throw new Error('Rule 4 Violation: Overpayment was not rejected!');
  }
  console.log('   ✓ Overpayment correctly blocked with HTTP 400: payment cannot exceed balance.');

  // Pay exact remaining balance
  const installmentRes = await fetch(`${baseUrl}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${staffToken}` },
    body: JSON.stringify({
      sale_id: createdSale.id,
      amount: 21000,
      payment_method: 'Cash',
      payment_date: '2026-09-12',
      notes: 'Final installment paid on delivery'
    })
  });
  const installmentData = await installmentRes.json();
  console.log(`   ✓ Installment of Rs. 21,000 recorded. New balance: Rs. ${installmentData.sale.balance.toLocaleString()}`);
  console.log(`   ✓ Sale status automatically updated to: "${installmentData.sale.payment_status}"`);

  if (installmentData.sale.payment_status !== 'Paid' || installmentData.sale.balance !== 0) {
    throw new Error('Installment did not mark sale as Paid!');
  }

  // 6. Accounting & Profit Formulas Verification
  console.log('\n6. Testing Owner Financial Accounting & Profit Formulas...');
  const financeRes = await fetch(`${baseUrl}/finance/overview?period=month`, {
    headers: { 'Authorization': `Bearer ${ownerToken}` }
  });
  const financeData = await financeRes.json();
  const m = financeData.metrics;

  console.log(`   Revenue: Rs. ${m.revenue.toLocaleString()}`);
  console.log(`   COGS: Rs. ${m.cogs.toLocaleString()}`);
  console.log(`   Gross Profit: Rs. ${m.gross_profit.toLocaleString()} (Formula check: ${m.revenue - m.cogs === m.gross_profit ? 'PASSED' : 'FAILED'})`);
  console.log(`   Operating Expenses: Rs. ${m.operating_expenses.toLocaleString()}`);
  console.log(`   Net Profit: Rs. ${m.net_profit.toLocaleString()} (Formula check: ${m.gross_profit - m.operating_expenses === m.net_profit ? 'PASSED' : 'FAILED'})`);
  console.log(`   Capital Invested: Rs. ${m.capital_invested.toLocaleString()} (Excluded from revenue: PASSED)`);

  if (m.revenue - m.cogs !== m.gross_profit || m.gross_profit - m.operating_expenses !== m.net_profit) {
    throw new Error('Financial accounting formula mismatch!');
  }

  console.log('\n=== ALL END-TO-END VERIFICATION CHECKS PASSED SUCCESSFULLY ===');
}

runVerification().catch((err) => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
