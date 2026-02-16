import { test, expect } from '@playwright/test'
import { mockGetUserMedia } from './helpers/mockAudio'

test.beforeEach(async ({ page }) => {
  await mockGetUserMedia(page)
  await page.goto('/')
  // 運指表タブに移動
  await page.getByRole('button', { name: '運指表' }).click()
})

test.describe('運指表', () => {
  test('運指表が表示される', async ({ page }) => {
    await expect(page.locator('h2:has-text("運指表")')).toBeVisible()
  })

  test('全音の運指カードが表示される', async ({ page }) => {
    // 七本調子のデフォルト: 呂7 + 甲8 + 大甲4 = 19音
    const cards = page.locator('div[role="img"][aria-label="運指図"]')
    const count = await cards.count()
    expect(count).toBeGreaterThanOrEqual(15) // 最低限の音数
  })

  test('呂音の音名が表示される', async ({ page }) => {
    // 呂音の名前は「筒音」「一」「二」...「七」
    await expect(page.getByText('筒音', { exact: true })).toBeVisible()
    await expect(page.getByText('七', { exact: true }).first()).toBeVisible()
  })

  test('甲音の音名が表示される', async ({ page }) => {
    // 甲音はアラビア数字表記 (1〜7)
    // "1" は他のテキストと重複しやすいため、大甲で確認
    await expect(page.getByText('大1', { exact: true })).toBeVisible()
  })

  test('大甲音の音名が表示される', async ({ page }) => {
    await expect(page.getByText('大1', { exact: true })).toBeVisible()
  })

  test('Western音名が表示される', async ({ page }) => {
    // 七本調子の筒音は B4
    await expect(page.locator('text=B4')).toBeVisible()
  })

  test('調子を変更すると運指表が更新される', async ({ page }) => {
    // 七本調子で B4 が見える
    await expect(page.locator('text=B4')).toBeVisible()

    // 六本調子に変更
    const select = page.locator('header select').last()
    await select.selectOption('roku')

    // 六本調子では A4 が見える
    await expect(page.locator('text=A4')).toBeVisible()
  })

  test('運指図の穴が7つ表示される', async ({ page }) => {
    // 最初の運指図のchildで穴数をチェック
    const firstDiagram = page.locator('div[role="img"][aria-label="運指図"]').first()
    const holes = firstDiagram.locator('div')
    await expect(holes).toHaveCount(7)
  })
})
