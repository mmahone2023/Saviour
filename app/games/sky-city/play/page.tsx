'use client';

import dynamic from 'next/dynamic';

const SkyCityGame = dynamic(() => import('../game'), { ssr: false });

export default function SkyCityPlayPage() {
  return <SkyCityGame />;
}
