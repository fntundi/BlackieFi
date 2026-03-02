'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Crown, Loader2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505]">
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Crown className="w-12 h-12 text-[#D4AF37]" />
          <h1 className="text-3xl font-bold text-white">BlackieFi</h1>
        </div>
        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin mx-auto" />
      </div>
    </div>
  );
}
