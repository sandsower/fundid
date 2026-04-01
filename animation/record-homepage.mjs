import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  recordVideo: { dir: './public/screens/', size: { width: 390, height: 844 } },
  deviceScaleFactor: 2,
});
const p = await context.newPage();

await p.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1000);
await p.evaluate(() => window.scrollTo(0, 0));
await p.waitForTimeout(2000);

// Click "I lost something"
await p.click('text=Ég týndi einhverju');
await p.waitForTimeout(1500);

await p.close();
const videoPath = await p.video().path();
await context.close();
await browser.close();

console.log(`Homepage video saved at: ${videoPath}`);
