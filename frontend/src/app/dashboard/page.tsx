'use client';

import React from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import PredictionCards from '@/components/Dashboard/PredictionCards';
import StatsChart from '@/components/Dashboard/StatsChart';
import TransactionHistory from '@/components/Dashboard/TransactionHistory';
import LocationMap from '@/components/Dashboard/LocationMap';

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Prediction Cards Section */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">最新予想</h2>
            <button className="text-primary hover:text-primary-hover transition-colors">
              すべて見る →
            </button>
          </div>
          <PredictionCards />
        </div>

        {/* Stats Chart */}
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-semibold">統計情報</h2>
          </div>
          <StatsChart />
        </div>

        {/* Transaction History */}
        <div className="lg:col-span-2">
          <TransactionHistory />
        </div>

        {/* Location Map */}
        <div>
          <LocationMap />
        </div>
      </div>
    </DashboardLayout>
  );
}