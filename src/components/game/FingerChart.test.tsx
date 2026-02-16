import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FingerChart, FingeringDiagram } from './FingerChart'

describe('FingerChart', () => {
  it('七本調子の運指表タイトルが表示される', () => {
    render(<FingerChart shinobueKey="nana" />)
    expect(screen.getByText('運指表')).toBeInTheDocument()
  })

  it('七本調子の全音名が表示される', () => {
    render(<FingerChart shinobueKey="nana" />)
    expect(screen.getByText('筒音')).toBeInTheDocument()
    expect(screen.getByText('一')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('大1')).toBeInTheDocument()
  })

  it('六本調子に切り替えるとA4が筒音として表示される', () => {
    render(<FingerChart shinobueKey="roku" />)
    expect(screen.getByText('筒音')).toBeInTheDocument()
    expect(screen.getByText('A4')).toBeInTheDocument()
  })

  it('activeNote が指定されるとハイライトされる', () => {
    const note = {
      number: 3,
      register: 'ro' as const,
      fingering: [true, true, true, true, false, false, false],
      western: 'E5',
      frequency: 659.25,
      name: '三',
    }
    render(<FingerChart shinobueKey="nana" activeNote={note} />)
    // アクティブな音が大きく表示される
    const headings = screen.getAllByText('三')
    expect(headings.length).toBeGreaterThanOrEqual(2) // 大きい表示 + 表内
  })
})

describe('FingeringDiagram', () => {
  it('7つの穴を表示する', () => {
    render(
      <FingeringDiagram
        fingering={[true, true, true, false, false, false, false]}
      />,
    )
    const container = screen.getByRole('img')
    const allHoles = container.querySelectorAll('[aria-label*="穴"]')
    expect(allHoles).toHaveLength(7)
  })

  it('閉じた穴と開いた穴のaria-labelが正しい', () => {
    render(
      <FingeringDiagram
        fingering={[true, false, true, false, true, false, true]}
      />,
    )
    expect(screen.getByLabelText('1穴: 閉')).toBeInTheDocument()
    expect(screen.getByLabelText('2穴: 開')).toBeInTheDocument()
    expect(screen.getByLabelText('3穴: 閉')).toBeInTheDocument()
    expect(screen.getByLabelText('4穴: 開')).toBeInTheDocument()
  })
})
