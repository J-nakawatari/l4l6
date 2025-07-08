/**
 * 宝くじの当選判定ユーティリティ
 */

/**
 * ストレート当選をチェック（完全一致）
 */
export function checkStraight(prediction: string, winning: string): boolean {
  return prediction === winning;
}

/**
 * ボックス当選をチェック（数字の組み合わせが同じ）
 */
export function checkBox(prediction: string, winning: string): boolean {
  // 4桁の数字を配列に変換してソート
  const predictionDigits = prediction.split('').sort().join('');
  const winningDigits = winning.split('').sort().join('');
  
  return predictionDigits === winningDigits;
}

/**
 * 予想結果をチェック
 */
export interface PredictionResult {
  prediction: string;
  isStraight: boolean;
  isBox: boolean;
}

/**
 * 複数の予想をチェック
 */
export function checkPredictions(predictions: string[], winning: string): PredictionResult[] {
  return predictions.map(prediction => ({
    prediction,
    isStraight: checkStraight(prediction, winning),
    isBox: checkBox(prediction, winning)
  }));
}

/**
 * 当選数をカウント
 */
export interface HitCount {
  straight: number;
  box: number;
  boxOnly: number; // ボックスのみ（ストレートではない）
}

/**
 * 当選数を集計
 */
export function countHits(results: PredictionResult[]): HitCount {
  let straight = 0;
  let box = 0;
  let boxOnly = 0;

  results.forEach(result => {
    if (result.isStraight) {
      straight++;
      box++; // ストレートはボックスでもある
    } else if (result.isBox) {
      box++;
      boxOnly++;
    }
  });

  return { straight, box, boxOnly };
}

/**
 * 賞金を計算（Numbers4の場合）
 * ストレート: 90万円
 * ボックス: 37,500円（数字がすべて異なる場合）
 */
export function calculatePrize(hitCount: HitCount): number {
  const straightPrize = 900000;
  const boxPrize = 37500; // 簡略化（実際は組み合わせ数により変動）
  
  return (hitCount.straight * straightPrize) + (hitCount.boxOnly * boxPrize);
}