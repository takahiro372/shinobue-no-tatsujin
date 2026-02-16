import { test, expect } from '@playwright/test'
import { mockGetUserMedia, startMicrophone } from './helpers/mockAudio'

test.beforeEach(async ({ page }) => {
  await mockGetUserMedia(page)
  await page.goto('/')
  // ロングトーンタブに移動
  await page.getByRole('button', { name: 'ロングトーン' }).click()
})

test.describe('ロングトーン練習', () => {
  test('設定画面が表示される', async ({ page }) => {
    await expect(page.locator('text=ロングトーン練習')).toBeVisible()
    await expect(page.locator('text=目標音')).toBeVisible()
    await expect(page.locator('text=目標時間')).toBeVisible()
    await expect(page.locator('text=許容範囲')).toBeVisible()
  })

  test('目標時間を選択できる', async ({ page }) => {
    // デフォルトの時間ボタンがある
    await expect(page.getByRole('button', { name: '5秒', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '10秒', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '15秒', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '30秒', exact: true })).toBeVisible()

    // 15秒を選択
    await page.getByRole('button', { name: '15秒', exact: true }).click()
  })

  test('目標音セレクターで音を変更できる', async ({ page }) => {
    const select = page.locator('select').last()
    // セレクタが存在する
    await expect(select).toBeVisible()
    // optgroup が存在する (呂音 / 甲音 / 大甲音)
    await expect(page.locator('optgroup')).toHaveCount(3)
  })

  test('マイク未起動時は開始ボタンが無効', async ({ page }) => {
    const startBtn = page.getByRole('button', { name: 'マイクを開始してください' })
    await expect(startBtn).toBeVisible()
    await expect(startBtn).toBeDisabled()
  })

  test('マイク起動後に開始ボタンが有効になる', async ({ page }) => {
    await startMicrophone(page)
    const startBtn = page.getByRole('button', { name: '開始' })
    await expect(startBtn).toBeEnabled()
  })

  test('開始でカウントダウンが表示される', async ({ page }) => {
    await startMicrophone(page)
    await page.getByRole('button', { name: '開始' }).click()

    // カウントダウン表示
    await expect(page.locator('[data-testid="countdown-number"]')).toBeVisible()
  })

  test('運指プレビューが設定画面に表示される', async ({ page }) => {
    // 運指図が表示される
    await expect(page.locator('div[role="img"][aria-label="運指図"]').first()).toBeVisible()
  })
})
