'use client';

import dynamic from 'next/dynamic';

const SkyIslandsGame = dynamic(() => import('../game'), { ssr: false });

export default function SkyIslandsPlayPage() {
  return <SkyIslandsGame />;
}
