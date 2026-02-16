import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PitchMeter } from './PitchMeter'

describe('PitchMeter', () => {
  it('非アクティブ時は --- を表示', () => {
    render(<PitchMeter centOffset={0} isActive={false} />)
    expect(screen.getByText('---')).toBeInTheDocument()
  })

  it('アクティブ時にセント値を表示する', () => {
    render(<PitchMeter centOffset={12.5} isActive={true} />)
    expect(screen.getByText('+12.5 cent')).toBeInTheDocument()
  })

  it('負のセント値を表示する', () => {
    render(<PitchMeter centOffset={-8.3} isActive={true} />)
    expect(screen.getByText('-8.3 cent')).toBeInTheDocument()
  })

  it('目盛りの -50, 0, +50 を表示する', () => {
    render(<PitchMeter centOffset={0} isActive={true} />)
    expect(screen.getByText('-50')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('+50')).toBeInTheDocument()
  })
})
