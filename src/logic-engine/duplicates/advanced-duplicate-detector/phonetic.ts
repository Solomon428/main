/**
 * CREDITORFLOW EMS - PHONETIC ENCODING ALGORITHMS
 * Version: 3.9.2
 * 
 * Soundex, Metaphone, and phonetic matching algorithms
 */

/**
 * Calculate Levenshtein distance between two strings
 * The minimum number of single-character edits required to change one string into the other
 */
export function calculateLevenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  
  // Create a 2D array for dynamic programming
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  // Initialize base cases
  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }
  
  // Fill the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,     // Deletion
          dp[i][j - 1] + 1,     // Insertion
          dp[i - 1][j - 1] + 1  // Substitution
        );
      }
    }
  }
  
  return dp[m][n];
}

/**
 * Calculate Jaro-Winkler similarity between two strings
 * Gives more weight to prefix matches (better for short strings like invoice numbers)
 */
export function calculateJaroWinklerSimilarity(str1: string, str2: string): number {
  // Jaro similarity
  const jaroSimilarity = calculateJaroSimilarity(str1, str2);
  
  // Calculate common prefix length (max 4 characters)
  let prefixLength = 0;
  const maxPrefix = Math.min(4, str1.length, str2.length);
  for (let i = 0; i < maxPrefix; i++) {
    if (str1[i] === str2[i]) {
      prefixLength++;
    } else {
      break;
    }
  }
  
  // Winkler boost (scaling factor 0.1)
  const winklerBoost = prefixLength * 0.1 * (1 - jaroSimilarity);
  
  return jaroSimilarity + winklerBoost;
}

/**
 * Calculate Jaro similarity between two strings
 */
function calculateJaroSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  if (str1.length === 0 || str2.length === 0) return 0.0;
  
  const matchDistance = Math.floor(Math.max(str1.length, str2.length) / 2) - 1;
  const str1Matches = new Array(str1.length).fill(false);
  const str2Matches = new Array(str2.length).fill(false);
  
  let matches = 0;
  let transpositions = 0;
  
  // Find matching characters
  for (let i = 0; i < str1.length; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, str2.length);
    
    for (let j = start; j < end; j++) {
      if (str2Matches[j] || str1[i] !== str2[j]) continue;
      str1Matches[i] = true;
      str2Matches[j] = true;
      matches++;
      break;
    }
  }
  
  if (matches === 0) return 0.0;
  
  // Count transpositions
  let k = 0;
  for (let i = 0; i < str1.length; i++) {
    if (!str1Matches[i]) continue;
    while (!str2Matches[k]) k++;
    if (str1[i] !== str2[k]) transpositions++;
    k++;
  }
  
  return (
    (matches / str1.length) +
    (matches / str2.length) +
    ((matches - transpositions / 2) / matches)
  ) / 3.0;
}

/**
 * Soundex encoding for phonetic matching
 * Converts words to a 4-character code based on pronunciation
 */
export function soundexEncode(str: string): string {
  if (!str || str.length === 0) return '';
  
  // Convert to uppercase and remove non-alphabetic characters
  const cleaned = str.toUpperCase().replace(/[^A-Z]/g, '');
  if (cleaned.length === 0) return '';
  
  // Soundex coding rules
  const soundexMap: Record<string, string> = {
    'B': '1', 'F': '1', 'P': '1', 'V': '1',
    'C': '2', 'G': '2', 'J': '2', 'K': '2', 'Q': '2', 'S': '2', 'X': '2', 'Z': '2',
    'D': '3', 'T': '3',
    'L': '4',
    'M': '5', 'N': '5',
    'R': '6'
  };
  
  // First letter is preserved
  let soundex = cleaned[0];
  
  // Convert remaining letters to digits
  let prevCode = soundexMap[cleaned[0]] || '';
  
  for (let i = 1; i < cleaned.length && soundex.length < 4; i++) {
    const char = cleaned[i];
    const code = soundexMap[char];
    
    // Skip vowels and 'H', 'W'
    if (!code) continue;
    
    // Skip duplicate codes (adjacent letters with same code)
    if (code === prevCode) continue;
    
    soundex += code;
    prevCode = code;
  }
  
  // Pad with zeros to make 4 characters
  while (soundex.length < 4) {
    soundex += '0';
  }
  
  return soundex;
}

/**
 * Metaphone encoding for improved phonetic matching
 * More accurate than Soundex for English words
 */
