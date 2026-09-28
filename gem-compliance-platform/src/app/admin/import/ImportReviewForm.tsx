'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { commitImportAction, type CommitState } from './actions';

const INITIAL: CommitState = { status: 'idle' };

function Buttons({ canReplaceAll }: { canReplaceAll: boolean }) {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="submit"
        name="mode"
        value="add"
        disabled={pending}
        className="btn-primary"
      >
        {pending ? 'Working…' : 'Add to database'}
      </button>
      <button
        type="submit"
        name="mode"
        value="replace-all"
        disabled={pending || !canReplaceAll}
        title={canReplaceAll ? undefined : 'Replace All needs at least one importable tender in the file.'}
        className="inline-flex items-center justify-center gap-1.5 rounded border border-critical/40 bg-critical/5 px-4 py-2 text-label text-critical transition-colors hover:bg-critical/10 disabled:opacity-40"
      >
        {pending ? 'Working…' : 'Replace ALL data'}
      </button>
    </div>
  );
}

export function ImportReviewForm({
  secret,
  reviewJson,
  canCommit,
  canReplaceAll,
}: {
  secret: string;
  reviewJson: string;
  canCommit: boolean;
  canReplaceAll: boolean;
}) {
  const [state, formAction] = useFormState(commitImportAction, INITIAL);

  return (
    <form action={formAction} className="card space-y-3 p-4">
      <input type="hidden" name="secret" value={secret} />
      <input type="hidden" name="reviewJson" value={reviewJson} />

      <div>
        <label className="block text-xs font-medium text-ink-muted">Processed by (recorded on the import batch)</label>
        <input
          name="processedBy"
          defaultValue="admin"
          className="field mt-1 max-w-xs"
        />
      </div>

      {!canCommit && (
        <p className="text-sm text-warning-fg">
          Nothing here can be committed — every extracted tender is missing a required field, and no bidder records were
          found. Fix the source file and re-upload it to the bucket.
        </p>
      )}

      {canCommit && (
        <>
          <p className="text-xs text-ink-muted">
            <strong>Add</strong> appends the rows above to the current database.{' '}
            <strong>Replace ALL</strong> deletes every existing tender, bidder, requirement, verification result, score,
            decision and audit log first (seed-script deletion order), then imports.
          </p>
          <Buttons canReplaceAll={canReplaceAll} />
        </>
      )}

      {state.status === 'error' && <p className="text-sm font-medium text-critical">{state.message}</p>}
      {state.status === 'ok' && (
        <div className="rounded-md border border-success/30 bg-success/10 p-3 text-sm text-indiagreen-700">
          <p className="font-medium">{state.message}</p>
          {state.notes.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs">
              {state.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
