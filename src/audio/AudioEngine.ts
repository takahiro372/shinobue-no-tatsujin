/**
 * マイク入力管理
 *
 * Web Audio API を使ってマイクからの音声ストリームを取得し、
 * 分析用のバッファを提供する。
 */
export class AudioEngine {
  private audioContext: AudioContext | null = null
  private mediaStream: MediaStream | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null
  private analyserNode: AnalyserNode | null = null
  private _isRunning = false

  get isRunning(): boolean {
    return this._isRunning
  }

  get sampleRate(): number {
    return this.audioContext?.sampleRate ?? 44100
  }

  /**
   * マイク入力を開始
   */
  async start(deviceId?: string): Promise<void> {
    if (this._isRunning) return

    const constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
      },
    }

    this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
    this.audioContext = new AudioContext()
    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream)

    this.analyserNode = this.audioContext.createAnalyser()
    this.analyserNode.fftSize = 4096
    this.analyserNode.smoothingTimeConstant = 0

    this.sourceNode.connect(this.analyserNode)
    this._isRunning = true
  }

  /**
   * マイク入力を停止
   */
  stop(): void {
    if (this.sourceNode) {
      this.sourceNode.disconnect()
      this.sourceNode = null
    }
    if (this.mediaStream) {
      for (const track of this.mediaStream.getTracks()) {
        track.stop()
      }
      this.mediaStream = null
    }
    if (this.audioContext) {
      void this.audioContext.close()
      this.audioContext = null
    }
    this.analyserNode = null
    this._isRunning = false
  }

  /**
   * 現在の時間領域データを取得（Float32Array）
   */
  getTimeDomainData(bufferSize = 2048): Float32Array {
    const buffer = new Float32Array(bufferSize)
    if (this.analyserNode) {
      this.analyserNode.getFloatTimeDomainData(buffer)
    }
    return buffer
  }

  /**
   * 現在の音量(RMS)を dB で取得
   */
  getVolume(): number {
    if (!this.analyserNode) return -Infinity
    const buffer = this.getTimeDomainData()
    let sumSquares = 0
    for (let i = 0; i < buffer.length; i++) {
      sumSquares += buffer[i]! * buffer[i]!
    }
    const rms = Math.sqrt(sumSquares / buffer.length)
    if (rms === 0) return -Infinity
    return 20 * Math.log10(rms)
  }
}
