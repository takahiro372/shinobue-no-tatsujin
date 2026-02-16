import { test, expect } from '@playwright/test'
import { mockGetUserMedia, startMicrophone } from './helpers/mockAudio'

test.beforeEach(async ({ page }) => {
  await mockGetUserMedia(page)
  await page.goto('/')
  // 音階タブに移動
  await page.getByRole('button', { name: '音階' }).click()
})

test.describe('音階練習', () => {
  test('設定画面が表示される', async ({ page }) => {
    await expect(page.getByText('音階練習', { exact: true })).toBeVisible()
    await expect(page.getByText('パターン', { exact: true })).toBeVisible()
    await expect(page.getByText('音域', { exact: true })).toBeVisible()
  })

  test('パターンを選択できる', async ({ page }) => {
    await expect(page.getByRole('button', { name: '上行' })).toBeVisible()
    await expect(page.getByRole('button', { name: '下行' })).toBeVisible()
    await expect(page.getByRole('button', { name: '1つ飛び' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'ランダム' })).toBeVisible()

    // 下行を選択
    await page.getByRole('button', { name: '下行' }).click()
  })

  test('テンポスライダーが動作する', async ({ page }) => {
    const slider = page.locator('input[type="range"]').first()
    await expect(slider).toBeVisible()
    // デフォルト値が設定されている
    const value = await slider.inputValue()
    expect(Number(value)).toBeGreaterThanOrEqual(60)
    expect(Number(value)).toBeLessThanOrEqual(180)
  })

  test('メトロノームのON/OFFを切り替えできる', async ({ page }) => {
    const checkbox = page.locator('#metronome')
    await expect(checkbox).toBeVisible()

    // クリックで切り替え
    const initialChecked = await checkbox.isChecked()
    await checkbox.click()
    const afterChecked = await checkbox.isChecked()
    expect(afterChecked).toBe(!initialChecked)
  })

  test('音域フィルタを選択できる', async ({ page }) => {
    await expect(page.getByRole('button', { name: '全音域' })).toBeVisible()
    await expect(page.getByRole('button', { name: '呂音' })).toBeVisible()
    await expect(page.getByRole('button', { name: '甲音', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '大甲音' })).toBeVisible()

    // 甲音を選択
    await page.getByRole('button', { name: '甲音', exact: true }).click()
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