export function metaphoneEncode(str: string): string {
  if (!str || str.length === 0) return '';
  
  // Convert to uppercase and remove non-alphabetic characters
  let word = str.toUpperCase().replace(/[^A-Z]/g, '');
  if (word.length === 0) return '';
  
  // Remove initial silent letters
  if (word.startsWith('KN') || word.startsWith('GN') || 
      word.startsWith('PN') || word.startsWith('AE') || 
      word.startsWith('WR')) {
    word = word.substring(1);
  }
  
  // Drop initial 'X' -> 'S', 'WH' -> 'W'
  if (word.startsWith('X')) {
    word = 'S' + word.substring(1);
  }
  if (word.startsWith('WH')) {
    word = 'W' + word.substring(2);
  }
  
  let result = '';
  let i = 0;
  
  while (i < word.length) {
    const char = word[i];
    const nextChar = word[i + 1] || '';
    const nextNextChar = word[i + 2] || '';
    
    // Vowels
    if ('AEIOU'.includes(char)) {
      if (i === 0) result += char;
      i++;
      continue;
    }
    
    // B
    if (char === 'B') {
      if (nextChar !== 'B') result += 'B';
      i++;
      continue;
    }
    
    // C
    if (char === 'C') {
      if (nextChar === 'H' && nextNextChar === 'R') {
        result += 'K';
        i += 3;
      } else if (nextChar === 'I' && (nextNextChar === 'A' || nextNextChar === 'O')) {
        result += 'X';
        i += 3;
      } else if (nextChar === 'H') {
        result += 'X';
        i += 2;
      } else if ('IEY'.includes(nextChar)) {
        result += 'S';
        i += 2;
      } else {
        result += 'K';
        i++;
      }
      continue;
    }
    
    // D
    if (char === 'D') {
      if (nextChar === 'G' && 'IEY'.includes(nextNextChar)) {
        result += 'J';
        i += 3;
      } else {
        result += 'T';
        i++;
      }
      continue;
    }
    
    // F
    if (char === 'F') {
      if (nextChar !== 'F') result += 'F';
      i++;
      continue;
    }
    
    // G
    if (char === 'G') {
      if (nextChar === 'H') {
        if (!'AEIOU'.includes(word[i - 1] || '')) {
          result += 'K';
        }
        i += 2;
      } else if (nextChar === 'N') {
        if (i === word.length - 2 || 
            (word[i + 2] !== 'E' && word[i + 2] !== 'D')) {
          break;
        }
        result += 'N';
        i += 2;
      } else if (nextChar === 'E' && nextNextChar === 'D' && i === word.length - 3) {
        break;
      } else if ('IEY'.includes(nextChar)) {
        result += 'J';
        i += 2;
      } else {
        result += 'K';
        i++;
      }
      continue;
    }
    
    // H
    if (char === 'H') {
      if (!'AEIOU'.includes(word[i - 1] || '') && 'AEIOU'.includes(nextChar)) {
        result += 'H';
      }
      i++;
      continue;
    }
    
    // J
    if (char === 'J') {
      result += 'J';
      i++;
      continue;
    }
    
    // K
    if (char === 'K') {
      if (nextChar !== 'K') result += 'K';
      i++;
      continue;
    }
    
    // L
    if (char === 'L') {
      if (nextChar !== 'L') result += 'L';
      i++;
      continue;
    }
    
    // M
    if (char === 'M') {
      if (nextChar !== 'M') result += 'M';
      i++;
      continue;
    }
    
    // N
    if (char === 'N') {
      if (nextChar !== 'N') result += 'N';
      i++;
      continue;
    }
    
    // P
    if (char === 'P') {
      if (nextChar === 'H') {
        result += 'F';
        i += 2;
      } else {
        result += 'P';
        i++;
      }
      continue;
    }
    
    // Q
    if (char === 'Q') {
      result += 'K';
      i++;
      continue;
    }
    
    // R
    if (char === 'R') {
      if (nextChar !== 'R') result += 'R';
      i++;
      continue;
    }
    
    // S
    if (char === 'S') {
      if (nextChar === 'H' || (nextChar === 'I' && 'AO'.includes(nextNextChar))) {
        result += 'X';
        i += 2;
      } else {
        result += 'S';
        i++;
      }
      continue;
    }
    
    // T
    if (char === 'T') {
      if (nextChar === 'H') {
        result += '0'; // theta sound
        i += 2;
      } else if (nextChar === 'I' && 'AO'.includes(nextNextChar)) {
        result += 'X';
        i += 3;
      } else {
        result += 'T';
        i++;
      }
      continue;
    }
    
    // V
    if (char === 'V') {
      if (nextChar !== 'V') result += 'F';
      i++;
      continue;
    }
    
    // W
    if (char === 'W') {
      if ('AEIOU'.includes(nextChar)) {
        result += 'W';
      }
      i++;
      continue;
    }
    
    // X
    if (char === 'X') {
      result += 'KS';
      i++;
      continue;
    }
    
    // Y
    if (char === 'Y') {
      if ('AEIOU'.includes(nextChar)) {
        result += 'Y';
      }
      i++;
      continue;
    }
    
    // Z
    if (char === 'Z') {
      result += 'S';
      i++;
      continue;
    }
    
    i++;
  }
  
  return result;
}

/**
 * Calculate cosine similarity between two strings
 * Uses TF-IDF vectorization for document similarity
 */
export function calculateCosineSimilarity(str1: string, str2: string): number {
  // Tokenize strings
  const tokens1 = tokenize(str1);
  const tokens2 = tokenize(str2);
  
  // Get unique tokens
  const allTokens = new Set([...tokens1, ...tokens2]);
  
  // Create term frequency vectors
  const vector1: number[] = [];
  const vector2: number[] = [];
  
  allTokens.forEach(token => {
    vector1.push(tokens1.filter(t => t === token).length);
    vector2.push(tokens2.filter(t => t === token).length);
  });
  
  // Calculate dot product
  let dotProduct = 0;
  for (let i = 0; i < vector1.length; i++) {
    dotProduct += vector1[i] * vector2[i];
  }
  
  // Calculate magnitudes
  const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0));
  const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0));
  
  // Calculate cosine similarity
  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0;
  }
  
  return dotProduct / (magnitude1 * magnitude2);
}

/**
 * Simple tokenization for cosine similarity
 */
function tokenize(str: string): string[] {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(token => token.length > 0);
}
