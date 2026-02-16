import { test, expect } from '@playwright/test'
import { mockGetUserMedia, startMicrophone } from './helpers/mockAudio'

test.beforeEach(async ({ page }) => {
  await mockGetUserMedia(page)
  await page.goto('/')
  // 区間タブに移動
  await page.getByRole('button', { name: '区間' }).click()
})

test.describe('区間練習', () => {
  test('設定画面が表示される', async ({ page }) => {
    await expect(page.getByText('区間練習', { exact: true })).toBeVisible()
    await expect(page.getByText('楽譜', { exact: true })).toBeVisible()
    await expect(page.getByText('開始小節', { exact: true })).toBeVisible()
    await expect(page.getByText('終了小節', { exact: true })).toBeVisible()
  })

  test('テンポ倍率を選択できる', async ({ page }) => {
    await expect(page.getByRole('button', { name: '50%' })).toBeVisible()
    await expect(page.getByRole('button', { name: '75%' })).toBeVisible()
    await expect(page.getByRole('button', { name: '100%' })).toBeVisible()

    // 75%を選択
    await page.getByRole('button', { name: '75%' }).click()
  })

  test('ループ数スライダーが動作する', async ({ page }) => {
    const slider = page.locator('input[type="range"]')
    await expect(slider).toBeVisible()
    const value = await slider.inputValue()
    expect(Number(value)).toBeGreaterThanOrEqual(1)
    expect(Number(value)).toBeLessThanOrEqual(10)
  })

  test('段階的テンポアップチェックボックスが動作する', async ({ page }) => {
    const checkbox = page.locator('#gradualSpeedUp')
    await expect(checkbox).toBeVisible()

    const initialChecked = await checkbox.isChecked()
    await checkbox.click()
    const afterChecked = await checkbox.isChecked()
    expect(afterChecked).toBe(!initialChecked)
  })

  test('マイク未起動時は開始ボタンが無効', async ({ page }) => {
    const startBtn = page.getByRole('button', { name: 'マイクを開始してください' })
    await expect(startBtn).toBeVisible()
    await expect(startBtn).toBeDisabled()
  })

  test('マイク起動後に開始できる', async ({ page }) => {
    await startMicrophone(page)
    const startBtn = page.getByRole('button', { name: '開始' })
    await expect(startBtn).toBeEnabled()
  })
})
