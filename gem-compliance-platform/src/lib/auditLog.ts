import { prisma } from './db';

/**
 * Every verification check, score computation, and PO decision writes
 * here. This is explicitly required by the problem statement ("maintain
 * an auditable record of verification and compliance checks") and is
 * cheap to get right if it's threaded through from day one instead of
 * bolted on later.
 */
export async function logAudit(params: { bidderId?: string; actor: string; action: string; details: Record<string, unknown> }) {
  await prisma.auditLog.create({
    data: {
      bidderId: params.bidderId,
      actor: params.actor,
      action: params.action,
      details: JSON.stringify(params.details),
    },
  });
}
