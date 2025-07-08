'use client';

import React from 'react';
import { IconArrowUp, IconArrowDown } from '@tabler/icons-react';

interface Transaction {
  id: number;
  type: 'purchase' | 'win';
  title: string;
  date: string;
  amount: string;
  status: 'completed' | 'pending';
}

const transactions: Transaction[] = [
  {
    id: 1,
    type: 'purchase',
    title: '第1700回 ロト6 購入',
    date: '2024-01-08 19:00',
    amount: '-¥200',
    status: 'completed'
  },
  {
    id: 2,
    type: 'win',
    title: '第1699回 5等当選',
    date: '2024-01-05 21:00',
    amount: '+¥1,000',
    status: 'completed'
  },
  {
    id: 3,
    type: 'purchase',
    title: '第1699回 ロト6 購入',
    date: '2024-01-04 18:30',
    amount: '-¥400',
    status: 'completed'
  },
  {
    id: 4,
    type: 'purchase',
    title: '第1698回 ロト6 購入',
    date: '2024-01-01 19:00',
    amount: '-¥200',
    status: 'completed'
  },
  {
    id: 5,
    type: 'win',
    title: '第1697回 4等当選',
    date: '2023-12-29 21:00',
    amount: '+¥6,800',
    status: 'completed'
  }
];

export default function TransactionHistory() {
  return (
    <div className="custom-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">取引履歴</h2>
        <button className="text-primary hover:text-primary-hover transition-colors text-sm">
          すべて見る →
        </button>
      </div>

      <div className="space-y-4">
        {transactions.map((transaction) => (
          <div key={transaction.id} className="flex items-center justify-between py-3 border-b last:border-0">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                transaction.type === 'win' ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                {transaction.type === 'win' ? (
                  <IconArrowDown className="text-green-600" size={20} />
                ) : (
                  <IconArrowUp className="text-gray-600" size={20} />
                )}
              </div>
              <div>
                <div className="font-medium">{transaction.title}</div>
                <div className="text-sm text-gray-500">{transaction.date}</div>
              </div>
            </div>
            <div className={`font-semibold ${
              transaction.type === 'win' ? 'text-green-600' : 'text-gray-900'
            }`}>
              {transaction.amount}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}