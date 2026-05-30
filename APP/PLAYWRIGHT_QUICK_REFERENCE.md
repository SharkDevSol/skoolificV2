# Playwright Quick Reference Guide

## 🚀 Quick Commands

```bash
# Run all tests
npm run test:e2e

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Run tests with UI (interactive)
npm run test:e2e:ui

# Debug tests
npm run test:e2e:debug

# View test report
npm run test:e2e:report

# Run specific test file
npx playwright test e2e/auth/admin-login.spec.js

# Run tests in specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Generate test code
npx playwright codegen http://localhost:5173
```

## 📝 Common Selectors

```javascript
// By text
page.locator('text=Login')
page.locator('text=/login/i') // case insensitive

// By data-testid
page.locator('[data-testid="submit-button"]')

// By role
page.getByRole('button', { name: 'Submit' })
page.getByRole('textbox', { name: 'Username' })

// By placeholder
page.getByPlaceholder('Enter username')

// By label
page.getByLabel('Username')

// CSS selectors
page.locator('button.primary')
page.locator('#login-form')
page.locator('input[name="username"]')
```

## 🎯 Common Actions

```javascript
// Navigation
await page.goto('/login')
await page.goBack()
await page.goForward()
await page.reload()

// Click
await page.click('button')
await page.dblclick('button')

// Fill input
await page.fill('input[name="username"]', 'admin')
await page.type('input', 'text', { delay: 100 })

// Select dropdown
await page.selectOption('select', 'value')
await page.selectOption('select', { label: 'Option 1' })

// Check/uncheck
await page.check('input[type="checkbox"]')
await page.uncheck('input[type="checkbox"]')

// Upload file
await page.setInputFiles('input[type="file"]', 'path/to/file.pdf')

// Hover
await page.hover('button')

// Focus
await page.focus('input')

// Press key
await page.press('input', 'Enter')
await page.keyboard.press('Control+A')
```

## ⏳ Waiting

```javascript
// Wait for selector
await page.waitForSelector('[data-testid="result"]')

// Wait for URL
await page.waitForURL('**/dashboard')

// Wait for load state
await page.waitForLoadState('networkidle')
await page.waitForLoadState('domcontentloaded')

// Wait for timeout (avoid if possible)
await page.waitForTimeout(1000)

// Wait for function
await page.waitForFunction(() => document.querySelector('.loading') === null)
```

## ✅ Assertions

```javascript
// Visibility
await expect(page.locator('button')).toBeVisible()
await expect(page.locator('button')).toBeHidden()

// Text content
await expect(page.locator('h1')).toHaveText('Welcome')
await expect(page.locator('h1')).toContainText('Welcome')

// Value
await expect(page.locator('input')).toHaveValue('admin')

// Attribute
await expect(page.locator('button')).toHaveAttribute('disabled')
await expect(page.locator('a')).toHaveAttribute('href', '/login')

// Count
await expect(page.locator('li')).toHaveCount(5)

// URL
await expect(page).toHaveURL('http://localhost:5173/dashboard')
await expect(page).toHaveURL(/dashboard/)

// Title
await expect(page).toHaveTitle('Dashboard')

// Checked state
await expect(page.locator('input[type="checkbox"]')).toBeChecked()
await expect(page.locator('input[type="checkbox"]')).not.toBeChecked()

// Enabled/Disabled
await expect(page.locator('button')).toBeEnabled()
await expect(page.locator('button')).toBeDisabled()
```

## 🔍 Getting Values

```javascript
// Get text content
const text = await page.locator('h1').textContent()

// Get inner text
const innerText = await page.locator('h1').innerText()

// Get attribute
const href = await page.locator('a').getAttribute('href')

// Get input value
const value = await page.locator('input').inputValue()

// Get all text contents
const texts = await page.locator('li').allTextContents()

// Count elements
const count = await page.locator('li').count()

// Check if visible
const isVisible = await page.locator('button').isVisible()

// Check if enabled
const isEnabled = await page.locator('button').isEnabled()
```

