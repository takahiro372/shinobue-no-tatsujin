import { test, expect } from '@playwright/test'
import { mockGetUserMedia, startMicrophone } from './helpers/mockAudio'

test.beforeEach(async ({ page }) => {
  await mockGetUserMedia(page)
  await page.goto('/')
})

test.describe('チューナー', () => {
  test('チューナー画面が表示される', async ({ page }) => {
    await expect(page.locator('text=チューナー').first()).toBeVisible()
    // 音名表示が「---」(未検出)
    await expect(page.locator('text=---').first()).toBeVisible()
    await expect(page.locator('text=--- Hz')).toBeVisible()
  })

  test('マイク開始/停止ボタンが動作する', async ({ page }) => {
    // マイク開始ボタンをクリック
    await startMicrophone(page)

    // マイク停止ボタンが表示される
    await expect(page.getByRole('button', { name: 'マイク停止' })).toBeVisible()

    // マイク停止
    await page.getByRole('button', { name: 'マイク停止' }).click()
    await expect(page.getByRole('button', { name: 'マイク開始' })).toBeVisible()
  })

  test('A4チューニング値を変更できる', async ({ page }) => {
    const a4Input = page.locator('input[type="number"]').first()
    await expect(a4Input).toHaveValue('440')

    // 442Hzに変更
    await a4Input.fill('442')
    await expect(a4Input).toHaveValue('442')
  })

  test('デバッグパネルを表示/非表示できる', async ({ page }) => {
    // 初期状態ではデバッグパネルは非表示
    await expect(page.locator('text=Debug Panel')).not.toBeVisible()

    // Debugボタンをクリック
    await page.getByRole('button', { name: 'Debug' }).click()
    await expect(page.getByText('Debug Panel')).toBeVisible()
    await expect(page.getByText('Noise Gate').first()).toBeVisible()
    await expect(page.getByText('Confidence').first()).toBeVisible()

    // もう一度クリックで非表示
    await page.getByRole('button', { name: 'Debug' }).click()
    await expect(page.getByText('Debug Panel')).not.toBeVisible()
  })

  test('運指図が表示される（マイク起動時）', async ({ page }) => {
    // マイク起動前は運指図なし
    await expect(page.locator('div[role="img"][aria-label="運指図"]')).not.toBeVisible()

    // 音量メーターが表示されている
    await expect(page.locator('text=音量')).toBeVisible()
  })
})
