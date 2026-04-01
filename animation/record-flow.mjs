import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  recordVideo: { dir: './public/screens/', size: { width: 390, height: 844 } },
  deviceScaleFactor: 2,
});
const p = await context.newPage();

// Navigate
await p.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1000);

// Scroll to top so only map + buttons are visible, no item cards
await p.evaluate(() => window.scrollTo(0, 0));
await p.waitForTimeout(1500);

// Click "I lost something"
await p.click('text=Ég týndi einhverju');
await p.waitForTimeout(800);

const dialog = p.getByRole('dialog');

// Select "Sími" (Phone) category
await dialog.getByRole('button', { name: 'Sími' }).click();
await p.waitForTimeout(600);

// Upload iPhone photo — click the upload area and set the file
const fileInput = dialog.locator('input[type="file"]');
await fileInput.setInputFiles('./public/screens/iphone-photo.jpg');
await p.waitForTimeout(1200);

// Scroll to and fill title with slow typing
const titleInput = dialog.locator('#modal-title');
await titleInput.scrollIntoViewIfNeeded();
await titleInput.click();
await p.waitForTimeout(300);
await titleInput.pressSequentially('iPhone 15 Pro', { delay: 80 });
await p.waitForTimeout(800);

// Fill description with slow typing
const descInput = dialog.locator('#modal-desc');
await descInput.scrollIntoViewIfNeeded();
await descInput.click();
await p.waitForTimeout(300);
await descInput.pressSequentially('Svartur iPhone týndist nálægt Hallgrímskirkju', { delay: 60 });
await p.waitForTimeout(800);

// Scroll to location and fill
const locationContainer = dialog.locator('text=Staðsetning').first();
await locationContainer.scrollIntoViewIfNeeded();
await p.waitForTimeout(300);

const addressInput = dialog.locator('input[placeholder]').nth(1);
await addressInput.click();
await p.waitForTimeout(200);
await addressInput.pressSequentially('Hallgrímskirkja', { delay: 70 });
await p.waitForTimeout(1500);

// Try clicking autocomplete result
try {
  const suggestion = p.locator('li').first();
  await suggestion.click({ timeout: 2000 });
} catch {}
await p.waitForTimeout(1000);

// Scroll to date
const dateInput = dialog.locator('#modal-date');
await dateInput.scrollIntoViewIfNeeded();
await p.waitForTimeout(500);

// Fill email
const emailInput = dialog.locator('#modal-email');
await emailInput.scrollIntoViewIfNeeded();
await emailInput.click();
await p.waitForTimeout(300);
await emailInput.pressSequentially('jon@fundid.is', { delay: 80 });
await p.waitForTimeout(800);

// Scroll to submit button
const submitBtn = dialog.locator('button[type="submit"]');
await submitBtn.scrollIntoViewIfNeeded();
await p.waitForTimeout(500);
await submitBtn.hover();
await p.waitForTimeout(400);
await submitBtn.click();
await p.waitForTimeout(500);

// Inject success modal via safe DOM construction
// Note: This is a controlled test script with hardcoded static content, not user input
await p.evaluate(() => {
  document.querySelectorAll('[role="dialog"]').forEach(d => d.remove());

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center';

  const backdrop = document.createElement('div');
  backdrop.style.cssText = 'position:absolute;inset:0;background:rgba(0,0,0,0.4);backdrop-filter:blur(4px)';
  overlay.appendChild(backdrop);

  const card = document.createElement('div');
  card.style.cssText = 'position:relative;background:white;border-radius:16px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);max-width:384px;margin:16px;padding:24px;text-align:center';

  // Check icon
  const iconWrap = document.createElement('div');
  iconWrap.style.cssText = 'width:56px;height:56px;background:#dcfce7;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '28');
  svg.setAttribute('height', '28');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', '#16a34a');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path1.setAttribute('d', 'M22 11.08V12a10 10 0 1 1-5.93-9.14');
  const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  path2.setAttribute('points', '22 4 12 14.01 9 11.01');
  svg.appendChild(path1);
  svg.appendChild(path2);
  iconWrap.appendChild(svg);
  card.appendChild(iconWrap);

  const h2 = document.createElement('h2');
  h2.style.cssText = 'font-size:18px;font-weight:700;color:#2C2520;margin-bottom:4px';
  h2.textContent = 'Skráning tókst!';
  card.appendChild(h2);

  const desc = document.createElement('p');
  desc.style.cssText = 'font-size:14px;color:#8C7B6B;margin-bottom:20px';
  desc.textContent = 'Hluturinn þinn hefur verið skráður. Deildu á samfélagsmiðlum til að auka líkurnar.';
  card.appendChild(desc);

  const btnContainer = document.createElement('div');
  btnContainer.style.cssText = 'display:flex;flex-direction:column;gap:10px';

  const fbBtn = document.createElement('button');
  fbBtn.id = 'fb-share-btn';
  fbBtn.style.cssText = 'width:100%;padding:10px;border-radius:12px;font-weight:600;font-size:14px;color:white;background:#1877F2;border:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px';
  const fbSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  fbSvg.setAttribute('viewBox', '0 0 24 24');
  fbSvg.setAttribute('fill', 'currentColor');
  fbSvg.style.cssText = 'width:16px;height:16px';
  const fbPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  fbPath.setAttribute('d', 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z');
  fbSvg.appendChild(fbPath);
  fbBtn.appendChild(fbSvg);
  fbBtn.appendChild(document.createTextNode('Deila á Facebook'));
  btnContainer.appendChild(fbBtn);

  const viewLink = document.createElement('a');
  viewLink.style.cssText = 'width:100%;padding:10px;border-radius:12px;font-weight:500;font-size:14px;color:#8C7B6B;text-decoration:none;display:block';
  viewLink.textContent = 'Skoða hlut →';
  btnContainer.appendChild(viewLink);

  card.appendChild(btnContainer);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
});

await p.waitForTimeout(1500);

// Hover and click Facebook button
const fbBtn = p.locator('#fb-share-btn');
await fbBtn.hover();
await p.waitForTimeout(500);
await fbBtn.click();
await p.waitForTimeout(1500);

// Close to save video
await p.close();
const videoPath = await p.video().path();
await context.close();
await browser.close();

console.log(`Video saved at: ${videoPath}`);
