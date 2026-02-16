const DB_NAME = 'shinobue-no-tatsujin'
const DB_VERSION = 2

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (event) => {
      const db = request.result
      const oldVersion = (event as IDBVersionChangeEvent).oldVersion

      // Version 1: practice store
      if (oldVersion < 1) {
        const store = db.createObjectStore('practice', { keyPath: 'id' })
        store.createIndex('date', 'date', { unique: false })
        store.createIndex('type', 'type', { unique: false })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }

      // Version 2: songs store
      if (oldVersion < 2) {
        const store = db.createObjectStore('songs', { keyPath: 'id' })
        store.createIndex('title', 'title', { unique: false })
        store.createIndex('updatedAt', 'updatedAt', { unique: false })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
