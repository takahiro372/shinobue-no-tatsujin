import { useState, useRef, useCallback, useEffect } from 'react'
import { PitchDetector, medianFilter } from '../audio/PitchDetector'
import { NoteClassifier } from '../audio/NoteClassifier'
import { useAudioInput } from './useAudioInput'
import { useSettingsStore } from '../store/settingsStore'
import type { PitchResult } from '../types/music'
import type { ClassifiedNote } from '../types/shinobue'

/** 生の検出データ（デバッグパネル用） */
export interface RawDetectionData {
  rawFrequency: number | null
  rawConfidence: number | null
  volume: number
  noiseGateActive: boolean
  belowConfidence: boolean
  sampleRate: number
}

export interface PitchDetectionState {
  isRunning: boolean
  error: string | null
  pitchResult: PitchResult | null
  classifiedNote: ClassifiedNote | null
  volume: number
  pitchHistory: PitchResult[]
  rawData: RawDetectionData
}

const HISTORY_MAX = 600 // 10秒分 (60fps)
const MEDIAN_WINDOW = 5

const DEFAULT_RAW_DATA: RawDetectionData = {
  rawFrequency: null,
  rawConfidence: null,
  volume: -Infinity,
  noiseGateActive: false,
  belowConfidence: false,
  sampleRate: 44100,
}

export function usePitchDetection() {
  const { shinobueKey, tuningA4, noiseGate, pitchConfidenceThreshold } = useSettingsStore()
  const audio = useAudioInput()
  const detectorRef = useRef<PitchDetector | null>(null)
  const classifierRef = useRef<NoteClassifier>(new NoteClassifier(shinobueKey))
  const rafRef = useRef<number>(0)
  const frequencyHistoryRef = useRef<number[]>([])

  const [state, setState] = useState<PitchDetectionState>({
    isRunning: false,
    error: null,
    pitchResult: null,
    classifiedNote: null,
    volume: -Infinity,
    pitchHistory: [],
    rawData: DEFAULT_RAW_DATA,
  })
  const pitchHistoryRef = useRef<PitchResult[]>([])
  const noiseGateRef = useRef(noiseGate)
  const confidenceRef = useRef(pitchConfidenceThreshold)

  // store の値が変わったら ref を更新
  useEffect(() => { noiseGateRef.current = noiseGate }, [noiseGate])
  useEffect(() => { confidenceRef.current = pitchConfidenceThreshold }, [pitchConfidenceThreshold])

  // 調子が変わったら NoteClassifier を更新
  useEffect(() => {
    classifierRef.current.setKey(shinobueKey)
  }, [shinobueKey])

  const processFrame = useCallback(() => {
    const buffer = audio.getTimeDomainData(2048)
    if (!buffer) {
      rafRef.current = requestAnimationFrame(processFrame)
      return
    }

    const volume = audio.getVolume()
    const sampleRate = audio.getSampleRate()

    // ノイズゲート: 音量が閾値以下なら無視
    if (volume < noiseGateRef.current) {
      setState((prev) => ({
        ...prev,
        volume,
        pitchResult: null,
        classifiedNote: null,
        rawData: {
          rawFrequency: null,
          rawConfidence: null,
          volume,
          noiseGateActive: true,
          belowConfidence: false,
          sampleRate,
        },
      }))
      rafRef.current = requestAnimationFrame(processFrame)
      return
    }

    const detector = detectorRef.current
    if (!detector) {
      rafRef.current = requestAnimationFrame(processFrame)
      return
    }

    const rawResult = detector.detect(buffer)

    const rawData: RawDetectionData = {
      rawFrequency: rawResult?.frequency ?? null,
      rawConfidence: rawResult?.confidence ?? null,
      volume,
      noiseGateActive: false,
      belowConfidence: rawResult !== null && rawResult.confidence < confidenceRef.current,
      sampleRate,
    }

    let pitchResult: PitchResult | null = null
    let classifiedNote: ClassifiedNote | null = null

    if (rawResult && rawResult.confidence >= confidenceRef.current) {
      // メディアンフィルタで平滑化
      frequencyHistoryRef.current.push(rawResult.frequency)
      if (frequencyHistoryRef.current.length > MEDIAN_WINDOW * 2) {
        frequencyHistoryRef.current = frequencyHistoryRef.current.slice(-MEDIAN_WINDOW * 2)
      }

      const smoothedFreq = medianFilter(frequencyHistoryRef.current, MEDIAN_WINDOW)
      pitchResult = { ...rawResult, frequency: smoothedFreq }

      classifiedNote = classifierRef.current.classify(smoothedFreq, rawResult.confidence)

      // 履歴に追加
      pitchHistoryRef.current.push(pitchResult)
      if (pitchHistoryRef.current.length > HISTORY_MAX) {
        pitchHistoryRef.current = pitchHistoryRef.current.slice(-HISTORY_MAX)
      }
    }

    setState({
      isRunning: true,
      error: null,
      pitchResult,
      classifiedNote,
      volume,
      pitchHistory: pitchHistoryRef.current,
      rawData,
    })

    rafRef.current = requestAnimationFrame(processFrame)
  }, [audio])

  const start = useCallback(async () => {
    try {
      await audio.start()
      const sampleRate = audio.getSampleRate()
      detectorRef.current = new PitchDetector({
        sampleRate,
        bufferSize: 2048,
        tuningA4,
        minFrequency: 100,
        maxFrequency: 4000,
        threshold: 0.15,
      })
      frequencyHistoryRef.current = []
      pitchHistoryRef.current = []
      setState((prev) => ({ ...prev, isRunning: true, error: null }))
      rafRef.current = requestAnimationFrame(processFrame)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'マイクの起動に失敗しました'
      setState((prev) => ({ ...prev, error: message }))
    }
  }, [audio, tuningA4, processFrame])

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    audio.stop()
    detectorRef.current = null
    setState({
      isRunning: false,
      error: null,
      pitchResult: null,
      classifiedNote: null,
      volume: -Infinity,
      pitchHistory: [],
      rawData: DEFAULT_RAW_DATA,
    })
  }, [audio])

  return { ...state, start, stop }
}
