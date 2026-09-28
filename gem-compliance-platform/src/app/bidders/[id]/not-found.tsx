import Link from 'next/link';

export default function BidderNotFound() {
  return (
    <div className="card p-6">
      <h2 className="font-heading text-h2 text-navy">Bidder not found</h2>
      <p className="mt-1 text-sm text-ink-muted">
        This bidder doesn&apos;t exist — it may have been removed, or the database was re-seeded with fresh IDs.
      </p>
      <Link href="/dashboard" className="btn-primary mt-4">
        Back to dashboard
      </Link>
    </div>
  );
}
