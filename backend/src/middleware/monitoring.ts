import { Request, Response, NextFunction } from 'express';
import { log } from '../utils/logger';

interface PerformanceMetrics {
  route: string;
  method: string;
  count: number;
  totalDuration: number;
  minDuration: number;
  maxDuration: number;
  avgDuration: number;
  lastUpdated: Date;
}

// メトリクスストレージ（本番環境ではRedisやPrometheusを使用）
const metricsStore = new Map<string, PerformanceMetrics>();

// パフォーマンスモニタリングミドルウェア
export const performanceMonitoring = (req: Request, res: Response, next: NextFunction) => {
  const startTime = process.hrtime.bigint();
  
  // レスポンス完了時の処理
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // ナノ秒からミリ秒に変換
    
    const key = `${req.method}:${req.route?.path || req.path}`;
    const metrics = metricsStore.get(key) || {
      route: req.route?.path || req.path,
      method: req.method,
      count: 0,
      totalDuration: 0,
      minDuration: Infinity,
      maxDuration: 0,
      avgDuration: 0,
      lastUpdated: new Date(),
    };
    
    metrics.count++;
    metrics.totalDuration += duration;
    metrics.minDuration = Math.min(metrics.minDuration, duration);
    metrics.maxDuration = Math.max(metrics.maxDuration, duration);
    metrics.avgDuration = metrics.totalDuration / metrics.count;
    metrics.lastUpdated = new Date();
    
    metricsStore.set(key, metrics);
    
    // 遅いリクエストの警告
    if (duration > 1000) { // 1秒以上
      log.warn('Slow request detected', {
        method: req.method,
        url: req.originalUrl,
        duration,
        statusCode: res.statusCode,
      });
    }
  });
  
  next();
};

// メトリクス取得エンドポイント
export const getMetrics = (_req: Request, res: Response) => {
  const metrics = Array.from(metricsStore.values());
  
  res.json({
    metrics,
    summary: {
      totalRoutes: metrics.length,
      totalRequests: metrics.reduce((sum, m) => sum + m.count, 0),
      avgResponseTime: metrics.reduce((sum, m) => sum + m.avgDuration, 0) / metrics.length,
    },
  });
};

// メモリ使用量モニタリング
export const memoryMonitoring = () => {
  setInterval(() => {
    const memUsage = process.memoryUsage();
    const memoryMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
    };
    
    log.info('Memory usage', memoryMB);
    
    // メモリ使用量が高い場合の警告
    if (memoryMB.heapUsed > 500) { // 500MB以上
      log.warn('High memory usage detected', memoryMB);
    }
  }, 60000); // 1分ごと
};

// エラー率モニタリング
let errorCount = 0;
let requestCount = 0;
let lastErrorRateCheck = Date.now();

export const errorRateMonitoring = (_req: Request, res: Response, next: NextFunction) => {
  requestCount++;
  
  res.on('finish', () => {
    if (res.statusCode >= 500) {
      errorCount++;
    }
    
    // 5分ごとにエラー率をチェック
    const now = Date.now();
    if (now - lastErrorRateCheck > 300000) { // 5分
      const errorRate = (errorCount / requestCount) * 100;
      
      if (errorRate > 5) { // エラー率5%以上
        log.error('High error rate detected', {
          errorRate: errorRate.toFixed(2),
          errorCount,
          requestCount,
        });
      }
      
      // カウンターをリセット
      errorCount = 0;
      requestCount = 0;
      lastErrorRateCheck = now;
    }
  });
  
  next();
};