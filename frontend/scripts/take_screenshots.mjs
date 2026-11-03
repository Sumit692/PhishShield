import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const outDir = path.resolve('..', 'screenshots');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function capture() {
  const browser = await chromium.launch({ channel: 'msedge' });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  // 1. Landing Page
  console.log('Capturing Landing Page...');
  await page.goto('http://localhost:5173/');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: path.join(outDir, '01_landing_page.png'), fullPage: true });

  // 2. Analyze Page (Initial)
  console.log('Capturing Analyze Page Initial...');
  await page.goto('http://localhost:5173/analyze');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: path.join(outDir, '02_analyze_initial.png'), fullPage: true });

  // 3. Analyze Page (Evaluated Result)
  console.log('Capturing Analyze Page Result...');
  const input = page.getByLabel(/Destination URL/i);
  await input.fill('http://192.168.1.105:8080/paypal.com/webscr.php?cmd=_login');
  await page.getByRole('button', { name: /Run Analysis/i }).click();
  await page.waitForSelector('text=High Risk', { timeout: 10000 });
  await page.waitForTimeout(1000); // Wait for Arc Gauge sweep animation
  await page.screenshot({ path: path.join(outDir, '03_analyze_result.png'), fullPage: true });

  // 4. Login Page
  console.log('Capturing Login Page...');
  await page.goto('http://localhost:5173/login');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: path.join(outDir, '04_login_page.png'), fullPage: true });

  // 5. Admin Dashboard
  console.log('Capturing Admin Dashboard...');
  await page.getByLabel(/Email address/i).fill('admin@phishshield.local');
  await page.locator('input[type="password"]').fill('AdminShield2026!');
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL('**/analyze');

  await page.goto('http://localhost:5173/admin');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000); // Wait for AnimatedCounter & Progress animations
  await page.screenshot({ path: path.join(outDir, '05_admin_dashboard.png'), fullPage: true });

  // 6. Dark Mode: Admin Dashboard
  console.log('Capturing Admin Dashboard Dark...');
  const themeBtn = page.getByRole('button', { name: /switch to/i });
  await themeBtn.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(outDir, '06_admin_dashboard_dark.png'), fullPage: true });

  // 7. Dark Mode: Analyze Result
  console.log('Capturing Analyze Result Dark...');
  await page.goto('http://localhost:5173/analyze');
  const inputDark = page.getByLabel(/Destination URL/i);
  await inputDark.fill('http://192.168.1.105:8080/paypal.com/webscr.php?cmd=_login');
  await page.getByRole('button', { name: /Run Analysis/i }).click();
  await page.waitForSelector('text=High Risk', { timeout: 10000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '07_analyze_result_dark.png'), fullPage: true });

  // 8. Dark Mode: Landing Page
  console.log('Capturing Landing Page Dark...');
  await page.goto('http://localhost:5173/');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: path.join(outDir, '08_landing_dark.png'), fullPage: true });

  await browser.close();
  console.log('Screenshots captured successfully in:', outDir);
}

capture().catch((err) => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
