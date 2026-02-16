import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import {
  saveSong,
  getSongs,
  getSong,
  deleteSong,
  generateSongId,
} from './songStorage'
import type { SavedSong } from './songStorage'
import { createEmptyScore } from '../score/ScoreModel'

function makeSong(overrides?: Partial<SavedSong>): SavedSong {
  return {
    id: generateSongId(),
    title: 'テスト曲',
    score: createEmptyScore({ title: 'テスト曲' }),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }
}

beforeEach(() => {
  indexedDB = new IDBFactory()
})

describe('songStorage', () => {
  describe('generateSongId', () => {
    it('ユニークなIDを生成する', () => {
      const id1 = generateSongId()
      const id2 = generateSongId()
      expect(id1).toMatch(/^song-\d+-[a-z0-9]+$/)
      expect(id1).not.toBe(id2)
    })
  })

  describe('saveSong / getSongs', () => {
    it('楽曲を保存して取得できる', async () => {
      const song = makeSong()
      await saveSong(song)

      const songs = await getSongs()
      expect(songs).toHaveLength(1)
      expect(songs[0]!.id).toBe(song.id)
      expect(songs[0]!.title).toBe('テスト曲')
    })

    it('updatedAt 降順で返される', async () => {
      await saveSong(makeSong({ id: 'a', updatedAt: 100 }))
      await saveSong(makeSong({ id: 'b', updatedAt: 300 }))
      await saveSong(makeSong({ id: 'c', updatedAt: 200 }))

      const songs = await getSongs()
      expect(songs[0]!.id).toBe('b')
      expect(songs[1]!.id).toBe('c')
      expect(songs[2]!.id).toBe('a')
    })

    it('同じIDで上書き保存できる', async () => {
      const song = makeSong({ id: 'same-id', title: '元の曲' })
      await saveSong(song)

      await saveSong({ ...song, title: '更新後の曲', updatedAt: Date.now() + 1000 })

      const songs = await getSongs()
      expect(songs).toHaveLength(1)
      expect(songs[0]!.title).toBe('更新後の曲')
    })
  })

  describe('getSong', () => {
    it('IDで1件取得できる', async () => {
      const song = makeSong({ id: 'target-id' })
      await saveSong(song)

      const result = await getSong('target-id')
      expect(result).toBeDefined()
      expect(result!.title).toBe('テスト曲')
    })

    it('存在しないIDはundefined', async () => {
      const result = await getSong('nonexistent')
      expect(result).toBeUndefined()
    })
  })

  describe('deleteSong', () => {
    it('楽曲を削除できる', async () => {
      const song = makeSong()
      await saveSong(song)
      await deleteSong(song.id)

      const songs = await getSongs()
      expect(songs).toHaveLength(0)
    })
  })
})
