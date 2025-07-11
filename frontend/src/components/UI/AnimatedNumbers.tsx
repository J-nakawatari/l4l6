'use client';

import { useState, useEffect, useRef } from 'react';

interface AnimatedNumbersProps {
  finalNumbers?: string[];
  isCalculating?: boolean;
  onCalculationComplete?: () => void;
  autoStart?: boolean;
  duration?: number;
}

export default function AnimatedNumbers({
  finalNumbers = ['1', '2', '3', '4'],
  isCalculating = false,
  onCalculationComplete,
  autoStart = true,
  duration = 3000
}: AnimatedNumbersProps) {
  const [displayNumbers, setDisplayNumbers] = useState(['?', '?', '?', '?']);
  const [isAnimating, setIsAnimating] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // ランダムな数字を生成（0-9）
  const generateRandomNumbers = () => {
    return Array.from({ length: 4 }, () => Math.floor(Math.random() * 10).toString());
  };

  // 計算エフェクトを開始
  const startCalculation = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setDisplayNumbers(['?', '?', '?', '?']);

    // 高速でランダム数字を表示
    const animationInterval = setInterval(() => {
      setDisplayNumbers(generateRandomNumbers());
    }, 100); // 100msごとに数字が変わる

    // 指定時間後にアニメーション停止
    setTimeout(() => {
      clearInterval(animationInterval);
      
      // 最終数字を段階的に表示
      let currentIndex = 0;
      const revealInterval = setInterval(() => {
        setDisplayNumbers(prev => {
          const newNumbers = [...prev];
          newNumbers[currentIndex] = finalNumbers[currentIndex];
          return newNumbers;
        });
        
        currentIndex++;
        
        if (currentIndex >= 4) {
          clearInterval(revealInterval);
          setIsAnimating(false);
          onCalculationComplete?.();
        }
      }, 200); // 200msごとに1つずつ確定
      
    }, duration);
  };

  // 自動開始機能
  useEffect(() => {
    if (autoStart) {
      const timer = setTimeout(() => {
        startCalculation();
      }, 1000); // 1秒後に開始
      
      return () => clearTimeout(timer);
    }
  }, [autoStart]);

  // 外部からの計算開始
  useEffect(() => {
    if (isCalculating) {
      startCalculation();
    }
  }, [isCalculating]);

  return (
    <div className="relative">
      {/* 数字表示エリア */}
      <div className="text-6xl font-black text-blue-800 tracking-wider flex justify-center space-x-4">
        {displayNumbers.map((number, index) => (
          <div
            key={index}
            className={`
              relative inline-block w-16 h-20 flex items-center justify-center
              ${isAnimating ? 'animate-pulse' : ''}
              ${number === '?' ? 'text-gray-400' : 'text-blue-800'}
              transition-all duration-300 ease-in-out
            `}
          >
            {/* 数字の背景エフェクト */}
            <div
              className={`
                absolute inset-0 rounded-lg
                ${isAnimating ? 'bg-blue-100 animate-ping' : 'bg-transparent'}
                transition-all duration-300
              `}
            />
            
            {/* 数字本体 */}
            <span className={`
              relative z-10 
              ${isAnimating && number !== '?' ? 'animate-bounce' : ''}
              ${number === '?' ? 'animate-pulse' : ''}
            `}>
              {number}
            </span>
            
            {/* 計算中の点滅エフェクト */}
            {isAnimating && (
              <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-ping" />
            )}
          </div>
        ))}
      </div>

      {/* 計算中のステータス表示 */}
      {isAnimating && (
        <div className="mt-4 text-center">
          <div className="inline-flex items-center space-x-2 text-sm text-gray-600">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" />
            <span className="animate-pulse">AI計算中...</span>
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
          </div>
        </div>
      )}

      {/* 手動計算開始ボタン（オプション） */}
      {!autoStart && !isAnimating && (
        <div className="text-center mt-4">
          <button
            onClick={startCalculation}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            予想を再計算
          </button>
        </div>
      )}
    </div>
  );
}

// プリセット数字パターン
export const NumberPatterns = {
  DEMO: ['1', '2', '3', '4'],
  RANDOM: () => Array.from({ length: 4 }, () => Math.floor(Math.random() * 10).toString()),
  LUCKY: ['7', '8', '9', '0'],
  SEQUENCE: ['0', '1', '2', '3']
};