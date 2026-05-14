'use client';

import dynamic from 'next/dynamic';

const SkySurfingGame = dynamic(() => import('../game'), { ssr: false });

export default function SkySurfingPlayPage() {
  return <SkySurfingGame />;
}
