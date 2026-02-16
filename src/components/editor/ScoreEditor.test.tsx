import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EditorToolbar } from './EditorToolbar'
import { MeasureView } from './MeasureView'
import { NoteInput } from './NoteInput'
import type { Measure } from '../../score/ScoreModel'

describe('EditorToolbar', () => {
  const defaultProps = {
    currentDuration: 'quarter' as const,
    onDurationChange: () => {},
    onAddMeasure: () => {},
    canUndo: false,
    canRedo: false,
    onUndo: () => {},
    onRedo: () => {},
    tempo: 80,
    onTempoChange: () => {},
    title: 'テスト曲',
    onTitleChange: () => {},
    hasSelection: false,
    onDelete: () => {},
    onTie: () => {},
    onSave: () => {},
    onSaveAs: () => {},
    onImport: () => {},
    isDirty: false,
  }

  it('タイトル入力が表示される', () => {
    render(<EditorToolbar {...defaultProps} />)
    const input = screen.getByDisplayValue('テスト曲')
    expect(input).toBeInTheDocument()
  })

  it('音価ボタンが表示される（四分・八分・十六のみ）', () => {
    render(<EditorToolbar {...defaultProps} />)
    expect(screen.getByText('四分')).toBeInTheDocument()
    expect(screen.getByText('八分')).toBeInTheDocument()
    expect(screen.getByText('十六')).toBeInTheDocument()
    expect(screen.queryByText('全')).not.toBeInTheDocument()
    expect(screen.queryByText('二分')).not.toBeInTheDocument()
  })

  it('Undo/Redo ボタンが表示される', () => {
    render(<EditorToolbar {...defaultProps} />)
    expect(screen.getByText('↩ 戻す')).toBeInTheDocument()
    expect(screen.getByText('↪ やり直し')).toBeInTheDocument()
  })

  it('小節追加ボタンが表示される', () => {
    render(<EditorToolbar {...defaultProps} />)
    expect(screen.getByText('+ 小節追加')).toBeInTheDocument()
  })

  it('canUndo=false の時、戻すボタンが無効', () => {
    render(<EditorToolbar {...defaultProps} canUndo={false} />)
    const btn = screen.getByText('↩ 戻す')
    expect(btn).toBeDisabled()
  })

  it('削除ボタンが表示される', () => {
    render(<EditorToolbar {...defaultProps} />)
    expect(screen.getByTitle('選択中の音符を削除 (Delete)')).toBeInTheDocument()
  })

  it('hasSelection=false の時、削除ボタンが無効', () => {
    render(<EditorToolbar {...defaultProps} hasSelection={false} />)
    const btn = screen.getByTitle('選択中の音符を削除 (Delete)')
    expect(btn).toBeDisabled()
  })

  it('hasSelection=true の時、削除ボタンが有効', () => {
    render(<EditorToolbar {...defaultProps} hasSelection={true} />)
    const btn = screen.getByTitle('選択中の音符を削除 (Delete)')
    expect(btn).not.toBeDisabled()
  })

  it('削除ボタンクリックで onDelete が呼ばれる', () => {
    const onDelete = vi.fn()
    render(<EditorToolbar {...defaultProps} hasSelection={true} onDelete={onDelete} />)
    fireEvent.click(screen.getByTitle('選択中の音符を削除 (Delete)'))
    expect(onDelete).toHaveBeenCalledOnce()
  })

  it('保存ボタンが表示される', () => {
    render(<EditorToolbar {...defaultProps} />)
    expect(screen.getByTitle('保存 (Ctrl+S)')).toBeInTheDocument()
  })

  it('保存ボタンクリックで onSave が呼ばれる', () => {
    const onSave = vi.fn()
    render(<EditorToolbar {...defaultProps} onSave={onSave} />)
    fireEvent.click(screen.getByTitle('保存 (Ctrl+S)'))
    expect(onSave).toHaveBeenCalledOnce()
  })

  it('別名保存ボタンが表示される', () => {
    render(<EditorToolbar {...defaultProps} />)
    expect(screen.getByTitle('名前を付けて保存')).toBeInTheDocument()
  })

  it('別名保存ボタンクリックで onSaveAs が呼ばれる', () => {
    const onSaveAs = vi.fn()
    render(<EditorToolbar {...defaultProps} onSaveAs={onSaveAs} />)
    fireEvent.click(screen.getByTitle('名前を付けて保存'))
    expect(onSaveAs).toHaveBeenCalledOnce()
  })

  it('isDirty=true の時、保存ボタンが緑色になる', () => {
    const { container } = render(<EditorToolbar {...defaultProps} isDirty={true} />)
    const saveBtn = container.querySelector('[title="保存 (Ctrl+S)"]')
    expect(saveBtn?.className).toContain('bg-[#2D8B4E]')
  })

  it('インポートボタンが表示される', () => {
    render(<EditorToolbar {...defaultProps} />)
    expect(screen.getByTitle('MusicXMLファイルをインポート')).toBeInTheDocument()
  })

  it('インポートボタンクリックで onImport が呼ばれる', () => {
    const onImport = vi.fn()
    render(<EditorToolbar {...defaultProps} onImport={onImport} />)
    fireEvent.click(screen.getByTitle('MusicXMLファイルをインポート'))
    expect(onImport).toHaveBeenCalledOnce()
  })

  it('伸ばしボタンが表示される', () => {
    render(<EditorToolbar {...defaultProps} />)
    expect(screen.getByTitle('伸ばし（タイ）を追加/解除 (T)')).toBeInTheDocument()
  })

  it('hasSelection=false の時、伸ばしボタンが無効', () => {
    render(<EditorToolbar {...defaultProps} hasSelection={false} />)
    const btn = screen.getByTitle('伸ばし（タイ）を追加/解除 (T)')
    expect(btn).toBeDisabled()
  })

  it('伸ばしボタンクリックで onTie が呼ばれる', () => {
    const onTie = vi.fn()
    render(<EditorToolbar {...defaultProps} hasSelection={true} onTie={onTie} />)
    fireEvent.click(screen.getByTitle('伸ばし（タイ）を追加/解除 (T)'))
    expect(onTie).toHaveBeenCalledOnce()
  })
})

