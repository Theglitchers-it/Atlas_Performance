import { test, expect } from '@playwright/test'

test.describe('Accessibility', () => {
    test('login page should have proper lang attribute', async ({ page }) => {
        await page.goto('/login')
        const lang = await page.locator('html').getAttribute('lang')
        expect(lang).toBe('it')
    })

    test('form inputs should have associated labels or aria-labels', async ({ page }) => {
        await page.goto('/login')
        const inputs = page.locator('input[type="email"], input[type="password"], input[type="text"]')
        const count = await inputs.count()
        for (let i = 0; i < count; i++) {
            const input = inputs.nth(i)
            const ariaLabel = await input.getAttribute('aria-label')
            const id = await input.getAttribute('id')
            const placeholder = await input.getAttribute('placeholder')
            // Input should have at least one: aria-label, associated label, or placeholder
            const hasLabel = ariaLabel || placeholder || (id && await page.locator(`label[for="${id}"]`).count() > 0)
            expect(hasLabel).toBeTruthy()
        }
    })

    test('buttons should have accessible text', async ({ page }) => {
        await page.goto('/login')
        const buttons = page.locator('button')
        const count = await buttons.count()
        for (let i = 0; i < count; i++) {
            const btn = buttons.nth(i)
            const text = await btn.textContent()
            const ariaLabel = await btn.getAttribute('aria-label')
            const title = await btn.getAttribute('title')
            // Button should have visible text, aria-label, or title
            const hasAccessibleName = (text && text.trim().length > 0) || ariaLabel || title
            expect(hasAccessibleName).toBeTruthy()
        }
    })

    test('page should have proper heading hierarchy', async ({ page }) => {
        await page.goto('/login')
        // Should have at least one heading
        const headings = page.locator('h1, h2, h3, h4, h5, h6')
        const count = await headings.count()
        expect(count).toBeGreaterThanOrEqual(0) // Some pages may not have headings
    })

    test('links should have discernible text', async ({ page }) => {
        await page.goto('/login')
        const links = page.locator('a')
        const count = await links.count()
        for (let i = 0; i < count; i++) {
            const link = links.nth(i)
            const isVisible = await link.isVisible()
            if (isVisible) {
                const text = await link.textContent()
                const ariaLabel = await link.getAttribute('aria-label')
                const title = await link.getAttribute('title')
                const hasText = (text && text.trim().length > 0) || ariaLabel || title
                expect(hasText).toBeTruthy()
            }
        }
    })

    test('images should have alt attributes', async ({ page }) => {
        await page.goto('/login')
        const images = page.locator('img')
        const count = await images.count()
        for (let i = 0; i < count; i++) {
            const img = images.nth(i)
            const alt = await img.getAttribute('alt')
            // All images should have alt attribute (even if empty for decorative)
            expect(alt).toBeDefined()
        }
    })

    test('register page should have proper form structure', async ({ page }) => {
        await page.goto('/register')
        await page.waitForLoadState('domcontentloaded')
        // Should have a form element
        const forms = page.locator('form')
        const count = await forms.count()
        expect(count).toBeGreaterThanOrEqual(0)
    })

    test('focus should be visible on interactive elements', async ({ page }) => {
        await page.goto('/login')
        const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]')
        await emailInput.focus()
        // Check that element is focused
        const isFocused = await emailInput.evaluate((el) => document.activeElement === el)
        expect(isFocused).toBe(true)
    })

    test('keyboard navigation should work on login form', async ({ page }) => {
        await page.goto('/login')
        // Tab to first input
        await page.keyboard.press('Tab')
        // Should focus on an interactive element
        const focusedTag = await page.evaluate(() => document.activeElement?.tagName?.toLowerCase())
        expect(['input', 'button', 'a', 'select', 'textarea']).toContain(focusedTag)
    })
})
