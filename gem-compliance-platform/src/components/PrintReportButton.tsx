'use client';

import React from 'react';
import { DownloadIcon } from '@/components/icons';

export function PrintReportButton({ label = 'Print / Save Official PDF' }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn-primary inline-flex items-center gap-2 py-2 px-4 shadow-sm print:hidden cursor-pointer"
      title="Open browser print dialog to save as institutional PDF"
    >
      <DownloadIcon className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
}
