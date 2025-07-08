import Joi from 'joi';

// ユーザー管理
export const getUsersSchema = Joi.object({
  page: Joi.number().min(1).default(1),
  limit: Joi.number().min(1).max(100).default(20),
  search: Joi.string().trim().max(100),
  role: Joi.string().valid('user', 'admin'),
  subscriptionStatus: Joi.string().valid('active', 'inactive', 'cancelled'),
  emailVerified: Joi.boolean(),
  sort: Joi.string().valid('createdAt', '-createdAt', 'name', '-name', 'lastActiveAt', '-lastActiveAt'),
});

export const updateUserSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100),
  role: Joi.string().valid('user', 'admin'),
  emailVerified: Joi.boolean(),
  isSuspended: Joi.boolean(),
  suspendReason: Joi.string().max(500).when('isSuspended', {
    is: true,
    then: Joi.required(),
  }),
  subscription: Joi.object({
    status: Joi.string().valid('active', 'inactive', 'cancelled'),
    currentPeriodEnd: Joi.date(),
  }),
}).min(1);

export const deleteUserSchema = Joi.object({
  reason: Joi.string().required().min(1).max(500),
  permanent: Joi.boolean().default(false),
});

export const sendEmailSchema = Joi.object({
  subject: Joi.string().required().max(200),
  message: Joi.string().max(5000),
  template: Joi.string().valid(
    'notification',
    'subscription_reminder',
    'feature_announcement',
    'security_alert'
  ),
  variables: Joi.object().when('template', {
    is: Joi.exist(),
    then: Joi.required(),
  }),
  type: Joi.string().valid('notification', 'marketing', 'transactional').default('notification'),
});

// 分析
export const analyticsQuerySchema = Joi.object({
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso().when('startDate', {
    is: Joi.exist(),
    then: Joi.date().greater(Joi.ref('startDate')),
  }),
  granularity: Joi.string().valid('day', 'week', 'month', 'year').default('day'),
});

export const revenueQuerySchema = Joi.object({
  view: Joi.string().valid('overview', 'monthly', 'by-plan', 'by-cohort'),
  months: Joi.number().min(1).max(24).default(12),
  includeChurn: Joi.boolean().default(true),
});

export const exportSchema = Joi.object({
  type: Joi.string().valid('users', 'revenue', 'predictions', 'all'),
  types: Joi.array().items(Joi.string().valid('users', 'revenue', 'predictions')),
  format: Joi.string().valid('csv', 'xlsx', 'json').required(),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso(),
  fields: Joi.array().items(Joi.string()),
}).xor('type', 'types'); // typeまたはtypesのどちらか一つ

// 管理者認証
export const adminLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  rememberMe: Joi.boolean().default(false),
});

export const verify2FASchema = Joi.object({
  tempToken: Joi.string().required(),
  code: Joi.string().length(6).pattern(/^\d+$/).required(),
});

// 予想管理
export const generatePredictionSchema = Joi.object({
  drawNumber: Joi.number().integer().min(1).required(),
  drawDate: Joi.date().iso().required(),
  force: Joi.boolean().default(false), // 既存の予想を上書き
});

export const updatePredictionSchema = Joi.object({
  dataLogicPredictions: Joi.array()
    .items(Joi.string().length(4).pattern(/^\d{4}$/))
    .max(10),
  aiPredictions: Joi.array()
    .items(Joi.string().length(4).pattern(/^\d{4}$/))
    .max(10),
  published: Joi.boolean(),
}).min(1);

// システム設定
export const updateSettingsSchema = Joi.object({
  maintenance: Joi.object({
    enabled: Joi.boolean(),
    message: Joi.string().max(500),
    startTime: Joi.date().iso(),
    endTime: Joi.date().iso(),
  }),
  features: Joi.object({
    registration: Joi.boolean(),
    subscription: Joi.boolean(),
    predictions: Joi.boolean(),
  }),
  limits: Joi.object({
    maxUsersPerDay: Joi.number().min(0),
    maxPredictionViews: Joi.number().min(0),
  }),
});