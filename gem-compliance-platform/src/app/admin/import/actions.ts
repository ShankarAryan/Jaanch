'use server';

import { revalidatePath } from 'next/cache';
import { assertImportSecret } from '@/lib/import/adminGate';
import { commitImport } from '@/lib/import/commit';
import type { ImportMode, ImportReview } from '@/lib/import/types';

export type CommitState =
  | { status: 'idle' }
  | { status: 'ok'; message: string; notes: string[] }
  | { status: 'error'; message: string };

export async function commitImportAction(_prev: CommitState, formData: FormData): Promise<CommitState> {
  try {
    assertImportSecret(String(formData.get('secret') ?? ''));

    const mode = String(formData.get('mode') ?? '') as ImportMode;
    if (mode !== 'add' && mode !== 'replace-all') return { status: 'error', message: 'Bad import mode.' };

    const processedBy = String(formData.get('processedBy') ?? '').trim() || 'admin';

    let review: ImportReview;
    try {
      review = JSON.parse(String(formData.get('reviewJson') ?? '')) as ImportReview;
    } catch {
      return { status: 'error', message: 'Could not read the reviewed import data — re-open the file and try again.' };
    }
    if (!review?.sourcePath || !Array.isArray(review.entries)) {
      return { status: 'error', message: 'The reviewed import data is malformed — re-open the file and try again.' };
    }

    const result = await commitImport(review, mode, processedBy);

    revalidatePath('/admin/import');
    revalidatePath('/dashboard');

    return {
      status: 'ok',
      message: `${result.summary}`,
      notes: result.notes,
    };
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'Import failed.' };
  }
}
