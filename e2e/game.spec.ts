import { test, expect } from '@playwright/test'
import { mockGetUserMedia } from './helpers/mockAudio'

test.beforeEach(async ({ page }) => {
  await mockGetUserMedia(page)
  await page.goto('/')
  // ゲームタブに移動
  await page.getByRole('button', { name: 'ゲーム' }).click()
})

test.describe('ゲームモード', () => {
  test('ゲーム選択画面が表示される', async ({ page }) => {
    await expect(page.locator('text=ゲームモード')).toBeVisible()
    await expect(page.locator('[data-testid="start-game-button"]')).toBeVisible()
  })

  test('楽曲一覧が表示される', async ({ page }) => {
    await expect(page.locator('text=楽曲を選択')).toBeVisible()
    await expect(page.locator('text=さくらさくら')).toBeVisible()
    await expect(page.locator('text=荒城の月')).toBeVisible()
    await expect(page.locator('text=越天楽今様')).toBeVisible()
    await expect(page.locator('text=通りゃんせ')).toBeVisible()
    await expect(page.locator('text=音階練習曲')).toBeVisible()
  })

  test('楽曲を選択できる', async ({ page }) => {
    // 荒城の月を選択
    await page.locator('text=荒城の月').click()
  })

  test('難易度を選択できる', async ({ page }) => {
    await expect(page.getByText('難易度', { exact: true })).toBeVisible()
    const radios = page.locator('input[type="radio"]')
    await expect(radios).toHaveCount(4)

    // 入門
    await expect(page.getByText('入門', { exact: true })).toBeVisible()
    // 中級
    await expect(page.getByText('中級', { exact: true })).toBeVisible()
    // 上級
    await expect(page.getByText('上級', { exact: true })).toBeVisible()
    // 達人
    await expect(page.getByText('達人', { exact: true })).toBeVisible()
  })

  test('難易度を変更して開始できる', async ({ page }) => {
    // 楽曲が読み込まれるまで待つ
    await expect(page.locator('[data-testid="start-game-button"]')).toBeEnabled({ timeout: 5000 })

    // 達人を選択 (label内のdivテキスト)
    await page.getByText('達人', { exact: true }).click()

    // ゲーム開始
    await page.locator('[data-testid="start-game-button"]').click()

    // カウントダウンが表示される
    await expect(page.locator('[data-testid="countdown-number"]')).toBeVisible()
  })

  test('ゲーム開始後にスコアボードが表示される', async ({ page }) => {
    await expect(page.locator('[data-testid="start-game-button"]')).toBeEnabled({ timeout: 5000 })
    await page.locator('[data-testid="start-game-button"]').click()

    // スコアボードが表示される
    await expect(page.locator('[data-testid="score-value"]')).toBeVisible()
    await expect(page.locator('[data-testid="combo-value"]')).toBeVisible()
  })

  test('ゲーム中にやめるボタンで戻れる', async ({ page }) => {
    await expect(page.locator('[data-testid="start-game-button"]')).toBeEnabled({ timeout: 5000 })
    await page.locator('[data-testid="start-game-button"]').click()

    // やめるボタン
    await expect(page.locator('[data-testid="quit-button"]')).toBeVisible()
    await page.locator('[data-testid="quit-button"]').click()

    // ゲーム選択画面に戻る
    await expect(page.locator('text=ゲームモード')).toBeVisible()
  })

  test('ゲーム中に一時停止/再開ができる', async ({ page }) => {
    await expect(page.locator('[data-testid="start-game-button"]')).toBeEnabled({ timeout: 5000 })
    await page.locator('[data-testid="start-game-button"]').click()

    // カウントダウン終了を待つ (pause button appears after countdown)
    await expect(page.locator('[data-testid="pause-button"]')).toBeVisible({ timeout: 10000 })

    // 一時停止
    await page.locator('[data-testid="pause-button"]').click()
    // 一時停止テキストがオーバーレイに表示される
    await expect(page.locator('.text-4xl:has-text("一時停止")')).toBeVisible()

    // 再開
    await page.locator('[data-testid="pause-button"]').click()
    await expect(page.locator('.text-4xl:has-text("一時停止")')).not.toBeVisible()
  })
})
