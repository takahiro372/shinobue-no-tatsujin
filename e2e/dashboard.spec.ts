import { test, expect } from '@playwright/test'
import { mockGetUserMedia } from './helpers/mockAudio'

test.beforeEach(async ({ page }) => {
  await mockGetUserMedia(page)
  await page.goto('/')
  // 記録タブに移動
  await page.getByRole('button', { name: '記録' }).click()
})

test.describe('練習記録ダッシュボード', () => {
  test('ダッシュボードが表示される', async ({ page }) => {
    await expect(page.locator('text=練習記録')).toBeVisible()
  })

  test('サマリーカードが表示される', async ({ page }) => {
    await expect(page.locator('text=総セッション')).toBeVisible()
    await expect(page.locator('text=総練習時間')).toBeVisible()
    await expect(page.locator('text=連続日数')).toBeVisible()
    await expect(page.locator('text=最終練習日')).toBeVisible()
  })

  test('モード別統計が表示される', async ({ page }) => {
    await expect(page.locator('div').filter({ hasText: /^ロングトーン$/ })).toBeVisible()
    await expect(page.getByText('平均安定度')).toBeVisible()
    await expect(page.getByText('平均正解率').first()).toBeVisible()
  })

  test('カレンダーヒートマップが表示される', async ({ page }) => {
    await expect(page.locator('text=直近30日間')).toBeVisible()
  })

  test('記録がない場合のメッセージが表示される', async ({ page }) => {
    await expect(page.locator('text=まだ記録がありません')).toBeVisible()
  })

  test('マイクボタンはダッシュボードでは非表示', async ({ page }) => {
    // ダッシュボードタブではマイク開始ボタンがない
    await expect(page.getByRole('button', { name: 'マイク開始' })).not.toBeVisible()
  })

  test('記録タブから他のタブに遷移できる', async ({ page }) => {
    // チューナーに移動
    await page.getByRole('button', { name: 'チューナー' }).click()
    await expect(page.locator('text=チューナー').first()).toBeVisible()

    // 記録に戻る
    await page.getByRole('button', { name: '記録' }).click()
    await expect(page.locator('text=練習記録')).toBeVisible()
  })
})
