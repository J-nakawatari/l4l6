import { Metadata } from 'next';
import HomePage from '@/components/HomePage';

export const metadata: Metadata = {
  title: 'ナンバーズ4予想システム | AI統計解析で次回当選番号を予想',
  description: 'ナンバーズ4の過去100回分のデータをAIが統計解析。ベイジアン統計、機械学習、フーリエ解析など4つの独自アルゴリズムで次回の当選番号を予想します。',
  alternates: {
    canonical: 'https://l4l6.com',
  },
};

export default function Page() {
  // 構造化データ（JSON-LD）
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Numbers4 AI予想システム',
    description: 'ナンバーズ4の過去データをAIが統計解析し、次回の当選番号を予想するWebアプリケーション',
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '990',
      priceCurrency: 'JPY',
      priceValidUntil: '2025-12-31',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.5',
      ratingCount: '128',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomePage />
    </>
  );
}