/**
 * Google Drive Data Fetcher with Resilient Local Fallback & Mismatch Prevention
 *
 * Primary: Fetches JSON files directly from Google Drive if VITE_GDRIVE_FILE_IDS or
 * Google Drive direct URLs are configured.
 *
 * Resilience & Fallback: If Google Drive returns an error (404, 403, CORS, or unshared file),
 * it automatically falls back to local static datasets (/data/{table}.json), ensuring
 * the dashboard UI never breaks or displays empty charts.
 */

const fileIdsRaw = import.meta.env.VITE_GDRIVE_FILE_IDS
let fileIdsMap: Record<string, string> = {}

if (fileIdsRaw) {
  try {
    fileIdsMap = JSON.parse(fileIdsRaw)
  } catch (e) {
    console.warn('Failed to parse VITE_GDRIVE_FILE_IDS environment variable', e)
  }
}

const BASE_URL = import.meta.env.VITE_DATA_BASE_URL || `${import.meta.env.BASE_URL.replace(/\/$/, '')}/data`

export async function fetchGdriveJson<T>(table: string): Promise<T[]> {
  const fileId = fileIdsMap[table]
  const localUrl = `${BASE_URL}/${table}.json`

  // 1. Try Google Drive Direct URL if File ID is configured
  if (fileId && fileId.trim() !== '') {
    const gdriveUrl = `https://drive.google.com/uc?export=download&id=${fileId}`
    try {
      const resp = await fetch(gdriveUrl)
      if (resp.ok) {
        const gdriveData = await resp.json()
        if (Array.isArray(gdriveData) && gdriveData.length > 0) {
          return gdriveData as T[]
        }
      }
      console.warn(`[GDrive Sync Warning] Google Drive file for '${table}' returned invalid or empty data. Falling back to local data.`)
    } catch (err) {
      console.warn(`[GDrive Sync Error] Could not fetch '${table}' from Google Drive (${err}). Falling back to local file: ${localUrl}`)
    }
  }

  // 2. Primary / Fallback: Fetch from Local static JSON dataset (/data/{table}.json)
  const localResp = await fetch(localUrl)
  if (!localResp.ok) {
    throw new Error(`Failed to fetch dataset for '${table}' from ${localUrl}: ${localResp.statusText}`)
  }

  const localData = await localResp.json()
  return localData as T[]
}
