'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { recordDecision, type DecisionState } from '@/lib/actions';
import { ClipboardIcon, PencilIcon, UserIcon } from '@/components/icons';

const INITIAL: DecisionState = { status: 'idle' };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? 'Recording…' : 'Record Decision'}
    </button>
  );
}

export function DecisionForm({
  bidderId,
  officerName,
  canRecord,
}: {
  bidderId: string;
  officerName: string;
  canRecord: boolean;
}) {
  const [state, formAction] = useFormState(recordDecision, INITIAL);

  if (!canRecord) {
    return (
      <div className="card">
        <h3 className="section-title">Procurement Officer Decision</h3>
        <p className="text-sm text-ink-muted">
          You are signed in as a Viewer. Only a Procurement Officer can record a qualify / disqualify decision.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="card space-y-3">
      <h3 className="section-title">Procurement Officer Decision</h3>
      <input type="hidden" name="bidderId" value={bidderId} />
      <div>
        <span className="block text-xs font-medium text-ink-muted">Recording as</span>
        <span className="mt-1 flex items-center gap-1.5 text-sm font-medium text-ink">
          <UserIcon className="h-4 w-4 text-navy" />
          {officerName} · Procurement Officer
        </span>
      </div>
      <div>
        <label className="block text-xs font-medium text-ink-muted">Decision</label>
        <div className="relative mt-1">
          <ClipboardIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy" />
          <select name="outcome" required className="field pl-8">
            <option value="QUALIFIED">Qualified</option>
            <option value="CONDITIONAL">Conditional (pending clarification)</option>
            <option value="DISQUALIFIED">Disqualified</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-ink-muted">Remarks (optional)</label>
        <div className="relative mt-1">
          <PencilIcon className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-navy" />
          <textarea name="remarks" rows={2} className="field pl-8" />
        </div>
      </div>
      <p className="text-xs text-ink-faint">
        This decision is recorded separately from the AI recommendation and is always the Procurement Officer&apos;s own call.
      </p>
      <SubmitButton />
      {state.status === 'error' && <p className="text-xs text-critical">{state.message}</p>}
      {state.status === 'ok' && <p className="text-xs text-indiagreen-700">{state.message}</p>}
    </form>
  );
}
