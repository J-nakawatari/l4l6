import app from './app';
import { log } from './utils/logger';

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  log.info(`Server started on port ${PORT}`, {
    port: PORT,
    environment: process.env.NODE_ENV,
    nodeVersion: process.version,
  });
});

// グレースフルシャットダウン
const gracefulShutdown = (signal: string) => {
  log.info(`${signal} received, starting graceful shutdown`);
  
  server.close(() => {
    log.info('HTTP server closed');
    
    // データベース接続などのクリーンアップ
    // TODO: MongoDB、Redis接続のクローズ
    
    process.exit(0);
  });
  
  // 30秒後に強制終了
  setTimeout(() => {
    log.error('Forcefully shutting down');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));