/**
 * AudioWorklet Processor for pitch detection
 *
 * メインスレッドをブロックしないためにWorkletで音声バッファを蓄積し、
 * 十分なサンプル数が溜まったら port.postMessage() で送信する。
 *
 * 注: このファイルは AudioWorklet として使用するため、
 * Vite の public/ ディレクトリか、特別なビルド設定が必要。
 * Phase 1 ではメインスレッドで直接 AnalyserNode + PitchDetector を使い、
 * Worklet 化は将来のパフォーマンス最適化で対応する。
 */

// AudioWorklet の型定義
declare class AudioWorkletProcessor {
  readonly port: MessagePort
  constructor()
  process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean
}
declare function registerProcessor(name: string, processorCtor: new () => AudioWorkletProcessor): void

const BUFFER_SIZE = 2048

class PitchProcessor extends AudioWorkletProcessor {
  private buffer: Float32Array
  private bufferIndex: number

  constructor() {
    super()
    this.buffer = new Float32Array(BUFFER_SIZE)
    this.bufferIndex = 0
  }

  process(inputs: Float32Array[][]): boolean {
    const input = inputs[0]?.[0]
    if (!input) return true

    for (let i = 0; i < input.length; i++) {
      this.buffer[this.bufferIndex] = input[i]!
      this.bufferIndex++

      if (this.bufferIndex >= BUFFER_SIZE) {
        this.port.postMessage({
          type: 'buffer',
          data: this.buffer.slice(),
        })
        this.bufferIndex = 0
      }
    }

    return true
  }
}

registerProcessor('pitch-processor', PitchProcessor)
