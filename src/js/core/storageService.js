import { readImageFile } from '../shared/utils/helpers.js';

/**
 * Reads an image file as a local base64 data URL for storage in localStorage.
 * @param {File} file - The file object to read
 * @returns {Promise<string|null>} A base64 data URL, or null if failed
 */
export async function uploadImage(file) {
  if (!file) return null;
  try {
    return await readImageFile(file);
  } catch (err) {
    console.error('Unexpected error reading image:', err);
    return null;
  }
}
