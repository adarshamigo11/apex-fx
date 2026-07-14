'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/register/live');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#39ff8b] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-muted mt-3">Redirecting...</p>
      </div>
    </div>
  );
}
