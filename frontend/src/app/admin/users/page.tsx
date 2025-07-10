'use client';

import { useState, useEffect } from 'react';
import { IconSearch, IconBan, IconCheck, IconTrash, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

interface User {
  _id: string;
  email: string;
  name: string;
  role: string;
  emailVerified: boolean;
  suspended?: boolean;
  subscription?: {
    status: string;
    plan?: string;
  };
  createdAt: string;
  lastActiveAt?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, search, status]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      
      if (search) params.append('search', search);
      if (status !== 'all') params.append('status', status);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/users?${params}`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) throw new Error('Failed to fetch users');

      const data = await response.json();
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (userId: string, action: 'suspend' | 'activate' | 'delete') => {
    if (action === 'delete' && !confirm('本当にこのユーザーを削除しますか？この操作は取り消せません。')) {
      return;
    }

    setActionLoading(userId);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/users/${userId}`,
        {
          method: action === 'delete' ? 'DELETE' : 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: action !== 'delete' ? JSON.stringify({ action }) : undefined,
        }
      );

      if (!response.ok) throw new Error('Action failed');

      // リストを再取得
      await fetchUsers();
    } catch (error) {
      console.error('Error performing action:', error);
      alert('操作に失敗しました');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination({ ...pagination, page: 1 });
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-semibold text-gray-900">ユーザー管理</h2>
        
        {/* 検索・フィルター */}
        <div className="mt-4 flex flex-col sm:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="メールアドレスまたは名前で検索..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </form>
          
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPagination({ ...pagination, page: 1 });
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">すべて</option>
            <option value="active">アクティブ</option>
            <option value="suspended">停止中</option>
          </select>
        </div>
      </div>

      {/* ユーザーリスト */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ユーザー
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ステータス
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                サブスク
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                登録日
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                アクション
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  ユーザーが見つかりません
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                      {user.role === 'admin' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          管理者
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      {user.suspended ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <IconBan className="h-3 w-3 mr-1" />
                          停止中
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <IconCheck className="h-3 w-3 mr-1" />
                          アクティブ
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {user.subscription?.status === 'active' ? (
                        <span className="text-green-600">
                          {user.subscription.plan || 'basic'}
                        </span>
                      ) : (
                        <span className="text-gray-500">なし</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString('ja-JP')}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {user.role !== 'admin' && (
                        <>
                          {user.suspended ? (
                            <button
                              onClick={() => handleAction(user._id, 'activate')}
                              disabled={actionLoading === user._id}
                              className="text-green-600 hover:text-green-900 disabled:opacity-50"
                              title="アカウントを再開"
                            >
                              <IconCheck className="h-5 w-5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAction(user._id, 'suspend')}
                              disabled={actionLoading === user._id}
                              className="text-orange-600 hover:text-orange-900 disabled:opacity-50"
                              title="アカウントを停止"
                            >
                              <IconBan className="h-5 w-5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleAction(user._id, 'delete')}
                            disabled={actionLoading === user._id}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                            title="アカウントを削除"
                          >
                            <IconTrash className="h-5 w-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ページネーション */}
      {pagination.pages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            全 {pagination.total} 件中 {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} 件を表示
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              disabled={pagination.page === 1}
              className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <IconChevronLeft className="h-5 w-5" />
            </button>
            <span className="px-4 py-2 text-sm">
              {pagination.page} / {pagination.pages}
            </span>
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              disabled={pagination.page === pagination.pages}
              className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <IconChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}