import { openDB } from './db'
import type { Score } from '../score/ScoreModel'

const STORE_NAME = 'songs'

export interface SavedSong {
  id: string
  title: string
  score: Score
  createdAt: number
  updatedAt: number
}

export function generateSongId(): string {
  return `song-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export async function saveSong(song: SavedSong): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(song)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getSongs(): Promise<SavedSong[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.index('updatedAt').openCursor(null, 'prev')
    const results: SavedSong[] = []

    request.onsuccess = () => {
      const cursor = request.result
      if (!cursor) {
        resolve(results)
        return
      }
      results.push(cursor.value as SavedSong)
      cursor.continue()
    }
    request.onerror = () => reject(request.error)
  })
}

export async function getSong(id: string): Promise<SavedSong | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const request = tx.objectStore(STORE_NAME).get(id)
    request.onsuccess = () => resolve(request.result as SavedSong | undefined)
    request.onerror = () => reject(request.error)
  })
}

export async function deleteSong(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