describe('MeasureView', () => {
  it('小節番号が表示される', () => {
    const measure: Measure = {
      number: 3,
      notes: [{ id: 'n1', type: 'rest', duration: { type: 'whole', dots: 0 }, startBeat: 0 }],
    }
    render(
      <MeasureView
        measure={measure}
        selectedNoteId={null}
        onNoteClick={() => {}}
        onEmptyClick={() => {}}
        onDeleteNote={() => {}}
      />,
    )
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('空の小節で + ボタンが表示される', () => {
    const measure: Measure = { number: 1, notes: [] }
    render(
      <MeasureView
        measure={measure}
        selectedNoteId={null}
        onNoteClick={() => {}}
        onEmptyClick={() => {}}
        onDeleteNote={() => {}}
      />,
    )
    expect(screen.getByText('+')).toBeInTheDocument()
  })

  it('選択中の音符は赤枠で表示される', () => {
    const measure: Measure = {
      number: 1,
      notes: [{ id: 'n1', type: 'rest', duration: { type: 'quarter', dots: 0 }, startBeat: 0 }],
    }
    const { container } = render(
      <MeasureView
        measure={measure}
        selectedNoteId="n1"
        onNoteClick={() => {}}
        onEmptyClick={() => {}}
        onDeleteNote={() => {}}
      />,
    )
    const selectedBtn = container.querySelector('.ring-\\[\\#C41E3A\\]')
    expect(selectedBtn).not.toBeNull()
  })

  it('タイ音符が「～」で表示される', () => {
    const measure: Measure = {
      number: 1,
      notes: [
        { id: 'n1', type: 'note', pitch: { shinobueNumber: 3, register: 'ro', frequency: 659, midiNote: 64, western: 'E5' }, duration: { type: 'quarter', dots: 0 }, startBeat: 0 },
        { id: 'n2', type: 'tie', duration: { type: 'quarter', dots: 0 }, startBeat: 1 },
      ],
    }
    render(
      <MeasureView
        measure={measure}
        selectedNoteId={null}
        onNoteClick={() => {}}
        onEmptyClick={() => {}}
        onDeleteNote={() => {}}
      />,
    )
    expect(screen.getByText('～')).toBeInTheDocument()
  })
})

describe('NoteInput', () => {
  it('呂音・甲音・大甲のセクションが表示される', () => {
    render(
      <NoteInput
        shinobueKey="nana"
        onNoteSelect={() => {}}
        onRestSelect={() => {}}
      />,
    )
    expect(screen.getByText('呂音')).toBeInTheDocument()
    expect(screen.getByText('甲音')).toBeInTheDocument()
    expect(screen.getByText('大甲')).toBeInTheDocument()
  })

  it('休符ボタンが表示される', () => {
    render(
      <NoteInput
        shinobueKey="nana"
        onNoteSelect={() => {}}
        onRestSelect={() => {}}
      />,
    )
    expect(screen.getByText('▼ (休符)')).toBeInTheDocument()
  })

  it('大甲ボタンが「大1 大2 大3 大4」と表示される', () => {
    render(
      <NoteInput
        shinobueKey="nana"
        onNoteSelect={() => {}}
        onRestSelect={() => {}}
      />,
    )
    expect(screen.getByText('大1')).toBeInTheDocument()
    expect(screen.getByText('大2')).toBeInTheDocument()
    expect(screen.getByText('大3')).toBeInTheDocument()
    expect(screen.getByText('大4')).toBeInTheDocument()
  })

  it('大甲は4つのみ（大5は表示されない）', () => {
    render(
      <NoteInput
        shinobueKey="nana"
        onNoteSelect={() => {}}
        onRestSelect={() => {}}
      />,
    )
    expect(screen.queryByText('大5')).not.toBeInTheDocument()
  })
})
