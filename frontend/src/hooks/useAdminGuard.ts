'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { appApi } from '../lib/appApi';

export function useAdminGuard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const user = appApi.getCurrentUser();
    if (!user || user.role === 'USER') {
      router.replace('/admin/login');
      return;
    }
    setIsAdmin(true);
    setLoading(false);
  }, [router]);

  return { loading, isAdmin };
}
