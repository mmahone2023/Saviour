'use client';

import dynamic from 'next/dynamic';

const SkyGame = dynamic(() => import('../game'), { ssr: false });

export default function SkyPlayPage() {
  return <SkyGame />;
}