## 📸 Screenshots & Videos

```javascript
// Take screenshot
await page.screenshot({ path: 'screenshot.png' })
await page.screenshot({ path: 'screenshot.png', fullPage: true })

// Screenshot of element
await page.locator('button').screenshot({ path: 'button.png' })

// Videos are automatically recorded based on config
// Configure in playwright.config.js:
use: {
  video: 'on',           // Always record
  video: 'off',          // Never record
  video: 'retain-on-failure', // Only keep on failure
}
```

## 🍪 Cookies & Storage

```javascript
// Get cookies
const cookies = await page.context().cookies()

// Set cookies
await page.context().addCookies([
  { name: 'token', value: 'abc123', domain: 'localhost', path: '/' }
])

// Clear cookies
await page.context().clearCookies()

// Local storage
await page.evaluate(() => localStorage.setItem('key', 'value'))
const value = await page.evaluate(() => localStorage.getItem('key'))
await page.evaluate(() => localStorage.clear())

// Session storage
await page.evaluate(() => sessionStorage.setItem('key', 'value'))
const value = await page.evaluate(() => sessionStorage.getItem('key'))
```

## 🎭 Multiple Pages/Tabs

```javascript
// Open new page
const newPage = await context.newPage()

// Handle popup
const [popup] = await Promise.all([
  page.waitForEvent('popup'),
  page.click('a[target="_blank"]')
])
await popup.waitForLoadState()

// Get all pages
const pages = context.pages()
```

## 🔐 Authentication

```javascript
// Save authentication state
await page.context().storageState({ path: 'auth.json' })

// Load authentication state
const context = await browser.newContext({ storageState: 'auth.json' })

// Use helper function
import { loginAsAdmin } from './helpers/auth-helper.js'
await loginAsAdmin(page, testUsers.admin)
```

## 🐛 Debugging

```javascript
// Pause execution
await page.pause()

// Console logs
page.on('console', msg => console.log(msg.text()))

// Network requests
page.on('request', request => console.log(request.url()))
page.on('response', response => console.log(response.url()))

// Page errors
page.on('pageerror', error => console.log(error.message))

// Slow down execution
await page.setDefaultTimeout(60000)
await page.setDefaultNavigationTimeout(60000)
```

## 📱 Mobile Testing

```javascript
// Use device preset
import { devices } from '@playwright/test'

test.use({
  ...devices['iPhone 12']
})

// Custom viewport
await page.setViewportSize({ width: 375, height: 667 })

// Geolocation
await context.setGeolocation({ latitude: 9.0320, longitude: 38.7469 })

// Permissions
await context.grantPermissions(['geolocation'])
```

## 🎨 Best Practices

1. **Use data-testid for stable selectors**
   ```javascript
   <button data-testid="submit-btn">Submit</button>
   await page.click('[data-testid="submit-btn"]')
   ```

2. **Use auto-waiting assertions**
   ```javascript
   // Good - auto-waits
   await expect(page.locator('button')).toBeVisible()
   
   // Avoid - manual wait
   await page.waitForSelector('button')
   ```

3. **Use descriptive test names**
   ```javascript
   test('should show error when submitting empty form', async ({ page }) => {
     // ...
   })
   ```

4. **Clean up after tests**
   ```javascript
   test.afterEach(async ({ page }) => {
     await page.evaluate(() => localStorage.clear())
   })
   ```

5. **Use fixtures for test data**
   ```javascript
   import { testUsers } from './fixtures/test-data.js'
   await page.fill('input[name="username"]', testUsers.admin.username)
   ```

## 🔗 Useful Links

- [Playwright Docs](https://playwright.dev/)
- [API Reference](https://playwright.dev/docs/api/class-playwright)
- [Selectors Guide](https://playwright.dev/docs/selectors)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Test Generator](https://playwright.dev/docs/codegen)
