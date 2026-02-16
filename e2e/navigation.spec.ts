import { test, expect } from '@playwright/test'
import { mockGetUserMedia } from './helpers/mockAudio'

test.beforeEach(async ({ page }) => {
  await mockGetUserMedia(page)
  await page.goto('/')
})

test.describe('タブナビゲーション', () => {
  test('初期表示で練習タブがアクティブ', async ({ page }) => {
    // 練習タブのサブナビゲーション (チューナー等) が見える
    await expect(page.getByRole('button', { name: 'チューナー' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'ロングトーン' })).toBeVisible()
  })

  test('全タブを遷移できる', async ({ page }) => {
    // 楽譜エディタ
    await page.getByRole('button', { name: '楽譜エディタ', exact: true }).click()
    await expect(page.getByRole('button', { name: '楽譜エディタ', exact: true })).toBeVisible()

    // ゲーム
    await page.getByRole('button', { name: 'ゲーム', exact: true }).click()
    await expect(page.locator('text=ゲームモード')).toBeVisible()

    // 運指表
    await page.getByRole('button', { name: '運指表', exact: true }).click()
    await expect(page.locator('h2:has-text("運指表")')).toBeVisible()

    // 練習に戻る
    await page.getByRole('button', { name: '練習', exact: true }).click()
    await expect(page.getByRole('button', { name: 'チューナー' })).toBeVisible()
  })

  test('ヘッダーにタイトルが表示される', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('篠笛の達人')
  })

  test('調子セレクターで切り替えできる', async ({ page }) => {
    const select = page.locator('header select').last()
    // デフォルトは七本調子
    await expect(select).toHaveValue('nana')

    // 六本調子に変更
    await select.selectOption('roku')
    await expect(select).toHaveValue('roku')

    // 八本調子に変更
    await select.selectOption('hachi')
    await expect(select).toHaveValue('hachi')
  })

  test('テーマセレクターで切り替えできる', async ({ page }) => {
    const themeSelect = page.locator('select[aria-label="テーマ選択"]')
    await expect(themeSelect).toHaveValue('light')

    // ダークに変更
    await themeSelect.selectOption('dark')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

    // 和風に変更
    await themeSelect.selectOption('traditional')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'traditional')
  })
})
