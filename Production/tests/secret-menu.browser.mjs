// Con il server Vite attivo: node --experimental-strip-types --no-warnings tests/secret-menu.browser.mjs
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createNewGame } from '../src/game/state.ts';
import { finishedOnboarding } from '../src/game/onboarding.ts';

const state = createNewGame(new Date(), 891);
state.onboarding = finishedOnboarding();
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(({ save }) => {
    if (!localStorage.getItem('necrothing3d.save.v1')) localStorage.setItem('necrothing3d.save.v1', JSON.stringify(save));
    localStorage.setItem('necro.lang', 'it');
  }, { save: state });
  await page.goto(process.env.DEV_URL ?? 'http://127.0.0.1:4178/?mist=0');
  await page.waitForFunction(() => window.necro && !document.querySelector('#boot'), { timeout: 120000 });
  await page.evaluate(() => window.necro.ui.openSettings());
  await page.getByRole('button', { name: 'Info', exact: true }).tap();
  const logo = page.locator('.info-logo-trigger');
  for (let i = 0; i < 5; i++) await logo.tap();
  await page.evaluate(() => window.necro.ui.refreshSettingsButtons());
  for (let i = 0; i < 4; i++) await logo.tap();
  assert.equal(await page.locator('.secret-dialog').count(), 0, 'nove tocchi non aprono il modale');
  // In beta anche il badge sovrapposto deve contare come tocco sul logo.
  await page.evaluate(() => { const logo = document.querySelector('.info-logo-trigger'); if (!logo.querySelector('.beta-badge')) { const b = document.createElement('span'); b.className = 'beta-badge'; b.textContent = 'Beta'; logo.append(b); } });
  await page.locator('.beta-badge').tap();
  const form = page.locator('.secret-dialog'), field = page.locator('#secret-password'), send = form.getByRole('button', { name: 'Invia' });
  await form.waitFor();
  assert.ok(await send.isDisabled(), 'invio vuoto disabilitato');
  await field.fill('   '); assert.ok(await send.isDisabled(), 'soli spazi disabilitati');
  await form.getByRole('button', { name: 'Annulla' }).tap();
  assert.equal(await form.count(), 0);
  for (let i = 0; i < 9; i++) await logo.tap();
  await page.locator('.info-about-title').tap();
  await logo.tap(); assert.equal(await form.count(), 0, 'un altro tocco interrompe la sequenza');
  for (let i = 0; i < 9; i++) await logo.tap();
  await form.waitFor();
  const initial = await page.evaluate(() => window.necro.state.player.wisps);
  await field.fill('sbagliata'); await send.tap();
  assert.ok(await form.getByText('Non è la parola d’ordine. Riprova!').isVisible());
  assert.equal(await page.evaluate(() => window.necro.state.player.wisps), initial);
  await field.fill('Fluffy Coniglietto'); await send.tap();
  assert.equal(await page.evaluate(() => window.necro.state.player.wisps), initial + 100);
  for (let i = 0; i < 10; i++) await logo.tap();
  await field.fill('Fluffy Coniglietto'); await send.tap();
  assert.equal(await page.evaluate(() => window.necro.state.player.wisps), initial + 200);
  await page.reload(); await page.waitForFunction(() => window.necro && !document.querySelector('#boot'), { timeout: 120000 });
  assert.equal(await page.evaluate(() => window.necro.state.player.wisps), initial + 200, 'premio conservato dopo la riapertura');
  assert.deepEqual(errors, []);
  console.log('Menu segreto: tocchi, aggiornamento pannello, badge, interruzione, errori e premi verificati.');
} finally { await browser.close(); }
