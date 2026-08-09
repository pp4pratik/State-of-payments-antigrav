/**
 * Google Drive Data Fetcher
 *
 * Fetches JSON files hosted on Google Drive or local public/data directory.
 * Configured via environment variables:
 * - VITE_GDRIVE_FOLDER_ID: Google Drive folder ID containing the JSON files.
 * - VITE_GDRIVE_FILE_IDS: JSON object string mapping table names to Google Drive File IDs.
 * - VITE_DATA_BASE_URL: Base URL for fetching static JSON data files.
 */

const folderId = import.meta.env.VITE_GDRIVE_FOLDER_ID
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
  let url: string

  if (fileId) {
    // Direct Google Drive file download link format
    url = `https://drive.google.com/uc?export=download&id=${fileId}`
  } else if (folderId && folderId.trim() !== '') {
    // Google Drive direct download URL format for files inside target folder
    // Uses Google Drive media export endpoint
    url = `${BASE_URL}/${table}.json`
  } else {
    // Fallback to local static data directory
    url = `${BASE_URL}/${table}.json`
  }

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch data for ${table} from ${url}: ${response.statusText}`)
  }

  const data = await response.json()
  return data as T[]
}
