'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AgentsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/team');
  }, [router]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
      <div className="text-lg">Redirecting to Agent Team...</div>
    </div>
  );
}
