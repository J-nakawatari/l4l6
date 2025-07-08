# 新規プロジェクト開発チェックリスト

このドキュメントは、Charactier AIプロジェクトの開発経験から得られた教訓を基に、新規プロジェクトを開始する際に**必ず**実施すべき項目をまとめたものです。

## 🎯 このドキュメントの使い方

1. **新規プロジェクト開始時に必ず参照**
2. **各チェック項目を順番に実施**
3. **実装済みの項目にチェック**を入れる
4. **スキップする項目には理由を記載**

## 🚨 最重要：開発開始前に必ず実装すること

これらを後回しにすると、後で破壊的な修正が必要になります：

- [ ] **API パス設計を `/api/v1/` で統一**
- [ ] **ユーザー認証と管理者認証を最初から分離**
- [ ] **Docker環境で開発を開始**
- [ ] **テスト駆動開発（TDD）の採用**
- [ ] **OpenAPI仕様書の作成**
- [ ] **CLAUDE.mdの作成**

---

## 📋 1. プロジェクト基盤構築（Day 1）

### 1.1 ディレクトリ構造
```bash
# 以下のコマンドでプロジェクト構造を作成
mkdir -p project-name/{frontend,backend/{src/{routes,models,utils,types,validation,middleware},docs,tests},docs,scripts,docker,.github/workflows}
```

```
project-name/
├── frontend/          # Next.js or React アプリケーション
├── backend/           # Express.js APIサーバー
│   ├── src/
│   │   ├── routes/    # APIルート定義
│   │   ├── models/    # データベースモデル
│   │   ├── utils/     # ユーティリティ関数
│   │   ├── types/     # TypeScript型定義
│   │   ├── validation/ # 入力検証スキーマ
│   │   └── middleware/ # Express ミドルウェア
│   ├── docs/          # OpenAPI仕様書
│   └── tests/         # テストファイル
├── docs/              # プロジェクトドキュメント
├── scripts/           # 開発用スクリプト
├── docker/            # Docker設定ファイル
└── .github/           # GitHub Actions設定
    └── workflows/
```

### 1.2 必須ファイルの作成

#### CLAUDE.md（AIアシスタント用ガイド）
```bash
cat > CLAUDE.md << 'EOF'
# CLAUDE.md

このファイルは、Claude Code（AI開発アシスタント）がこのプロジェクトで作業する際のガイドラインです。

## プロジェクト概要
[プロジェクトの目的と主要機能を記載]

## 技術スタック
- フロントエンド: [Next.js/React] + TypeScript + Tailwind CSS
- バックエンド: Express.js + TypeScript + MongoDB
- テスト: Jest + Supertest + Playwright
- 認証: JWT (HttpOnly Cookie)
- 決済: Stripe
- キャッシュ: Redis

## 開発原則
1. **テスト駆動開発（TDD）**: 機能実装前にテストを書く
2. **型安全性**: TypeScript strictモード
3. **セキュリティファースト**: 全エンドポイントに認証・検証
4. **APIファースト**: OpenAPI仕様書を先に定義

## 厳守ルール
- テストなしでコードをコミットしない
- 型定義なしでコードを書かない
- 入力検証なしでAPIを作らない
- console.logを本番コードに残さない

## 開発コマンド
\`\`\`bash
npm run dev        # 開発サーバー起動
npm run test       # テスト実行
npm run test:watch # テスト監視モード
npm run lint       # コード検証
npm run build      # ビルド
\`\`\`
EOF
```

#### .env.example（環境変数テンプレート）
```bash
cat > .env.example << 'EOF'
# Server Configuration
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb://localhost:27017/projectname
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-key-here
JWT_EXPIRE=2h
JWT_REFRESH_EXPIRE=7d

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Feature Flags
FEATURE_SECURE_COOKIE_AUTH=true
FEATURE_STRICT_VALIDATION=true
FEATURE_TDD_MODE=true

# Security
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
CORS_ORIGIN=http://localhost:3000
EOF
```

### 1.3 Git設定
```bash
# .gitignore
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Environment
.env
.env.local
.env.*.local

# Build
dist/
build/
.next/
out/

# Logs
logs/
*.log

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Test
coverage/
.nyc_output/

# Uploads
uploads/
tmp/
EOF

# Git初期化
git init
git add .
git commit -m "feat: プロジェクト初期設定"
```

---

## 🧪 2. テスト駆動開発（TDD）環境構築

### 2.1 テストフレームワーク設定

#### backend/package.json
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "jest --config ./jest.e2e.config.js"
  },
  "devDependencies": {
    "@types/jest": "^29.0.0",
    "@types/supertest": "^2.0.12",
    "jest": "^29.0.0",
    "supertest": "^6.3.0",
    "ts-jest": "^29.0.0"
  }
}
```

#### backend/jest.config.js
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### 2.2 TDD実践例

#### 1. テストを先に書く（RED）
```typescript
// backend/tests/auth.test.ts
import request from 'supertest';
import app from '../src/app';

