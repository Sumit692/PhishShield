import { test, expect } from '@playwright/test';

test.describe('PhishShield End-to-End Application Workflows', () => {
  test('1. Landing page loads with proper document title, hero input, and sample chips', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/');
    await expect(page).toHaveTitle(/PhishShield/);
    await expect(page.locator('h1')).toContainText('Know what is hiding behind a link.');
    await expect(page.getByRole('button', { name: 'Analyze URL' })).toBeVisible();

    // Verify samples are clickable
    const sampleBtn = page.getByRole('button', { name: /Raw IP Host Phish/i });
    await expect(sampleBtn).toBeVisible();

    expect(consoleErrors.filter((e) => !e.includes('favicon'))).toHaveLength(0);
  });

  test('2. Anonymous URL analysis displays score, classification, and indicators', async ({ page }) => {
    await page.goto('/analyze');
    await expect(page).toHaveTitle(/Analyze a URL/);

    // Enter a suspicious link
    const input = page.getByLabel(/Destination URL/i);
    await input.fill('http://192.168.1.105:8080/paypal.com/webscr.php?cmd=_login');
    await page.getByRole('button', { name: /Run Analysis/i }).click();

    // Results area checks
    await expect(page.getByText('High Risk').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Direct IP Address Host' })).toBeVisible();
    await expect(page.locator('text=/ 100')).toBeVisible();
    await expect(page.locator('text=Guest mode')).toBeVisible();
  });

  test('3. Invalid input produces inline validation error', async ({ page }) => {
    await page.goto('/analyze');
    const input = page.getByLabel(/Destination URL/i);
    await input.fill('javascript:alert(1)');
    await page.getByRole('button', { name: /Run Analysis/i }).click();

    await expect(page.locator('text=Unsupported scheme')).toBeVisible();
  });

  test('4. User registration, authenticated analysis persistence, and history display', async ({ page }) => {
    const uniqueEmail = `student_${Date.now()}@example.com`;

    await page.goto('/register');
    await expect(page).toHaveTitle(/Create Account/);

    await page.getByLabel(/Full name/i).fill('Student Researcher');
    await page.getByLabel(/^Email address/i).fill(uniqueEmail);
    await page.getByLabel(/^Password/i).fill('SecureTest2026!');
    await page.getByLabel(/Confirm password/i).fill('SecureTest2026!');

    await page.getByRole('button', { name: /Register Account/i }).click();

    // After registration, user is redirected to /analyze
    await expect(page).toHaveURL(/\/analyze/);

    // Run an analysis while authenticated
    const input = page.getByLabel(/Destination URL/i);
    await input.fill('https://www.google.com/search?q=cybersecurity+exhibition');
    await page.getByRole('button', { name: /Run Analysis/i }).click();

    // Should indicate it was saved to history
    await expect(page.locator('text=Saved to your detection history')).toBeVisible({ timeout: 10000 });

    // Navigate to history
    await page.goto('/history');
    await expect(page).toHaveTitle(/Detection History/);
    await expect(page.locator('text=google.com')).toBeVisible();
  });

  test('5. Non-admin user cannot access admin dashboard', async ({ page }) => {
    // Normal registration
    const regularEmail = `user_${Date.now()}@test.org`;
    await page.goto('/register');
    await page.getByLabel(/Full name/i).fill('Regular User');
    await page.getByLabel(/^Email address/i).fill(regularEmail);
    await page.locator('input[autocomplete="new-password"]').first().fill('RegularPass123!');
    await page.locator('input[autocomplete="new-password"]').last().fill('RegularPass123!');
    await page.getByRole('button', { name: /Register Account/i }).click();

    // Ensure registration and session are finalized
    await expect(page).toHaveURL(/\/analyze/);

    // Attempt to access /admin
    await page.goto('/admin');
    // Should be redirected to 403 Forbidden page
    await expect(page).toHaveTitle(/Access Denied/);
    await expect(page.locator('h1')).toContainText('Access Denied');
  });

  test('6. Administrator login and admin dashboard access', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/Sign In/);

    await page.getByLabel(/Email address/i).fill('admin@phishshield.local');
    await page.locator('input[type="password"]').fill('AdminShield2026!');
    await page.locator('form button[type="submit"]').click();

    // Wait for login redirect
    await expect(page).toHaveURL(/\/analyze/);

    // Go to admin dashboard
    await page.goto('/admin');
    await expect(page).toHaveTitle(/Administrator Dashboard/);
    await expect(page.locator('text=Total Users')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Classification Distribution' })).toBeVisible();
  });

  test('7. Unknown route displays designed 404 page', async ({ page }) => {
    await page.goto('/some-nonexistent-route-404');
    await expect(page).toHaveTitle(/Page Not Found/);
    await expect(page.locator('text=404')).toBeVisible();
    await expect(page.getByRole('button', { name: /Return Home/i })).toBeVisible();
  });

  test('8. Mobile responsive viewport displays properly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Mobile menu toggle should be visible
    const menuBtn = page.getByRole('button', { name: /menu/i });
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();

    await expect(page.getByRole('link', { name: /Analyze URL/i })).toBeVisible();
  });

  test('9. Quishing Scanner page loads and evaluates sample QR code', async ({ page }) => {
    await page.goto('/quishing');
    await expect(page).toHaveTitle(/QR Code Scanner/);
    await expect(page.locator('h1')).toContainText('Quishing');

    // Click sample QR
    const sample = page.getByText(/Fake Microsoft MFA Renewal/i);
    await expect(sample).toBeVisible();
    await sample.click();

    // Verify analysis result
    await expect(page.locator('text=Decoded QR Payload')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('High Risk').first()).toBeVisible();
  });

  test('10. Email and SMS Inspector evaluates smishing message', async ({ page }) => {
    await page.goto('/email-inspector');
    await expect(page).toHaveTitle(/Email & SMS Phishing Inspector/);

    // Click demo sample SMS
    const sample = page.getByText(/Bank Suspension SMS/i);
    await expect(sample).toBeVisible();
    await sample.click();

    // Verify social engineering verdict
    await expect(page.locator('text=Message Threat Verdict')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Phishing \/ Smishing/i).first()).toBeVisible();
    await expect(page.locator('text=Extracted Hyperlinks Inspection')).toBeVisible();
  });

  test('11. Chrome Extension showcase page renders interactive simulator', async ({ page }) => {
    await page.goto('/extension');
    await expect(page).toHaveTitle(/PhishShield Chrome Extension/);
    await expect(page.locator('text=Live Extension Simulator')).toBeVisible();
    await expect(page.locator('text=chrome://extensions')).toBeVisible();
  });

  test('12. Spot the Phish Arena interactive gameplay and reveal workflow', async ({ page }) => {
    await page.goto('/arena');
    await expect(page).toHaveTitle(/Spot the Phish/);
    await expect(page.locator('h1')).toContainText('Human vs. AI Challenge');

    // Verify first challenge is visible
    await expect(page.getByText('Mobile Banking SMS')).toBeVisible();
    await expect(page.getByRole('button', { name: /Phishing \/ Scam/i })).toBeVisible();

    // Vote 'Phishing'
    await page.getByRole('button', { name: /Phishing \/ Scam/i }).click();

    // Check dramatic reveal
    await expect(page.getByText(/CORRECT! You spotted the deception/i)).toBeVisible();
    await expect(page.getByText(/Forensic Security Teardown/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Next Challenge/i })).toBeVisible();
  });
});


