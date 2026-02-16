import { useState, useRef, useCallback } from 'react'
import { AudioEngine } from '../audio/AudioEngine'

export interface AudioInputState {
  isRunning: boolean
  error: string | null
  volume: number
}

export function useAudioInput() {
  const engineRef = useRef<AudioEngine | null>(null)
  const [state, setState] = useState<AudioInputState>({
    isRunning: false,
    error: null,
    volume: -Infinity,
  })

  const start = useCallback(async (deviceId?: string) => {
    try {
      // 既存エンジンがあれば先に停止
      if (engineRef.current) {
        engineRef.current.stop()
        engineRef.current = null
      }
      const engine = new AudioEngine()
      await engine.start(deviceId)
      engineRef.current = engine
      setState({ isRunning: true, error: null, volume: -Infinity })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'マイクへのアクセスに失敗しました'
      setState({ isRunning: false, error: message, volume: -Infinity })
    }
  }, [])

  const stop = useCallback(() => {
    engineRef.current?.stop()
    engineRef.current = null
    setState({ isRunning: false, error: null, volume: -Infinity })
  }, [])

  const getTimeDomainData = useCallback((bufferSize?: number): Float32Array | null => {
    if (!engineRef.current?.isRunning) return null
    return engineRef.current.getTimeDomainData(bufferSize)
  }, [])

  const getVolume = useCallback((): number => {
    if (!engineRef.current?.isRunning) return -Infinity
    return engineRef.current.getVolume()
  }, [])

  const getSampleRate = useCallback((): number => {
    return engineRef.current?.sampleRate ?? 44100
  }, [])

  return {
    ...state,
    start,
    stop,
    getTimeDomainData,
    getVolume,
    getSampleRate,
  }
}
