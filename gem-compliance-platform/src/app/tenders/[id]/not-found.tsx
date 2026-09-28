import Link from 'next/link';

export default function TenderNotFound() {
  return (
    <div className="card p-6">
      <h2 className="font-heading text-h2 text-navy">Tender not found</h2>
      <p className="mt-1 text-sm text-ink-muted">
        This tender doesn&apos;t exist — the database may have been re-seeded with fresh IDs.
      </p>
      <Link href="/dashboard" className="btn-primary mt-4">
        Back to dashboard
      </Link>
    </div>
  );
}
