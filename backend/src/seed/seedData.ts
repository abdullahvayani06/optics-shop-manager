import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from '../config/database.js';

export function seedDatabase(force: boolean = false) {
  const profileCount = (db.prepare('SELECT COUNT(*) as count FROM profiles').get() as any)?.count || 0;
  if (profileCount > 0 && !force) {
    return;
  }

  console.log('Seeding database with realistic optics store data...');

  if (force) {
    db.exec(`
      DELETE FROM payments;
      DELETE FROM sale_items;
      DELETE FROM sales;
      DELETE FROM prescriptions;
      DELETE FROM products;
      DELETE FROM customers;
      DELETE FROM expenses;
      DELETE FROM investments;
      DELETE FROM user_roles;
      DELETE FROM profiles;
    `);
  }

  const now = new Date().toISOString();
  const today = now.substring(0, 10);

  // 1. Create Default Users (Owner and Staff)
  const ownerId = 'usr-owner-001';
  const staffId = 'usr-staff-001';
  const ownerHash = bcrypt.hashSync('Owner123!', 10);
  const staffHash = bcrypt.hashSync('Staff123!', 10);

  db.prepare(`
    INSERT INTO profiles (id, full_name, email, phone, password_hash, created_at, updated_at)
    VALUES 
      (?, 'Muhammad Haris (Owner)', 'owner@opticsshop.com', '+92 300 8472910', ?, ?, ?),
      (?, 'Zeeshan Ali (Optician Staff)', 'staff@opticsshop.com', '+92 321 4455667', ?, ?, ?)
  `).run(ownerId, ownerHash, now, now, staffId, staffHash, now, now);

  db.prepare(`
    INSERT INTO user_roles (id, user_id, role, created_at)
    VALUES 
      ('role-001', ?, 'owner', ?),
      ('role-002', ?, 'staff', ?)
  `).run(ownerId, now, staffId, now);

  // 2. Seed 10 Realistic Customers
  const customersData = [
    { id: 'cust-001', name: 'Ali Ahmed Khan', phone: '0300-8456123', email: 'ali.ahmed@gmail.com', address: 'House 42, Street 14, DHA Phase 5, Lahore', notes: 'Requires progressive lenses. Prefers lightweight titanium frames.' },
    { id: 'cust-002', name: 'Dr. Fatima Zahra', phone: '0321-9876543', email: 'dr.fatima@shifa.org', address: 'Apartment 3B, Silver Oaks, F-10, Islamabad', notes: 'Frequent screen user. Needs blue-cut anti-glare coating.' },
    { id: 'cust-003', name: 'Hamza Tariq', phone: '0333-5566778', email: 'hamza.tariq@outlook.com', address: 'Plot 105, Block C, Gulshan-e-Iqbal, Karachi', notes: 'Interested in sports sunglasses with prescription inserts.' },
    { id: 'cust-004', name: 'Ayesha Malik', phone: '0312-3344556', email: 'ayesha.m@yahoo.com', address: 'House 18, Lane 3, Cantt, Rawalpindi', notes: 'Prefers designer cat-eye sunglasses.' },
    { id: 'cust-005', name: 'Bilal Siddiqui', phone: '0345-2233445', email: 'bilal.s@fintech.pk', address: 'B-12, PECHS Block 6, Karachi', notes: 'High myopia (-6.50). Needs ultra-high index 1.67 or 1.74.' },
    { id: 'cust-006', name: 'Zainab Noor', phone: '0302-7788990', email: 'zainab.noor@hotmail.com', address: 'House 99, Cavalry Ground, Lahore Cantt', notes: 'Likes Ray-Ban clubmaster style.' },
    { id: 'cust-007', name: 'Usman Farooq', phone: '0322-1122334', email: 'usman.f@systemsltd.com', address: 'Sector G-11/2, Islamabad', notes: 'Requires polarized prescription sunglasses.' },
    { id: 'cust-008', name: 'Hira Shah', phone: '0334-9988776', email: 'hira.shah@gmail.com', address: 'Flat 401, Clifton Centre, Karachi', notes: 'Astigmatism in left eye. Prefers contact lenses & backup glasses.' },
    { id: 'cust-009', name: 'Omer Rasheed', phone: '0301-4455667', email: 'omer.r@agri.com.pk', address: 'Officers Colony, Faisalabad', notes: 'Bifocal lenses wearer for 10 years.' },
    { id: 'cust-010', name: 'Maryam Javed', phone: '0315-6677889', email: 'maryam.javed@edu.pk', address: 'Model Town Block J, Lahore', notes: 'College student, prefers trendy transparent acetate frames.' }
  ];

  const insertCust = db.prepare(`
    INSERT INTO customers (id, full_name, phone, email, address, notes, active, is_demo, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?, ?)
  `);

  for (const c of customersData) {
    insertCust.run(c.id, c.name, c.phone, c.email, c.address, c.notes, now, now);
  }

  // 3. Seed Prescriptions
  const prescriptionsData = [
    {
      id: 'presc-001',
      customer_id: 'cust-001',
      r_sph: '-2.25', r_cyl: '-0.75', r_axis: '180', r_add: '+1.75',
      l_sph: '-2.50', l_cyl: '-0.50', l_axis: '175', l_add: '+1.75',
      pd: '64', doctor: 'Dr. Tariq Mahmood (Amanat Eye Hospital)',
      date: '2026-08-15', remarks: 'Progressive corridor 14mm recommended.'
    },
    {
      id: 'presc-002',
      customer_id: 'cust-001',
      r_sph: '-2.00', r_cyl: '-0.50', r_axis: '180', r_add: '+1.50',
      l_sph: '-2.25', l_cyl: '-0.50', l_axis: '175', l_add: '+1.50',
      pd: '64', doctor: 'Dr. Tariq Mahmood',
      date: '2025-06-20', remarks: 'Previous baseline prescription.'
    },
    {
      id: 'presc-003',
      customer_id: 'cust-002',
      r_sph: '-1.50', r_cyl: '-0.25', r_axis: '90', r_add: null,
      l_sph: '-1.75', l_cyl: '-0.50', l_axis: '85', l_add: null,
      pd: '61', doctor: 'Dr. Asim Raza (LRBT Eye Hospital)',
      date: '2026-09-02', remarks: 'Computer vision syndrome symptoms. BlueControl essential.'
    },
    {
      id: 'presc-004',
      customer_id: 'cust-005',
      r_sph: '-6.25', r_cyl: '-1.25', r_axis: '15', r_add: null,
      l_sph: '-6.75', l_cyl: '-1.50', l_axis: '165', l_add: null,
      pd: '65', doctor: 'Prof. Dr. Niaz Brohi (Karachi)',
      date: '2026-08-28', remarks: 'High myopic astigmatism. Advised 1.74 super-thin index.'
    },
    {
      id: 'presc-005',
      customer_id: 'cust-008',
      r_sph: '-0.75', r_cyl: '-2.25', r_axis: '10', r_add: null,
      l_sph: '-1.00', l_cyl: '-2.00', l_axis: '170', l_add: null,
      pd: '60', doctor: 'Dr. Maryam Khalid (Hashmanis)',
      date: '2026-09-05', remarks: 'High cylinder. Ensure precise optical axis alignment.'
    }
  ];

  const insertPresc = db.prepare(`
    INSERT INTO prescriptions (
      id, customer_id, right_sphere, right_cylinder, right_axis, right_add,
      left_sphere, left_cylinder, left_axis, left_add, pupillary_distance,
      prescribing_doctor, test_date, remarks, is_demo, created_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  for (const p of prescriptionsData) {
    insertPresc.run(
      p.id, p.customer_id, p.r_sph, p.r_cyl, p.r_axis, p.r_add,
      p.l_sph, p.l_cyl, p.l_axis, p.l_add, p.pd,
      p.doctor, p.date, p.remarks, ownerId, now
    );
  }

  // 4. Seed Products (18 items across Frames, Lenses, Sunglasses, Accessories)
  const productsData = [
    // Frames
    { id: 'prod-001', type: 'Frame', brand: 'Ray-Ban', model: 'Aviator Optics RB6489', sku: 'RB-FRM-6489-GLD', desc: 'Classic gold wireframe aviator optical frame with adjustable silicone nose pads.', cost: 8500, selling: 16500, qty: 8, min: 3, supplier: 'Luxottica Middle East' },
    { id: 'prod-002', type: 'Frame', brand: 'Ray-Ban', model: 'Clubmaster Classic RB5154', sku: 'RB-FRM-5154-BLK', desc: 'Iconic browline retro optical frame in glossy black and polished gold.', cost: 9500, selling: 18500, qty: 6, min: 3, supplier: 'Luxottica Middle East' },
    { id: 'prod-003', type: 'Frame', brand: 'Silhouette', model: 'Titan Minimal Art TMA-5515', sku: 'SIL-FRM-5515-TIT', desc: 'Ultralight rimless Austrian titanium frame (under 3 grams). Unmatched comfort.', cost: 22000, selling: 42000, qty: 4, min: 2, supplier: 'Silhouette Eyewear Austria' },
    { id: 'prod-004', type: 'Frame', brand: 'Gucci', model: 'Rectangular Acetate GG0010O', sku: 'GUC-FRM-0010-HAV', desc: 'Bold Italian Havana acetate optical frame with signature green-red web temples.', cost: 18000, selling: 36000, qty: 3, min: 2, supplier: 'Kering Eyewear' },
    { id: 'prod-005', type: 'Frame', brand: 'Oakley', model: 'Socket 5.0 OX3217', sku: 'OAK-FRM-3217-SAT', desc: 'Satin black lightweight C-5 alloy sports optical frame with Unobtainium earsocks.', cost: 11000, selling: 21000, qty: 2, min: 3, supplier: 'Luxottica Middle East' }, // LOW STOCK!
    { id: 'prod-006', type: 'Frame', brand: 'Vogue Eyewear', model: 'Chic Cat-Eye VO5230', sku: 'VOG-FRM-5230-TOR', desc: 'Feminine modern tortoiseshell acetate optical frame.', cost: 5500, selling: 11500, qty: 10, min: 3, supplier: 'Luxottica Middle East' },

    // Lenses
    { id: 'prod-007', type: 'Lens', brand: 'Essilor', model: 'Crizal Sapphire HR 1.56 (Pair)', sku: 'ESS-LNS-CRZ-156', desc: 'Premium anti-reflective multi-coating with superior scratch, smudge, and UV protection.', cost: 4500, selling: 9500, qty: 25, min: 5, supplier: 'Essilor Pakistan' },
    { id: 'prod-008', type: 'Lens', brand: 'Essilor', model: 'Varilux Comfort Max Progressive 1.60', sku: 'ESS-LNS-VAR-160', desc: 'Advanced ergonomic progressive lenses offering wide viewing zones for presbyopes.', cost: 14000, selling: 28000, qty: 12, min: 4, supplier: 'Essilor Pakistan' },
    { id: 'prod-009', type: 'Lens', brand: 'Hoya', model: 'BlueControl Anti-Glare 1.61 Hi-Index', sku: 'HOY-LNS-BLU-161', desc: 'High-index thin digital blue-light filtering lenses for heavy computer screen use.', cost: 6000, selling: 13000, qty: 18, min: 5, supplier: 'Hoya Vision Care' },
    { id: 'prod-010', type: 'Lens', brand: 'Transitions', model: 'Gen S Photochromic Signature 1.56', sku: 'TRN-LNS-GENS-156', desc: 'Ultra-fast darkening indoor/outdoor adaptive lenses. Clears fast indoors.', cost: 7500, selling: 15500, qty: 1, min: 4, supplier: 'Transitions Optical' }, // LOW STOCK!
    { id: 'prod-011', type: 'Lens', brand: 'Zeiss', model: 'ClearView Single Vision 1.67 Super-Thin', sku: 'ZIS-LNS-CV-167', desc: 'Freeform optimized thin lenses for high diopter prescriptions with DuraVision Platinum.', cost: 12500, selling: 25000, qty: 8, min: 3, supplier: 'Carl Zeiss Vision' },

    // Sunglasses
    { id: 'prod-012', type: 'Sunglasses', brand: 'Ray-Ban', model: 'Original Wayfarer Classic RB2140', sku: 'RB-SUN-2140-BLK', desc: 'Timeless black acetate sunglasses with classic G-15 green mineral glass lenses.', cost: 11000, selling: 22500, qty: 7, min: 3, supplier: 'Luxottica Middle East' },
    { id: 'prod-013', type: 'Sunglasses', brand: 'Oakley', model: 'Holbrook Polarized OO9102', sku: 'OAK-SUN-9102-POL', desc: 'Matte black O Matter frame with Prizm Black Polarized high-contrast lenses.', cost: 13500, selling: 27000, qty: 5, min: 2, supplier: 'Luxottica Middle East' },
    { id: 'prod-014', type: 'Sunglasses', brand: 'Persol', model: '714 Folding Steve McQueen Edition', sku: 'PER-SUN-0714-HAV', desc: 'Legendary folding sunglasses handcrafted in Italy with patented Meflecto stem system.', cost: 26000, selling: 49500, qty: 2, min: 2, supplier: 'Luxottica Middle East' },
    { id: 'prod-015', type: 'Sunglasses', brand: 'Carrera', model: 'Champion Aviator Pilot', sku: 'CAR-SUN-CHAMP-WHT', desc: 'Distinctive teardrop silhouette sports sunglasses with gradient polycarbonate lenses.', cost: 7000, selling: 14500, qty: 9, min: 3, supplier: 'Safilo Group' },

    // Accessories
    { id: 'prod-016', type: 'Accessory', brand: 'VisionOptics', model: 'Microfiber Lens Cleaning & Spray Kit', sku: 'VO-ACC-CLNKIT-01', desc: 'Lint-free oversized microfiber cloth and 60ml anti-static lens cleaning solution.', cost: 350, selling: 950, qty: 65, min: 10, supplier: 'Local Optics Accessories' },
    { id: 'prod-017', type: 'Accessory', brand: 'Bausch + Lomb', model: 'Biotrue Multi-Purpose Solution 300ml', sku: 'BNL-ACC-BIO-300', desc: 'Contact lens cleaning, disinfecting, and protein removal solution inspired by biology of eyes.', cost: 1100, selling: 2100, qty: 22, min: 5, supplier: 'Bausch + Lomb Pakistan' },
    { id: 'prod-018', type: 'Accessory', brand: 'OpticsGuard', model: 'Hard Aluminum Clamshell Glasses Case', sku: 'OG-ACC-CASE-ALU', desc: 'Crushproof brushed aluminum protective eyewear case with soft velvet lining.', cost: 650, selling: 1500, qty: 3, min: 5, supplier: 'Local Optics Accessories' } // LOW STOCK!
  ];

  const insertProd = db.prepare(`
    INSERT INTO products (
      id, product_type, brand, model, sku, description,
      cost_price, selling_price, quantity, low_stock_threshold, supplier,
      active, is_demo, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)
  `);

  for (const pr of productsData) {
    insertProd.run(
      pr.id, pr.type, pr.brand, pr.model, pr.sku, pr.desc,
      pr.cost, pr.selling, pr.qty, pr.min, pr.supplier,
      now, now
    );
  }

  // 5. Seed Historical Sales, Sale Items, and Payments
  const salesData = [
    {
      id: 'sale-001',
      invoice: 'INV-2026-00001',
      customer_id: 'cust-001',
      date: '2026-09-01',
      items: [
        { product_id: 'prod-003', qty: 1, unit_price: 42000, discount: 2000, cost: 22000 }, // Silhouette TMA
        { product_id: 'prod-008', qty: 1, unit_price: 28000, discount: 0, cost: 14000 }      // Varilux Comfort Max
      ],
      discount: 2000,
      payments: [
        { amount: 35000, method: 'Bank Transfer', date: '2026-09-01', note: 'Advance transfer via Meezan Bank' },
        { amount: 31000, method: 'Cash', date: '2026-09-05', note: 'Final clearance on delivery' }
      ]
    },
    {
      id: 'sale-002',
      invoice: 'INV-2026-00002',
      customer_id: 'cust-002',
      date: '2026-09-03',
      items: [
        { product_id: 'prod-002', qty: 1, unit_price: 18500, discount: 500, cost: 9500 },  // RB Clubmaster
        { product_id: 'prod-009', qty: 1, unit_price: 13000, discount: 0, cost: 6000 },    // Hoya BlueControl
        { product_id: 'prod-016', qty: 1, unit_price: 950, discount: 0, cost: 350 }        // Cleaning Kit
      ],
      discount: 950,
      payments: [
        { amount: 31000, method: 'Easypaisa', date: '2026-09-03', note: 'Full payment via Easypaisa' }
      ]
    },
    {
      id: 'sale-003',
      invoice: 'INV-2026-00003',
      customer_id: 'cust-003',
      date: '2026-09-06',
      items: [
        { product_id: 'prod-013', qty: 1, unit_price: 27000, discount: 1000, cost: 13500 }, // Oakley Holbrook Polarized
        { product_id: 'prod-018', qty: 1, unit_price: 1500, discount: 0, cost: 650 }        // Hard Aluminum Case
      ],
      discount: 500,
      payments: [
        { amount: 15000, method: 'JazzCash', date: '2026-09-06', note: 'Partial deposit via JazzCash' }
        // Remaining 12,000 balance!
      ]
    },
    {
      id: 'sale-004',
      invoice: 'INV-2026-00004',
      customer_id: 'cust-005',
      date: '2026-09-08',
      items: [
        { product_id: 'prod-004', qty: 1, unit_price: 36000, discount: 1000, cost: 18000 }, // Gucci Acetate
        { product_id: 'prod-011', qty: 1, unit_price: 25000, discount: 0, cost: 12500 }     // Zeiss ClearView 1.67
      ],
      discount: 2000,
      payments: [
        { amount: 30000, method: 'Bank Transfer', date: '2026-09-08', note: 'Half advance paid' }
        // Remaining 28,000 balance!
      ]
    },
    {
      id: 'sale-005',
      invoice: 'INV-2026-00005',
      customer_id: 'cust-004',
      date: '2026-09-10',
      items: [
        { product_id: 'prod-006', qty: 1, unit_price: 11500, discount: 500, cost: 5500 },  // Vogue Cat-Eye
        { product_id: 'prod-007', qty: 1, unit_price: 9500, discount: 0, cost: 4500 }      // Crizal 1.56
      ],
      discount: 500,
      payments: [
        { amount: 20000, method: 'Cash', date: '2026-09-10', note: 'Full cash payment' }
      ]
    }
  ];

  const insertSale = db.prepare(`
    INSERT INTO sales (
      id, invoice_number, customer_id, sale_date,
      gross_total, discount, total, amount_paid, balance,
      payment_status, notes, is_demo, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
  `);

  const insertItem = db.prepare(`
    INSERT INTO sale_items (
      id, sale_id, product_id, quantity, unit_price, discount, subtotal, cost_price, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertPay = db.prepare(`
    INSERT INTO payments (
      id, sale_id, customer_id, amount, payment_method, payment_date, notes, created_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const s of salesData) {
    let gross = 0;
    const processedItems = s.items.map(item => {
      const subtotal = (item.unit_price * item.qty) - item.discount;
      gross += subtotal;
      return { ...item, subtotal };
    });

    const netTotal = gross - s.discount;
    const paidTotal = s.payments.reduce((sum, p) => sum + p.amount, 0);
    const balance = Math.max(0, netTotal - paidTotal);
    const status = balance <= 0 ? 'Paid' : (paidTotal > 0 ? 'Partial' : 'Unpaid');

    insertSale.run(
      s.id, s.invoice, s.customer_id, s.date,
      gross, s.discount, netTotal, paidTotal, balance,
      status, 'Standard order', ownerId, now, now
    );

    for (const item of processedItems) {
      insertItem.run(
        crypto.randomUUID(), s.id, item.product_id,
        item.qty, item.unit_price, item.discount, item.subtotal, item.cost,
        now
      );
    }

    for (const p of s.payments) {
      insertPay.run(
        crypto.randomUUID(), s.id, s.customer_id,
        p.amount, p.method, p.date, p.note,
        ownerId, now
      );
    }
  }

  // 6. Seed Operating Expenses
  const expensesData = [
    { cat: 'Rent', amt: 85000, desc: 'Showroom monthly rent - Gulberg Lahore', date: '2026-09-01', meth: 'Bank Transfer' },
    { cat: 'Electricity', amt: 28500, desc: 'LESCO commercial power bill for August', date: '2026-09-04', meth: 'Bank Transfer' },
    { cat: 'Salaries', amt: 75000, desc: 'Staff salaries for August (Optician & lab technician)', date: '2026-09-01', meth: 'Bank Transfer' },
    { cat: 'Internet', amt: 5500, desc: 'PTCL optical fiber broadband 100Mbps', date: '2026-09-05', meth: 'Easypaisa' },
    { cat: 'Advertising', amt: 18000, desc: 'Facebook & Instagram targeted advertising campaign', date: '2026-09-07', meth: 'Card' },
    { cat: 'Packaging', amt: 9500, desc: 'Branded optical bags, microfiber cloths, and gift boxes', date: '2026-09-08', meth: 'Cash' },
    { cat: 'Shipping', amt: 6200, desc: 'TCS & Trax courier charges for nationwide optical dispatch', date: '2026-09-10', meth: 'Cash' }
  ];

  const insertExp = db.prepare(`
    INSERT INTO expenses (id, category, amount, description, date, payment_method, is_demo, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  for (const e of expensesData) {
    insertExp.run(crypto.randomUUID(), e.cat, e.amt, e.desc, e.date, e.meth, ownerId, now);
  }

  // 7. Seed Capital Investments (Rule 7: Investments are NOT revenue!)
  const investmentsData = [
    { date: '2026-01-10', amt: 1200000, type: 'Initial Capital', desc: 'Shop establishment, interior fit-out, and initial eyewear inventory purchase', notes: 'Owner personal investment' },
    { date: '2026-05-15', amt: 350000, type: 'Additional Capital', desc: 'Imported computerized auto-refractometer and lens edger machine purchase', notes: 'Machinery acquisition capital' }
  ];

  const insertInv = db.prepare(`
    INSERT INTO investments (id, date, amount, investment_type, description, notes, is_demo, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  for (const inv of investmentsData) {
    insertInv.run(crypto.randomUUID(), inv.date, inv.amt, inv.type, inv.desc, inv.notes, ownerId, now);
  }

  // Mark all demo records in case they pre-existed migration
  db.exec(`
    UPDATE customers SET is_demo = 1 WHERE id LIKE 'cust-%';
    UPDATE prescriptions SET is_demo = 1 WHERE id LIKE 'presc-%';
    UPDATE products SET is_demo = 1 WHERE id LIKE 'prod-%';
    UPDATE sales SET is_demo = 1 WHERE id LIKE 'sale-%';
    UPDATE expenses SET is_demo = 1 WHERE date IN ('2026-09-01', '2026-09-04', '2026-09-05', '2026-09-07', '2026-09-08', '2026-09-10');
    UPDATE investments SET is_demo = 1 WHERE date IN ('2026-01-10', '2026-05-15');
  `);

  console.log('Database seeded successfully with Pakistani optics store demo data.');
}
