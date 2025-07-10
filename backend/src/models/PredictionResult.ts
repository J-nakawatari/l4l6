import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPredictionResult extends Document<Types.ObjectId> {
  userId: mongoose.Types.ObjectId;
  predictionId: mongoose.Types.ObjectId;
  drawResultId: mongoose.Types.ObjectId;
  hits: {
    dataLogic: string[];
    ai: string[];
  };
  prizeWon: number;
  createdAt: Date;
  updatedAt: Date;
}

const predictionResultSchema = new Schema<IPredictionResult>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  predictionId: {
    type: Schema.Types.ObjectId,
    ref: 'Prediction',
    required: true,
  },
  drawResultId: {
    type: Schema.Types.ObjectId,
    ref: 'DrawResult',
    required: true,
  },
  hits: {
    dataLogic: [String],
    ai: [String],
  },
  prizeWon: {
    type: Number,
    default: 0,
    min: 0,
  },
}, {
  timestamps: true,
});

// インデックス
predictionResultSchema.index({ userId: 1, predictionId: 1 });
predictionResultSchema.index({ userId: 1, createdAt: -1 });

export const PredictionResult = mongoose.model<IPredictionResult>('PredictionResult', predictionResultSchema);