import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { mimeForFilename } from './import/mime';

export { mimeForFilename };

/**
 * Read-only access to the "dataset-uploads" Supabase Storage bucket, used by
 * the backstage /admin/import tool. A team member drops the organizers'
 * dataset files (PDF / Excel / ZIP) into this bucket through the Supabase
 * dashboard - the app never uploads; it only lists and fetches.
 *
 * Uses the service-role key, so this module is server-only and must never be
 * imported into a client component.
 */

export const DATASET_BUCKET = 'dataset-uploads';

function client() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set - the import tool cannot reach Storage.');
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export interface DatasetFile {
  name: string;
  path: string; // path within the bucket (same as name for a flat bucket)
  sizeBytes: number | null;
  updatedAt: string | null;
  mimeType: string | null;
}

/** Lists every file at the root of the dataset-uploads bucket. */
export async function listDatasetFiles(): Promise<DatasetFile[]> {
  const { data, error } = await client()
    .storage.from(DATASET_BUCKET)
    .list('', { limit: 200, sortBy: { column: 'name', order: 'asc' } });
  if (error) throw new Error(`Could not list the "${DATASET_BUCKET}" bucket: ${error.message}`);

  return (data ?? [])
    .filter((f) => f.id !== null) // Supabase lists sub-"folders" with id === null
    .map((f) => ({
      name: f.name,
      path: f.name,
      sizeBytes: (f.metadata?.size as number | undefined) ?? null,
      updatedAt: (f.updated_at as string | undefined) ?? f.created_at ?? null,
      mimeType: (f.metadata?.mimetype as string | undefined) ?? mimeForFilename(f.name),
    }));
}

/** Downloads one file from the bucket as a Buffer. */
export async function downloadDatasetFile(path: string): Promise<Buffer> {
  const { data, error } = await client().storage.from(DATASET_BUCKET).download(path);
  if (error || !data) throw new Error(`Could not download "${path}" from "${DATASET_BUCKET}": ${error?.message ?? 'no data'}`);
  return Buffer.from(await data.arrayBuffer());
}

/** Uploads a file buffer directly into the Supabase Storage bucket. */
export async function uploadFileToStorage(path: string, buffer: Buffer, mimeType: string): Promise<string> {
  const { data, error } = await client().storage.from(DATASET_BUCKET).upload(path, buffer, {
    contentType: mimeType,
    upsert: true,
  });
  if (error || !data) {
    throw new Error(`Could not upload "${path}" to "${DATASET_BUCKET}": ${error?.message ?? 'unknown error'}`);
  }
  return data.path;
}

/** Deletes a file from the Supabase Storage bucket. */
export async function deleteStorageFile(path: string): Promise<void> {
  const { error } = await client().storage.from(DATASET_BUCKET).remove([path]);
  if (error) {
    throw new Error(`Could not delete "${path}" from "${DATASET_BUCKET}": ${error.message}`);
  }
}

/** Returns the public URL for a file in Supabase Storage. */
export function getStoragePublicUrl(path: string): string {
  const { data } = client().storage.from(DATASET_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
