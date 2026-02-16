import type { Page } from '@playwright/test'

/**
 * getUserMedia をモックし、無音の MediaStream を返す。
 * AudioContext / AnalyserNode は最小限の stub を提供する。
 */
export async function mockGetUserMedia(page: Page) {
  await page.addInitScript(() => {
    // --- MediaStream stub ---
    const fakeTrack = {
      kind: 'audio',
      enabled: true,
      readyState: 'live',
      stop() { this.readyState = 'ended' },
      getSettings() { return { sampleRate: 44100, channelCount: 1 } },
      addEventListener() {},
      removeEventListener() {},
    }
    const fakeStream = {
      getAudioTracks() { return [fakeTrack] },
      getTracks() { return [fakeTrack] },
      active: true,
    }

    // --- Override getUserMedia ---
    navigator.mediaDevices.getUserMedia = async () => fakeStream as unknown as MediaStream

    // --- AudioContext stub ---
    const OrigAudioContext = window.AudioContext || (window as any).webkitAudioContext
    const FakeAudioContext = class extends OrigAudioContext {
      createMediaStreamSource(_stream: MediaStream) {
        // Create a silent OscillatorNode instead to avoid needing a real stream
        const osc = this.createOscillator()
        osc.frequency.value = 0
        osc.start()
        // Return as AudioNode (duck-type for AnalyserNode connection)
        return osc as unknown as MediaStreamAudioSourceNode
      }
    }
    ;(window as any).AudioContext = FakeAudioContext
    ;(window as any).webkitAudioContext = FakeAudioContext
  })
}

/**
 * マイク開始ボタンをクリックして音声入力を開始する
 */
export async function startMicrophone(page: Page) {
  const micButton = page.getByRole('button', { name: 'マイク開始' })
  if (await micButton.isVisible()) {
    await micButton.click()
  }
}
