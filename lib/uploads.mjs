import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { storageConfig } from './security.mjs';

export const UPLOAD_BUCKET = 'workspace-uploads';
/** @type {Record<string, string>} */
export const IMAGE_TYPES = { png: 'image/png', jpg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' };

/** @param {string} name @param {Buffer} bytes @param {string} contentType */
export async function saveImage(name, bytes, contentType) {
  const config = storageConfig();
  if (config.mode === 'supabase') {
    const client = createClient(config.url, config.key, { auth: { persistSession: false } });
    const { error } = await client.storage.from(UPLOAD_BUCKET).upload(name, bytes, { contentType, upsert: false });
    if (error) throw new Error('Image storage failed.');
    return;
  }
  const directory = path.resolve(config.directory, 'uploads');
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  await fs.writeFile(path.join(directory, name), bytes, { flag: 'wx', mode: 0o600 });
}

/** @param {string} name */
export async function loadImage(name) {
  const config = storageConfig();
  if (config.mode === 'supabase') {
    const client = createClient(config.url, config.key, { auth: { persistSession: false } });
    const { data, error } = await client.storage.from(UPLOAD_BUCKET).download(name);
    if (error) {
      if ('statusCode' in error && String(error.statusCode) === '404') return null;
      throw new Error('Image storage failed.');
    }
    return data;
  }
  try { return await fs.readFile(path.resolve(config.directory, 'uploads', name)); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
