import mongoose, { Schema, Document } from 'mongoose';

export interface IPrediction extends Document {
  drawNumber: number;
  drawDate: Date;
  dataLogicPredictions: string[];
  aiPredictions: string[];
  generatedAt: Date;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
  incrementViewCount(): Promise<IPrediction>;
  hasDuplicatePredictions(): boolean;
  getUniquePredictionsCount(): number;
}

export interface IPredictionModel extends mongoose.Model<IPrediction> {
  findByDrawNumber(drawNumber: number): Promise<IPrediction | null>;
  findLatest(): Promise<IPrediction | null>;
  findPublished(): Promise<IPrediction[]>;
}

const predictionSchema = new Schema<IPrediction>({
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
  dataLogicPredictions: {
    type: [String],
    required: [true, 'データロジック予想は必須です'],
    validate: {
      validator: function(predictions: string[]) {
        // 最大10個まで
        if (predictions.length > 10) return false;
        // 各予想が4桁の数字
        return predictions.every(p => /^\d{4}$/.test(p));
      },
      message: '予想は4桁の数字で、最大10個までです',
    },
  },
  aiPredictions: {
    type: [String],
    required: [true, 'AI予想は必須です'],
    validate: {
      validator: function(predictions: string[]) {
        // 最大10個まで
        if (predictions.length > 10) return false;
        // 各予想が4桁の数字
        return predictions.every(p => /^\d{4}$/.test(p));
      },
      message: '予想は4桁の数字で、最大10個までです',
    },
  },
  generatedAt: {
    type: Date,
    default: Date.now,
  },
  viewCount: {
    type: Number,
    default: 0,
    min: [0, '閲覧数は0以上である必要があります'],
  },
}, {
  timestamps: true,
});

// インデックス
predictionSchema.index({ drawNumber: 1 });
predictionSchema.index({ drawDate: -1 });
predictionSchema.index({ viewCount: -1 });

// 閲覧数インクリメント
predictionSchema.methods.incrementViewCount = async function(): Promise<IPrediction> {
  this.viewCount += 1;
  return this.save();
};

// 重複チェック
predictionSchema.methods.hasDuplicatePredictions = function(): boolean {
  const allPredictions = [...this.dataLogicPredictions, ...this.aiPredictions];
  const uniquePredictions = new Set(allPredictions);
  return allPredictions.length !== uniquePredictions.size;
};

// ユニークな予想数
predictionSchema.methods.getUniquePredictionsCount = function(): number {
  const allPredictions = [...this.dataLogicPredictions, ...this.aiPredictions];
  return new Set(allPredictions).size;
};

// 静的メソッド
predictionSchema.statics.findByDrawNumber = function(drawNumber: number) {
  return this.findOne({ drawNumber });
};

predictionSchema.statics.findLatest = function() {
  return this.findOne().sort({ drawNumber: -1 });
};

predictionSchema.statics.findPublished = function() {
  return this.find({ viewCount: { $gt: 0 } }).sort({ drawNumber: -1 });
};

export const Prediction = mongoose.model<IPrediction, IPredictionModel>('Prediction', predictionSchema);