describe('POST /api/v1/auth/register', () => {
  it('新規ユーザーを登録できる', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test@example.com',
        password: 'SecurePass123!'
      });
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('message');
    expect(response.body.emailSent).toBe(true);
  });

  it('無効なメールアドレスは拒否される', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'invalid-email',
        password: 'SecurePass123!'
      });
    
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
```

#### 2. 実装する（GREEN）
```typescript
// backend/src/validation/auth.validation.ts
import Joi from 'joi';

export const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required()
});
```

```typescript
// backend/src/routes/auth.ts
import { Router } from 'express';
import { registerSchema } from '../validation/auth.validation';
import { validate } from '../middleware/validate';

const router = Router();

router.post('/register', validate(registerSchema), async (req, res) => {
  const { email, password } = req.body;
  
  // ユーザー登録ロジック
  // ...
  
  res.status(201).json({
    message: 'Registration successful',
    emailSent: true
  });
});
```

#### 3. リファクタリング（REFACTOR）
```typescript
// backend/src/services/auth.service.ts
export class AuthService {
  async registerUser(email: string, password: string) {
    // ビジネスロジックを分離
    const hashedPassword = await this.hashPassword(password);
    const user = await User.create({ email, password: hashedPassword });
    await this.sendVerificationEmail(user);
    return user;
  }
}
```

---

## 🐳 3. Docker環境構築

### 3.1 docker-compose.yml
```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next
    environment:
      - NODE_ENV=development
    depends_on:
      - backend

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    ports:
      - "5000:5000"
    volumes:
      - ./backend:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - MONGODB_URI=mongodb://mongodb:27017/projectname
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongodb
      - redis

  mongodb:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    environment:
      - MONGO_INITDB_DATABASE=projectname

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  mongo_data:
  redis_data:
```

### 3.2 Dockerfile（開発用）現在は必要なし
```dockerfile
# backend/Dockerfile.dev
FROM node:18-alpine

WORKDIR /app

# パッケージファイルをコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm ci

# nodemonをグローバルインストール
RUN npm install -g nodemon

# アプリケーションコードをコピー
COPY . .

# 開発サーバー起動
CMD ["npm", "run", "dev"]
```

---

## 🔒 4. セキュリティ実装（Day 1必須）

### 4.1 基本セキュリティミドルウェア
```typescript
// backend/src/middleware/security.ts
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import { csrfProtection } from './csrf';

export const securityMiddleware = [
  // セキュリティヘッダー
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }),

  // レート制限
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15分
    max: 100, // 最大100リクエスト
    message: 'Too many requests',
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // NoSQLインジェクション対策
  mongoSanitize(),

  // CSRF保護
  csrfProtection,
];
```

### 4.2 認証システム（分離設計）
```typescript
// backend/src/routes/index.ts
import { Router } from 'express';
import userAuthRoutes from './auth/user';
import adminAuthRoutes from './auth/admin';

const router = Router();

// ユーザー認証と管理者認証を明確に分離
router.use('/auth', userAuthRoutes);          // ユーザー用
router.use('/admin/auth', adminAuthRoutes);   // 管理者用

export default router;
```

---

## 🏗️ 5. API設計

### 5.1 OpenAPI仕様書（先に定義）
```yaml
# backend/docs/openapi.yaml
openapi: 3.0.0
info:
  title: Project API
  version: 1.0.0
  description: |
    APIファースト開発のための仕様書
    
servers:
  - url: http://localhost:5000/api/v1
    description: Development server

paths:
  /auth/register:
    post:
      summary: ユーザー登録
      tags: [Authentication]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, password]
              properties:
                email:
                  type: string
                  format: email
                password:
                  type: string
                  minLength: 8
      responses:
        '201':
          description: 登録成功
        '400':
          $ref: '#/components/responses/ValidationError'
```

### 5.2 RouteRegistry（重複防止）
```typescript
// backend/src/utils/routeRegistry.ts
export class RouteRegistry {
  private static routes = new Set<string>();

  static register(method: string, path: string) {
    const key = `${method.toUpperCase()} ${path}`;
    if (this.routes.has(key)) {
      throw new Error(`Duplicate route: ${key}`);
    }
    this.routes.add(key);
  }

  static getRoutes() {
    return Array.from(this.routes).sort();
  }
}
```

---

## 🤖 6. CI/CD設定

### 6.1 GitHub Actions
```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:6
        options: >-
          --health-cmd "mongosh --eval 'db.adminCommand(\"ping\")'"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 27017:27017
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: |
          npm ci --prefix backend
          npm ci --prefix frontend
      
      - name: Lint
        run: |
          npm run lint --prefix backend
          npm run lint --prefix frontend
      
      - name: Type check
        run: |
          npm run type-check --prefix backend
          npm run type-check --prefix frontend
      
      - name: Run tests
        run: |
          npm test --prefix backend
          npm test --prefix frontend
        env:
          MONGODB_URI: mongodb://localhost:27017/test
          REDIS_URL: redis://localhost:6379
      
      - name: Security scan
        run: |
          npm audit --prefix backend
          npm audit --prefix frontend
      
      - name: Build
        run: |
          npm run build --prefix backend
          npm run build --prefix frontend
