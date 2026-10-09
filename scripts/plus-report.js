#!/usr/bin/env node
/*
 * Reads the Help Now Plus price test back from Netlify Blobs (the "app-plus" store that
 * netlify/functions/plus-events.js writes) and prints, per product: caregivers who saw that
 * price, buyers, conversion, purchases by platform, and gross at the list price.
 *
 *   NETLIFY_SITE_ID=<site id> NETLIFY_AUTH_TOKEN=<personal access token> npm run plus:report
 *   npm run plus:report -- --test plus-price-2026-10   which test (default: PRICE_TEST_ID in utils/priceTest.ts)
 *   npm run plus:report -- --json                      the summary as JSON
 *   npm run plus:report -- --hash someone@example.com  the emailHash for one email, to find that
 *                                                      caregiver in RevenueCat or the login log
 *
 * Gross is at the US list price in the product id; store fees, tax and local prices are not
 * in it. RevenueCat has what was actually paid.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PRODUCTS = ['help_now_plus_27', 'help_now_plus_37', 'help_now_plus_47'];
const CONCURRENCY = 8;

function listPrice(product) {
  const match = /_(\d+)$/.exec(product);
  return match ? Number(match[1]) : 0;
}

function emailHashFor(email) {
  return crypto.createHash('sha256').update(String(email || '').trim().toLowerCase()).digest('hex').slice(0, 12);
}

function defaultTestId() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'utils', 'priceTest.ts'), 'utf8');
  const match = /PRICE_TEST_ID\s*=\s*'([^']+)'/.exec(source);
  if (!match) throw new Error('PRICE_TEST_ID not found in utils/priceTest.ts');
  return match[1];
}

function userOf(record) {
  return record.emailHash ? `e-${record.emailHash}` : `d-${record.deviceHash}`;
}

/** Per-product numbers from the assignment and purchase records. */
function summarize(assignments, purchases) {
  const rows = new Map(
    PRODUCTS.map((product) => [product, { product, listPrice: listPrice(product), saw: 0, buyers: new Set(), purchases: 0, platforms: {}, gross: 0 }]),
  );
  const row = (product) => {
    if (!rows.has(product)) {
      rows.set(product, { product, listPrice: listPrice(product), saw: 0, buyers: new Set(), purchases: 0, platforms: {}, gross: 0 });
    }
    return rows.get(product);
  };

  const assigned = new Map();
  for (const record of assignments) {
    row(record.product).saw += 1;
    assigned.set(userOf(record), record.product);
  }

  let withoutAssignment = 0;
  let otherProduct = 0;
  for (const record of purchases) {
    const r = row(record.product);
    r.purchases += 1;
    r.buyers.add(userOf(record));
    r.platforms[record.platform] = (r.platforms[record.platform] || 0) + 1;
    r.gross += r.listPrice;
    const product = assigned.get(userOf(record));
    if (!product) withoutAssignment += 1;
    else if (product !== record.product) otherProduct += 1;
  }

  const products = [...rows.values()].map((r) => ({
    product: r.product,
    listPrice: r.listPrice,
    saw: r.saw,
    buyers: r.buyers.size,
    conversion: r.saw ? r.buyers.size / r.saw : null,
    purchases: r.purchases,
    platforms: r.platforms,
    gross: r.gross,
  }));
  const total = products.reduce(
    (sum, r) => ({ saw: sum.saw + r.saw, buyers: sum.buyers + r.buyers, purchases: sum.purchases + r.purchases, gross: sum.gross + r.gross }),
    { saw: 0, buyers: 0, purchases: 0, gross: 0 },
  );
  return { products, total, notes: { withoutAssignment, otherProduct } };
}

function percent(value) {
  return value === null ? '-' : `${(value * 100).toFixed(1)}%`;
}

function formatReport(testId, summary, readAt) {
  const lines = [
    `Help Now Plus price test ${testId} (read ${readAt})`,
    '',
    'product             list   saw price   buyers   conversion   purchases (ios/android)   gross at list',
  ];
  const line = (name, list, r) => {
    const platforms = r.platforms ? `${r.platforms.ios || 0}/${r.platforms.android || 0}` : '';
    lines.push(
      `${name.padEnd(18)}  ${list.padStart(4)}   ${String(r.saw).padStart(9)}   ${String(r.buyers).padStart(6)}   ${percent(r.saw ? r.buyers / r.saw : null).padStart(10)}   ${`${r.purchases}${platforms ? ` (${platforms})` : ''}`.padEnd(23)}   $${r.gross}`,
    );
  };
  for (const r of summary.products) line(r.product, `$${r.listPrice}`, r);
  line('total', '', summary.total);
  lines.push('');
  if (summary.notes.withoutAssignment) lines.push(`Note: ${summary.notes.withoutAssignment} purchase(s) with no assignment record (the app could not send it).`);
  if (summary.notes.otherProduct) lines.push(`Note: ${summary.notes.otherProduct} purchase(s) of a product other than the one assigned.`);
  lines.push('Gross is at list price, before store fees and tax. RevenueCat has what was actually paid.');
  return lines.join('\n');
}

async function readRecords(store, prefix) {
  const { blobs } = await store.list({ prefix });
  const records = [];
  for (let i = 0; i < blobs.length; i += CONCURRENCY) {
    const batch = await Promise.all(blobs.slice(i, i + CONCURRENCY).map((blob) => store.get(blob.key, { type: 'json' })));
    records.push(...batch.filter(Boolean));
  }
  return records;
}

async function main(argv) {
  const hashAt = argv.indexOf('--hash');
  if (hashAt !== -1) {
    if (!argv[hashAt + 1]) throw new Error('--hash needs an email');
    console.log(emailHashFor(argv[hashAt + 1]));
    return;
  }

  const testAt = argv.indexOf('--test');
  const testId = testAt !== -1 && argv[testAt + 1] ? argv[testAt + 1] : defaultTestId();
  const siteID = process.env.NETLIFY_SITE_ID;
  const token = process.env.NETLIFY_AUTH_TOKEN;
  if (!siteID || !token) {
    throw new Error('Set NETLIFY_SITE_ID (Netlify: Site configuration > Site details) and NETLIFY_AUTH_TOKEN (a personal access token).');
  }

  const { getStore } = require('@netlify/blobs');
  const store = getStore({ name: 'app-plus', siteID, token });
  const [assignments, purchases] = await Promise.all([
    readRecords(store, `assignments/${testId}/`),
    readRecords(store, `purchases/${testId}/`),
  ]);
  const summary = summarize(assignments, purchases);
  if (argv.includes('--json')) {
    console.log(JSON.stringify({ test: testId, ...summary }, null, 2));
  } else {
    console.log(formatReport(testId, summary, new Date().toISOString()));
  }
}

if (require.main === module) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { summarize, formatReport, emailHashFor, listPrice };
