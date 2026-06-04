'use client';

import { Suspense } from 'react';
import GenerateJobPage from './GenerateJobPage';

export default function GeneratePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>}>
      <GenerateJobPage />
    </Suspense>
  );
}
