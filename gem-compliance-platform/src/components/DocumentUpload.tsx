'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { uploadDocument, type UploadState } from '@/lib/actions';
import { UploadIcon } from '@/components/icons';

const INITIAL: UploadState = { status: 'idle' };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? 'Uploading…' : 'Upload & extract'}
    </button>
  );
}

export function DocumentUpload({
  bidderId,
  docType = 'LOCAL_CONTENT_CERTIFICATE',
  label = 'Local Content Certificate',
  disabled = false,
  disabledTitle,
  disabledNote,
}: {
  bidderId: string;
  docType?: string;
  label?: string;
  /** e.g. the tender waived this requirement, or the viewer is read-only. */
  disabled?: boolean;
  /** Heading for the disabled state; defaults to the tender-waiver wording. */
  disabledTitle?: string;
  disabledNote?: string;
}) {
  const [state, formAction] = useFormState(uploadDocument, INITIAL);

  if (disabled) {
    return (
      <div className="space-y-1 rounded border border-dashed border-line bg-surface-container p-3">
        <p className="text-xs font-medium text-ink-muted">
          {disabledTitle ?? `Upload ${label} — not accepted for this tender`}
        </p>
        {disabledNote && <p className="text-xs text-ink-faint">{disabledNote}</p>}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-2 rounded border border-dashed border-line p-3">
      <input type="hidden" name="bidderId" value={bidderId} />
      <input type="hidden" name="docType" value={docType} />
      <label className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
        <UploadIcon className="h-4 w-4 text-navy" />
        Upload {label} (PDF, PNG, JPEG or WebP · max 8 MB)
      </label>
      <input
        type="file"
        name="file"
        required
        accept="application/pdf,image/png,image/jpeg,image/webp"
        className="block w-full text-sm text-ink-muted file:mr-2 file:rounded file:border-0 file:bg-surface-high file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-surface-highest"
      />
      <SubmitButton />
      {state.status === 'error' && <p className="text-xs text-critical">{state.message}</p>}
      {state.status === 'ok' && <p className="text-xs text-indiagreen-700">{state.message}</p>}
      <p className="text-xs text-ink-faint">
        The AI extraction step reads the uploaded file directly via a multimodal LLM call — no separate OCR. Uploading
        replaces any existing {label.toLowerCase()} for this bidder.
      </p>
    </form>
  );
}
