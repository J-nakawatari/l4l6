'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { IconUsers, IconLogout, IconMenu2 } from '@tabler/icons-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // 管理者認証チェック
    checkAdminAuth();
  }, [pathname]);

  const checkAdminAuth = async () => {
    // ログインページの場合はチェックしない
    if (pathname === '/admin/login') {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/users/me`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Unauthorized');
      }

      const data = await response.json();
      
      // 管理者でない場合はログインページへ
      if (data.user.role !== 'admin') {
        throw new Error('Not admin');
      }
    } catch (error) {
      router.push('/admin/login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      router.push('/admin/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // ログインページの場合はレイアウトを適用しない
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
            >
              <IconMenu2 className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-semibold">管理画面</h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <IconLogout className="h-5 w-5" />
            <span className="hidden sm:inline">ログアウト</span>
          </button>
        </div>
      </header>

      <div className="flex">
        {/* サイドバー */}
        <aside className={`${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed lg:static inset-y-0 left-0 w-64 bg-white shadow-lg transition-transform duration-300 ease-in-out z-30 mt-[73px] lg:mt-0`}>
          <nav className="p-4 space-y-2">
            <Link
              href="/admin/users"
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                pathname === '/admin/users'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <IconUsers className="h-5 w-5" />
              <span>ユーザー管理</span>
            </Link>
          </nav>
        </aside>

        {/* モバイル用オーバーレイ */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* メインコンテンツ */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}