import { test,expect } from '@playwright/test'
test('loads dashboard with auth disabled',async({page})=>{await page.goto('/');await expect(page.getByText('FHIR Learning Dashboard')).toBeVisible();await expect(page.getByText('Clinical rows stored locally')).toBeVisible()})