```

### 6.2 Pre-commit hooks
```json
// package.json (root)
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.test.{ts,tsx}": [
      "jest --findRelatedTests --passWithNoTests"
    ]
  }
}
```

---

## 📊 7. ログとモニタリング

### 7.1 構造化ログ（最初から実装）
```typescript
// backend/src/utils/logger.ts
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const sensitiveFields = ['password', 'token', 'secret', 'authorization'];

const filterSensitive = winston.format((info) => {
  // 機密情報を自動的にマスク
  const filtered = { ...info };
  sensitiveFields.forEach(field => {
    if (filtered[field]) {
      filtered[field] = '[REDACTED]';
    }
  });
  return filtered;
})();

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    filterSensitive,
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'api' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new DailyRotateFile({
      filename: 'logs/app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    })
  ]
});
```

---

## 🎯 8. 開発ワークフロー

### 8.1 ブランチ戦略
```bash
main          # 本番環境
  ├── develop # 開発環境
  │   ├── feature/user-auth    # 機能開発
  │   ├── feature/payment      # 機能開発
  │   └── fix/login-error      # バグ修正
  └── hotfix/security-patch    # 緊急修正
```

### 8.2 コミット規約
```bash
# Conventional Commits
feat: ユーザー認証機能を追加
fix: ログインエラーを修正
test: 認証テストを追加
docs: API仕様書を更新
refactor: 認証サービスをリファクタリング
chore: 依存関係を更新
```

---

## 📝 9. データベース設計

### 9.1 基本スキーマ設計
```typescript
// backend/src/models/base.model.ts
export interface BaseDocument {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date; // 論理削除
}

// 全モデルに自動的にタイムスタンプを追加
const baseSchema = new Schema({
  deletedAt: { type: Date, default: null }
}, {
  timestamps: true, // createdAt, updatedAt を自動追加
});
```

---

## 🚀 10. 初期スプリントの実施順序

### Sprint 0: 基盤構築（1-2日）
- [ ] プロジェクト構造作成
- [ ] Docker環境構築
- [ ] Git/GitHub設定
- [ ] CI/CD パイプライン構築
- [ ] 基本的なセキュリティ実装
- [ ] ログシステム構築
- [ ] CLAUDE.md作成

### Sprint 1: 認証システム（3-5日）
- [ ] TDDでユーザー認証API実装
- [ ] 管理者認証API実装（別系統）
- [ ] JWT＋リフレッシュトークン
- [ ] パスワードリセット機能
- [ ] メール送信機能

### Sprint 2: 基本機能（5-7日）
- [ ] OpenAPI仕様定義
- [ ] 基本的なCRUD API（TDD）
- [ ] 入力検証
- [ ] エラーハンドリング
- [ ] E2Eテスト追加

---

## ⚠️ よくある失敗と対策

### 失敗例1: API パスの不統一
❌ `/api/users` と `/api/v1/products` が混在
✅ 最初から `/api/v1/*` で統一

### 失敗例2: 認証の混在
❌ 同じエンドポイントでユーザーと管理者を判別
✅ `/api/v1/users/*` と `/api/v1/admin/*` で分離

### 失敗例3: テストを後回し
❌ 機能を作ってからテストを書く
✅ テストを先に書いてから実装（TDD）

### 失敗例4: ログの後付け
❌ console.log で開発して後で置き換え
✅ 最初から構造化ログを使用

---

## 🎁 ボーナス: よく使うスニペット

### API エンドポイントのテンプレート
```typescript
// TDDテンプレート: まずテストから
describe('POST /api/v1/resource', () => {
  it('リソースを作成できる', async () => {
    const response = await request(app)
      .post('/api/v1/resource')
      .send({ name: 'test' });
    
    expect(response.status).toBe(201);
  });
});

// 実装テンプレート
router.post('/resource', 
  authenticate,
  validate(createResourceSchema),
  rateLimit({ max: 10 }),
  async (req, res, next) => {
    try {
      const result = await service.create(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);
```

---

## 📌 最終チェックリスト

開発を始める前に、以下が完了していることを確認：

- [ ] Docker環境で開発サーバーが起動する
- [ ] `npm test` でテストが実行される
- [ ] GitHub Actionsでビルドが通る
- [ ] セキュリティミドルウェアが適用されている
- [ ] CLAUDE.mdに開発ガイドラインが記載されている
- [ ] .env.exampleに全環境変数が記載されている
- [ ] OpenAPI仕様書が作成されている
- [ ] ログが構造化されて出力される
- [ ] エラーハンドリングが統一されている
- [ ] TDDの開発フローが確立されている

このチェックリストに従って開発を進めることで、Charactier AIプロジェクトで経験した多くの問題を事前に回避できます。