import mongoose, { Schema, Document } from 'mongoose';
import { IPrediction } from './Prediction';

export interface IDrawResult extends Document {
  drawNumber: number;
  drawDate: Date;
  winningNumber: string;
  prize: {
    amount: number;
    winners: number;
  };
  fetchedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  checkPredictionHits(prediction: IPrediction): Promise<{
    dataLogicHits: string[];
    aiHits: string[];
    totalHits: number;
  }>;
}

export interface IDrawResultModel extends mongoose.Model<IDrawResult> {
  findByDrawNumber(drawNumber: number): Promise<IDrawResult | null>;
  findLatest(): Promise<IDrawResult | null>;
  findByDateRange(startDate: Date, endDate: Date): Promise<IDrawResult[]>;
  findRecent(limit: number): Promise<IDrawResult[]>;
  calculateDigitFrequency(limit: number): Promise<Array<{ [digit: string]: number }>>;
}

const drawResultSchema = new Schema<IDrawResult>({
  drawNumber: {
    type: Number,
    required: [true, '抽選回は必須です'],
    unique: true,
    min: [1, '抽選回は1以上である必要があります'],
  },
  drawDate: {
    type: Date,
    required: [true, '抽選日は必須です'],
  },
  winningNumber: {
    type: String,
    required: [true, '当選番号は必須です'],
    validate: {
      validator: (num: string) => /^\d{4}$/.test(num),
      message: '当選番号は4桁の数字である必要があります',
    },
  },
  prize: {
    amount: {
      type: Number,
      required: [true, '賞金額は必須です'],
      min: [0, '賞金額は0以上である必要があります'],
    },
    winners: {
      type: Number,
      required: [true, '当選者数は必須です'],
      min: [0, '当選者数は0以上である必要があります'],
    },
  },
  fetchedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// インデックス
drawResultSchema.index({ drawNumber: 1 });
drawResultSchema.index({ drawDate: -1 });

// 予想との照合
drawResultSchema.methods.checkPredictionHits = async function(prediction: IPrediction) {
  if (this.drawNumber !== prediction.drawNumber) {
    throw new Error('抽選回が一致しません');
  }

  const winningNumber = this.winningNumber;
  const dataLogicHits = prediction.dataLogicPredictions.filter(p => p === winningNumber);
  const aiHits = prediction.aiPredictions.filter(p => p === winningNumber);

  return {
    dataLogicHits,
    aiHits,
    totalHits: dataLogicHits.length + aiHits.length,
  };
};

// 静的メソッド
drawResultSchema.statics.findByDrawNumber = function(drawNumber: number) {
  return this.findOne({ drawNumber });
};

drawResultSchema.statics.findLatest = function() {
  return this.findOne().sort({ drawNumber: -1 });
};

drawResultSchema.statics.findByDateRange = function(startDate: Date, endDate: Date) {
  return this.find({
    drawDate: { $gte: startDate, $lte: endDate }
  }).sort({ drawNumber: -1 });
};

drawResultSchema.statics.findRecent = function(limit: number) {
  return this.find().sort({ drawNumber: -1 }).limit(limit);
};

drawResultSchema.statics.calculateDigitFrequency = async function(limit: number) {
  const results = await this.find().sort({ drawNumber: -1 }).limit(limit);
  
  // 各桁の頻度を初期化（0-9）
  const frequency: Array<{ [digit: string]: number }> = [
    {}, // 1の位
    {}, // 10の位
    {}, // 100の位
    {}, // 1000の位
  ];

  // 各桁を初期化
  for (let pos = 0; pos < 4; pos++) {
    for (let digit = 0; digit <= 9; digit++) {
      if (frequency[pos]) {
        frequency[pos]![digit.toString()] = 0;
      }
    }
  }

  // 頻度をカウント
  results.forEach((result: any) => {
    const digits = result.winningNumber.split('').reverse(); // 右から左へ（1の位から）
    digits.forEach((digit: string, position: number) => {
      if (frequency[position] && frequency[position]![digit]) {
        frequency[position]![digit]++;
      }
    });
  });

  return frequency;
};

export const DrawResult = mongoose.model<IDrawResult, IDrawResultModel>('DrawResult', drawResultSchema);