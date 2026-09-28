'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from './db';
import { runVerificationForBidder } from './orchestrator';
import { logAudit } from './auditLog';
import { getSession } from './session';
import { canRunVerification, canUploadDocumentFor, canRecordDecision } from './access';

async function revalidateBidder(bidderId: string) {
  const b = await prisma.bidder.findUnique({ where: { id: bidderId }, select: { tenderId: true } });
  revalidatePath('/dashboard');
  if (b) revalidatePath(`/tenders/${b.tenderId}`);
  revalidatePath(`/bidders/${bidderId}`);
}

export async function runVerification(bidderId: string) {
  const session = getSession();
  if (!session) throw new Error('Session expired — sign in again.');
  if (!canRunVerification(session)) throw new Error('Only a Procurement Officer can run verification.');
  if (!bidderId) throw new Error('Missing bidder.');
  await runVerificationForBidder(bidderId);
  await revalidateBidder(bidderId);
}

export async function batchRunVerification(tenderId: string): Promise<{ total: number; verified: number }> {
  const session = getSession();
  if (!session) throw new Error('Session expired — sign in again.');
  if (!canRunVerification(session)) throw new Error('Only a Procurement Officer can run verification.');
  if (!tenderId) throw new Error('Missing tender.');

  const bidders = await prisma.bidder.findMany({
    where: { tenderId },
    select: { id: true },
  });

  let count = 0;
  for (const b of bidders) {
    await runVerificationForBidder(b.id);
    count++;
  }

  revalidatePath('/dashboard');
  revalidatePath(`/tenders/${tenderId}`);
  revalidatePath('/bidders');
  return { total: bidders.length, verified: count };
}

export type UploadState = { status: 'idle' } | { status: 'ok'; message: string } | { status: 'error'; message: string };

const ALLOWED_UPLOAD_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB

/**
 * Uploads a real document file (PDF/image) for a bidder. The file is stored
 * on the Document row and read directly by the multimodal AI extraction
 * step on the next verification run. Uploading replaces any existing
 * document of the same type for that bidder.
 *
 * Form-state action shape (used with useFormState) so validation errors
 * surface in the UI instead of throwing.
 */
export async function uploadDocument(_prev: UploadState, formData: FormData): Promise<UploadState> {
  try {
    const session = getSession();
    if (!session) return { status: 'error', message: 'Session expired — sign in again.' };

    const bidderId = String(formData.get('bidderId') ?? '');
    const docType = String(formData.get('docType') ?? 'LOCAL_CONTENT_CERTIFICATE');
    const file = formData.get('file');

    if (!bidderId) return { status: 'error', message: 'Missing bidder.' };

    // The real access control: the Procurement Officer can upload for anyone;
    // a Bidder can upload only for their own company. A Viewer, or a Bidder
    // targeting another company's bidderId, is rejected here regardless of
    // what the UI showed.
    const targetBidder = await prisma.bidder.findUnique({
      where: { id: bidderId },
      select: { companySlug: true, name: true },
    });
    if (!targetBidder) return { status: 'error', message: 'Unknown bidder.' };
    if (!canUploadDocumentFor(session, targetBidder.companySlug)) {
      return {
        status: 'error',
        message:
          session.role === 'bidder'
            ? 'You can only upload documents for your own company.'
            : 'Only a Procurement Officer can upload documents.',
      };
    }
    const isOwnBidder = session.role === 'bidder';
    if (!(file instanceof File) || file.size === 0) return { status: 'error', message: 'Choose a file to upload.' };
    if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
      return { status: 'error', message: `Unsupported file type "${file.type || 'unknown'}". Upload a PDF, PNG, JPEG, or WebP.` };
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return { status: 'error', message: `File is ${(file.size / 1024 / 1024).toFixed(1)} MB; the limit is 8 MB.` };
    }

    const bytes = Buffer.from(await file.arrayBuffer());

    await prisma.$transaction([
      prisma.document.deleteMany({ where: { bidderId, docType } }),
      prisma.document.create({
        data: { bidderId, docType, fileName: file.name, mimeType: file.type, fileData: bytes, rawText: null },
      }),
    ]);

    await logAudit({
      bidderId,
      actor: isOwnBidder ? `${targetBidder.name} (bidder)` : session.name,
      action: 'DOCUMENT_UPLOADED',
      details: { docType, fileName: file.name, mimeType: file.type, sizeBytes: file.size },
    });

    revalidatePath(`/bidders/${bidderId}`);
    return {
      status: 'ok',
      message: isOwnBidder
        ? `Uploaded ${file.name}. The Procurement Officer will see it on the next verification run.`
        : `Uploaded ${file.name}. Re-run verification to check it.`,
    };
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'Upload failed.' };
  }
}

export type DecisionState = { status: 'idle' } | { status: 'ok'; message: string } | { status: 'error'; message: string };

/**
 * Records the Procurement Officer's final call. Form-state action shape
 * (used with useFormState) so validation errors surface in the UI.
 */
export async function recordDecision(_prev: DecisionState, formData: FormData): Promise<DecisionState> {
  try {
    const session = getSession();
    if (!session) return { status: 'error', message: 'Session expired — sign in again.' };
    if (!canRecordDecision(session)) {
      return { status: 'error', message: 'Only a Procurement Officer can record decisions.' };
    }
    const officerName = session.name;

    const bidderId = String(formData.get('bidderId') ?? '');
    const outcome = String(formData.get('outcome') ?? '');
    const remarks = String(formData.get('remarks') ?? '').trim();

    if (!bidderId) return { status: 'error', message: 'Missing bidder.' };
    if (!outcome) return { status: 'error', message: 'Choose a decision.' };

    await prisma.decision.create({
      data: { bidderId, officerName, outcome, remarks: remarks || null },
    });

    await logAudit({
      bidderId,
      actor: officerName,
      action: 'PO_DECISION_RECORDED',
      details: { outcome, remarks },
    });

    await revalidateBidder(bidderId);
    return { status: 'ok', message: `Decision recorded: ${outcome}.` };
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'Could not record decision.' };
  }
}
