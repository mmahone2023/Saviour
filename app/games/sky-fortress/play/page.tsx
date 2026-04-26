'use client';

import dynamic from 'next/dynamic';

const SkyFortressGame = dynamic(() => import('../game'), {
  ssr: false,
});

export default function SkyFortressPlayPage() {
  return <SkyFortressGame />;
}
