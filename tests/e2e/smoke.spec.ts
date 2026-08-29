import { test,expect } from '@playwright/test'
test('loads dashboard with auth disabled',async({page})=>{await page.goto('/');await expect(page.getByText('FHIR Learning Dashboard')).toBeVisible();await expect(page.getByText('Clinical rows stored locally')).toBeVisible()})
test('loads user guide with auth disabled',async({page})=>{await page.goto('/#/guide');await expect(page.getByRole('heading',{name:'User Guide'})).toBeVisible();await expect(page.getByText('Recommended Workflow')).toBeVisible();await expect(page.getByText('Secrets stay server-side')).toBeVisible()})
