// 予想番号「1981」のパターンを分析

const prediction = "1981";
const digits = prediction.split('');

// 重複をチェック
const uniqueDigits = new Set(digits);
console.log('予想番号:', prediction);
console.log('使用されている数字:', Array.from(uniqueDigits).sort().join(', '));
console.log('重複している数字:', digits.filter((d, i) => digits.indexOf(d) !== i));

// 全ての並び替えパターンを生成
function generatePermutations(arr) {
  if (arr.length <= 1) return [arr];
  
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    const current = arr[i];
    const remaining = [...arr.slice(0, i), ...arr.slice(i + 1)];
    const perms = generatePermutations(remaining);
    
    for (const perm of perms) {
      result.push([current, ...perm]);
    }
  }
  
  return result;
}

const allPermutations = generatePermutations(digits);
const uniqueNumbers = new Set(allPermutations.map(p => p.join('')));

console.log('\n=== パターン分析 ===');
console.log('総パターン数（重複含む）:', allPermutations.length);
console.log('ユニークなパターン数:', uniqueNumbers.size);

// ボックスで当選する番号
console.log('\n=== ボックスで当選する番号一覧 ===');
const sortedPatterns = Array.from(uniqueNumbers).sort();
sortedPatterns.forEach((pattern, index) => {
  console.log(`${index + 1}. ${pattern}`);
});

// 実際の当選番号との照合
console.log('\n=== 実際の当選との照合 ===');
const winningNumber = '9181';
console.log('当選番号:', winningNumber);
console.log('予想番号でボックス当選:', sortedPatterns.includes(winningNumber) ? '✅ YES' : '❌ NO');

// 数字の構成をソートして比較
const predictionSorted = digits.sort().join('');
const winningSorted = winningNumber.split('').sort().join('');
console.log('\nソート後の比較:');
console.log('予想番号（ソート）:', predictionSorted);
console.log('当選番号（ソート）:', winningSorted);
console.log('一致:', predictionSorted === winningSorted ? '✅ YES' : '❌ NO');