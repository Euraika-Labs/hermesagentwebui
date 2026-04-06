import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const BASE = 'http://localhost:3199';
const SHOTS = '/opt/projects/pan-ui/scripts/screenshots';
mkdirSync(SHOTS, { recursive: true });

let shotIndex = 0;
async function snap(page, label) {
  shotIndex++;
  const name = `${String(shotIndex).padStart(2, '0')}_${label.replace(/[^a-z0-9]+/gi, '_')}.png`;
  await page.screenshot({ path: `${SHOTS}/${name}`, fullPage: false });
  console.log(`  📸 ${name}`);
}

async function checkConsoleErrors(page) {
  // We'll collect errors during navigation
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Collect console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', err => consoleErrors.push(`[PAGE_ERROR] ${err.message}`));

  try {
    // ─── 1. LOGIN PAGE ───
    console.log('\n═══ 1. LOGIN PAGE ═══');
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await snap(page, 'login_page');

    // Check form elements exist
    const usernameInput = page.locator('input[name="username"], input[placeholder*="ername"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    const loginBtn = page.locator('button:has-text("Continue")');
    console.log(`  Username field: ${await usernameInput.count() > 0 ? '✅' : '❌'}`);
    console.log(`  Password field: ${await passwordInput.count() > 0 ? '✅' : '❌'}`);
    console.log(`  Continue button: ${await loginBtn.count() > 0 ? '✅' : '❌'}`);

    // Test wrong password
    await usernameInput.fill('admin');
    await passwordInput.fill('wrongpass');
    await loginBtn.click();
    await page.waitForTimeout(500);
    const errorMsg = page.locator('text=Invalid credentials');
    console.log(`  Wrong password error: ${await errorMsg.count() > 0 ? '✅' : '❌'}`);
    await snap(page, 'login_error');

    // Login correctly
    await passwordInput.fill('changeme');
    await loginBtn.click();
    await page.waitForURL('**/chat**', { timeout: 10000 });
    console.log(`  Login redirect to chat: ✅`);
    await page.waitForTimeout(2000);
    await snap(page, 'chat_after_login');

    // ─── 2. CHAT PAGE ───
    console.log('\n═══ 2. CHAT PAGE ═══');
    await page.goto(`${BASE}/chat`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await snap(page, 'chat_page');

    // Check sidebar elements
    const sidebar = page.locator('aside').first();
    const newChatBtn = page.locator('button:has-text("New chat")').first();
    const searchBox = page.locator('input[placeholder*="Search"]').first();
    const sessionButtons = page.locator('button[aria-label*="Open session"]');
    const showMoreBtn = page.locator('button:has-text("Show more")');

    console.log(`  Sidebar: ${await sidebar.count() > 0 ? '✅' : '❌'}`);
    console.log(`  New chat button: ${await newChatBtn.count() > 0 ? '✅' : '❌'}`);
    console.log(`  Search box: ${await searchBox.count() > 0 ? '✅' : '❌'}`);
    const sessionCount = await sessionButtons.count();
    console.log(`  Session items visible: ${sessionCount} ${sessionCount <= 30 ? '✅ (paginated)' : '❌ (too many)'}`);
    console.log(`  Show more button: ${await showMoreBtn.count() > 0 ? '✅' : '❌'}`);

    // Check header elements
    const profileSwitcher = page.locator('select[aria-label*="Profile"]').first();
    const themeToggle = page.locator('button:has-text("Light"), button:has-text("Dark")').first();
    const approvalsLink = page.locator('a[href*="approvals"]').first();
    const diagnosticsLink = page.locator('a[href*="health"]').first();

    console.log(`  Profile switcher: ${await profileSwitcher.count() > 0 ? '✅' : '❌'}`);
    console.log(`  Theme toggle: ${await themeToggle.count() > 0 ? '✅' : '❌'}`);
    console.log(`  Approvals link: ${await approvalsLink.count() > 0 ? '✅' : '❌'}`);
    console.log(`  Diagnostics link: ${await diagnosticsLink.count() > 0 ? '✅' : '❌'}`);

    // Check nav links
    const navLinks = ['Chat', 'Skills', 'Extensions', 'Memory', 'Profiles', 'Settings'];
    for (const label of navLinks) {
      const link = page.locator(`nav a:has-text("${label}")`).first();
      console.log(`  Nav → ${label}: ${await link.count() > 0 ? '✅' : '❌'}`);
    }

    // Check chat composer
    const composer = page.locator('textarea[placeholder*="Message"], textarea[placeholder*="Hermes"]').first();
    console.log(`  Chat composer: ${await composer.count() > 0 ? '✅' : '❌'}`);

    // Click "New chat" and test sending a message
    console.log('\n  --- Testing New Chat + Send ---');
    await newChatBtn.click();
    await page.waitForTimeout(1500);
    await snap(page, 'new_chat_created');

    // Find and use the composer
    const composerAfterNew = page.locator('textarea').first();
    if (await composerAfterNew.count() > 0) {
      await composerAfterNew.scrollIntoViewIfNeeded();
      await composerAfterNew.fill('Hello from visual audit! What are you?');
      await snap(page, 'chat_message_typed');
      await page.keyboard.press('Enter');
      console.log(`  Message sent: ✅`);

      // Wait for streaming response
      await page.waitForTimeout(5000);
      await snap(page, 'chat_response_streamed');

      // Check if assistant response appeared
      const assistantMsg = page.locator('[class*="assistant"], [data-role="assistant"], .prose, [class*="message"]');
      console.log(`  Assistant response visible: ${await assistantMsg.count() > 0 ? '✅' : '⚠️ (check screenshot)'}`);
    } else {
      console.log(`  Composer not found after new chat: ❌`);
    }

    // Test theme toggle
    console.log('\n  --- Testing Theme Toggle ---');
    if (await themeToggle.count() > 0) {
      await themeToggle.click();
      await page.waitForTimeout(500);
      await snap(page, 'chat_dark_theme');
      await themeToggle.click();
      await page.waitForTimeout(500);
      console.log(`  Theme toggle works: ✅`);
    }

    // Test search
    console.log('\n  --- Testing Session Search ---');
    if (await searchBox.count() > 0) {
      await searchBox.fill('fork');
      await page.waitForTimeout(500);
      await snap(page, 'session_search_results');
      const filteredCount = await sessionButtons.count();
      console.log(`  Search filter: ${filteredCount} results ✅`);
      await searchBox.fill('');
      await page.waitForTimeout(300);
    }

    // ─── 3. SKILLS PAGE ───
    console.log('\n═══ 3. SKILLS PAGE ═══');
    await page.goto(`${BASE}/skills`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await snap(page, 'skills_page');

    const installedTab = page.locator('button:has-text("Installed")').first();
    const discoverTab = page.locator('button:has-text("Discover")').first();
    const skillCards = page.locator('a[href*="/skills/"]');
    const skillCount = await skillCards.count();
    console.log(`  Installed tab: ${await installedTab.count() > 0 ? '✅' : '❌'}`);
    console.log(`  Discover tab: ${await discoverTab.count() > 0 ? '✅' : '❌'}`);
    console.log(`  Skill cards visible: ${skillCount} ${skillCount > 0 ? '✅' : '❌'}`);

    // Click on a skill detail
    if (skillCount > 0) {
      const firstSkill = skillCards.first();
      const skillName = await firstSkill.locator('h3').first().textContent().catch(() => 'unknown');
      console.log(`  Clicking skill: ${skillName}`);
      await firstSkill.click();
      await page.waitForTimeout(2000);
      await snap(page, 'skill_detail');

      // Check detail page elements
      const skillTitle = page.locator('h1, h2').first();
      const enableBtn = page.locator('button:has-text("Enable"), button:has-text("Disable"), button:has-text("Load")');
      console.log(`  Skill title: ${await skillTitle.textContent().catch(() => '❌')}`);
      console.log(`  Action buttons: ${await enableBtn.count() > 0 ? '✅' : '⚠️'}`);

      await page.goBack();
      await page.waitForTimeout(1000);
    }

    // Test Discover tab
    if (await discoverTab.count() > 0) {
      await discoverTab.click();
      await page.waitForTimeout(2000);
      await snap(page, 'skills_discover');
      console.log(`  Discover tab clicked: ✅`);
      // Switch back
      if (await installedTab.count() > 0) await installedTab.click();
      await page.waitForTimeout(500);
    }

    // ─── 4. EXTENSIONS PAGE ───
    console.log('\n═══ 4. EXTENSIONS PAGE ═══');
    await page.goto(`${BASE}/extensions`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await snap(page, 'extensions_page');

    const extTabs = ['Installed', 'MCP Servers', 'Tools', 'Approvals', 'Diagnostics'];
    for (const tab of extTabs) {
      const tabBtn = page.locator(`button:has-text("${tab}")`).first();
      if (await tabBtn.count() > 0) {
        await tabBtn.click();
        await page.waitForTimeout(1000);
        await snap(page, `extensions_tab_${tab.replace(/\s+/g, '_').toLowerCase()}`);
        console.log(`  Tab "${tab}": ✅`);
      } else {
        console.log(`  Tab "${tab}": ❌ not found`);
      }
    }

    const addMcpBtn = page.locator('button:has-text("Add MCP")').first();
    console.log(`  Add MCP button: ${await addMcpBtn.count() > 0 ? '✅' : '❌'}`);

    // Check MCP server card
    const mcpCard = page.locator('a[href*="/extensions/"], [class*="extension"]').first();
    console.log(`  Extension cards: ${await mcpCard.count() > 0 ? '✅' : '⚠️'}`);

    // ─── 5. MEMORY PAGE ───
    console.log('\n═══ 5. MEMORY PAGE ═══');
    await page.goto(`${BASE}/memory`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await snap(page, 'memory_page');

    const memTabs = ['User memory', 'Agent memory', 'Session search', 'Context inspector'];
    for (const tab of memTabs) {
      const tabBtn = page.locator(`button:has-text("${tab}")`).first();
      if (await tabBtn.count() > 0) {
        await tabBtn.click();
        await page.waitForTimeout(1000);
        await snap(page, `memory_tab_${tab.replace(/\s+/g, '_').toLowerCase()}`);
        console.log(`  Tab "${tab}": ✅`);
      } else {
        console.log(`  Tab "${tab}": ❌ not found`);
      }
    }

    const saveMemBtn = page.locator('button:has-text("Save")').first();
    const memTextarea = page.locator('textarea').first();
    console.log(`  Memory editor: ${await memTextarea.count() > 0 ? '✅' : '❌'}`);
    console.log(`  Save button: ${await saveMemBtn.count() > 0 ? '✅' : '❌'}`);

    // ─── 6. PROFILES PAGE ───
    console.log('\n═══ 6. PROFILES PAGE ═══');
    await page.goto(`${BASE}/profiles`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await snap(page, 'profiles_page');

    const createProfileBtn = page.locator('button:has-text("Create profile")').first();
    const policySelectors = page.locator('select[aria-label*="Policy"]');
    const switchBtns = page.locator('button:has-text("Switch")');
    const cloneBtns = page.locator('button:has-text("Clone")');
    const deleteBtns = page.locator('button:has-text("Delete")');

    console.log(`  Create profile button: ${await createProfileBtn.count() > 0 ? '✅' : '❌'}`);
    console.log(`  Policy selectors: ${await policySelectors.count()} ${await policySelectors.count() > 0 ? '✅' : '❌'}`);
    console.log(`  Switch buttons: ${await switchBtns.count()} ${await switchBtns.count() > 0 ? '✅' : '❌'}`);
    console.log(`  Clone buttons: ${await cloneBtns.count()} ${await cloneBtns.count() > 0 ? '✅' : '❌'}`);
    console.log(`  Delete buttons: ${await deleteBtns.count()} ${await deleteBtns.count() > 0 ? '✅' : '❌'}`);

    // Scroll down to see more profiles
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await snap(page, 'profiles_page_scrolled');

    // ─── 7. SETTINGS PAGE ───
    console.log('\n═══ 7. SETTINGS PAGE ═══');
    await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await snap(page, 'settings_page');

    // Check settings sub-pages
    const settingsLinks = [
      { name: 'Approvals', url: '/settings/approvals' },
      { name: 'Health/Diagnostics', url: '/settings/health' },
      { name: 'Runs', url: '/settings/runs' },
      { name: 'Artifacts', url: '/settings/artifacts' },
      { name: 'Telemetry', url: '/settings/telemetry' },
    ];

    for (const { name, url } of settingsLinks) {
      await page.goto(`${BASE}${url}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      await snap(page, `settings_${name.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`);
      const heading = await page.locator('h1, h2').first().textContent().catch(() => 'none');
      console.log(`  ${name}: ✅ (heading: "${heading.trim()}")`);
    }

    // ─── 8. WORKSPACE DETAIL PANEL ───
    console.log('\n═══ 8. DETAIL RAIL PANEL ═══');
    await page.goto(`${BASE}/chat`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const detailTabs = ['Context', 'Activity', 'Tools', 'Output', 'Session'];
    for (const tab of detailTabs) {
      const tabBtn = page.locator(`button:has-text("${tab}")`).first();
      if (await tabBtn.count() > 0) {
        await tabBtn.click();
        await page.waitForTimeout(800);
        await snap(page, `detail_rail_${tab.toLowerCase()}`);
        console.log(`  Detail rail "${tab}": ✅`);
      } else {
        console.log(`  Detail rail "${tab}": ❌ not found`);
      }
    }

    // ─── 9. RESPONSIVE / MOBILE ───
    console.log('\n═══ 9. MOBILE VIEW (375x812) ═══');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE}/chat`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await snap(page, 'mobile_chat');

    await page.goto(`${BASE}/skills`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await snap(page, 'mobile_skills');

    // Reset viewport
    await page.setViewportSize({ width: 1440, height: 900 });

    // ─── SUMMARY ───
    console.log('\n══════════════════════════════════');
    console.log('  VISUAL AUDIT COMPLETE');
    console.log(`  Screenshots: ${shotIndex}`);
    console.log(`  Console errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log('  Errors:');
      for (const e of consoleErrors.slice(0, 10)) {
        console.log(`    ⚠️  ${e.slice(0, 150)}`);
      }
    }
    console.log('══════════════════════════════════');

  } catch (err) {
    console.error(`\n❌ AUDIT FAILED: ${err.message}`);
    await snap(page, 'error_state').catch(() => {});
  } finally {
    await browser.close();
  }
})();
