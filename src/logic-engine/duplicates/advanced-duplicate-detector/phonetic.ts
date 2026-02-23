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
export function calculateLevenshteinDistance(
  str1: string,
  str2: string,
): number {
  const m = str1.length;
  const n = str2.length;

  // Create a 2D array for dynamic programming with proper typing
  const dp: number[][] = [];
  for (let i = 0; i <= m; i++) {
    dp[i] = [];
    for (let j = 0; j <= n; j++) {
      if (i === 0) {
        dp[i][j] = j;
      } else if (j === 0) {
        dp[i][j] = i;
      }
    }
  }

  // Fill the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        const del = dp[i - 1][j] ?? 0;
        const ins = dp[i][j - 1] ?? 0;
        const sub = dp[i - 1][j - 1] ?? 0;
        dp[i][j] = Math.min(del + 1, ins + 1, sub + 1);
      }
    }
  }

  return dp[m][n] ?? 0;
}

/**
 * Calculate Jaro-Winkler similarity between two strings
 * Gives more weight to prefix matches (better for short strings like invoice numbers)
 */
export function calculateJaroWinklerSimilarity(
  str1: string,
  str2: string,
): number {
  // Handle edge cases
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;
  
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0 || len2 === 0) return 0;

  const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1;
  
  const str1Matches = new Array(len1).fill(false);
  const str2Matches = new Array(len2).fill(false);
  
  let matches = 0;
  let transpositions = 0;

  // Find matches
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, len2);
    
    for (let j = start; j < end; j++) {
      if (str2Matches[j] || str1[i] !== str2[j]) continue;
      str1Matches[i] = true;
      str2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  // Count transpositions
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!str1Matches[i]) continue;
    while (!str2Matches[k]) k++;
    if (str1[i] !== str2[k]) transpositions++;
    k++;
  }

  const jaro = (matches / len1 + matches / len2 + 
    (matches - transpositions / 2) / matches) / 3;

  // Calculate prefix bonus
  let prefix = 0;
  for (let i = 0; i < Math.min(4, len1, len2); i++) {
    if (str1[i] === str2[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

/**
 * Calculate Jaro similarity between two strings
 */
function calculateJaroSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;

  const len1 = str1.length;
  const len2 = str2.length;
  
  const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1;
  if (matchDistance < 0) return 0;
  
  const str1Matches = new Array(len1).fill(false);
  const str2Matches = new Array(len2).fill(false);
  
  let matches = 0;
  
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, len2);
    
    for (let j = start; j < end; j++) {
      if (str2Matches[j] || str1[i] !== str2[j]) continue;
      str1Matches[i] = true;
      str2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let transpositions = 0;
  let k = 0;
  
  for (let i = 0; i < len1; i++) {
    if (!str1Matches[i]) continue;
    while (!str2Matches[k]) k++;
    if (str1[i] !== str2[k]) transpositions++;
    k++;
  }

  return (matches / len1 + matches / len2 + 
    (matches - transpositions / 2) / matches) / 3;
}

/**
 * Generate Soundex code for a string
 * Soundex is a phonetic algorithm used for matching names
 */
export function generateSoundex(input: string): string {
  if (!input) return '';
  
  const soundexChars: Record<string, string> = {
    'B': '1', 'F': '1', 'P': '1', 'V': '1',
    'C': '2', 'G': '2', 'J': '2', 'K': '2', 'Q': '2', 'S': '2', 'X': '2', 'Z': '2',
    'D': '3', 'T': '3',
    'L': '4',
    'M': '5', 'N': '5',
    'R': '6',
  };
  
  const upper = input.toUpperCase().replace(/[^A-Z]/g, '');
  if (!upper) return '';
  
  let result = upper[0];
  let prevCode = soundexChars[upper[0]] ?? '';
  
  for (let i = 1; i < upper.length && result.length < 4; i++) {
    const char = upper[i];
    const code = soundexChars[char] ?? '';
    
    if (code && code !== prevCode) {
      result += code;
      prevCode = code;
    } else if (!code) {
      prevCode = '';
    }
  }
  
  return (result + '000').slice(0, 4);
}

/**
 * Generate Metaphone code for a string
 * Metaphone is a more accurate phonetic algorithm than Soundex
 */
export function generateMetaphone(input: string): string {
  if (!input) return '';
  
  const word = input.toUpperCase().replace(/[^A-Z]/g, '');
  if (!word) return '';
  
  const vowels = 'AEIOU';
  let result = '';
  let i = 0;
  
  // First letter
  result += word[0];
  
  while (i < word.length) {
    const char = word[i];
    
    // Skip consecutive duplicates
    if (char === word[i - 1] && i > 0) {
      i++;
      continue;
    }
    
    switch (char) {
      case 'B':
        if (word[i + 1] !== 'B') result += char;
        break;
      case 'C':
        if (word[i + 1] === 'I' || word[i + 1] === 'E') {
          result += 'S';
        } else if (word[i + 1] === 'H') {
          result += (word[i + 2] === 'R') ? '2' : 'K';
          i++;
        } else {
          result += 'K';
        }
        break;
      case 'D':
        if (word[i + 1] === 'G' && 'EIY'.includes(word[i + 1] ?? '')) {
          result += 'J';
          i += 2;
        } else {
          result += 'T';
        }
        break;
      case 'G':
        if (word[i + 1] === 'H' && !vowels.includes(word[i + 2] ?? '')) {
          // Silent G
        } else if (word[i + 1] === 'N' && word[i + 2] === 'E' && word[i + 3] === 'D') {
          // Silent G in -gned
        } else if (word[i + 1] === 'N') {
          result += 'N';
          i++;
        } else if (!'EIY'.includes(word[i + 1] ?? '')) {
          result += 'K';
        }
        break;
      case 'H':
        if (i === 0 || !'AEIOU'.includes(word[i - 1] ?? '') || 
            (word[i + 1] && vowels.includes(word[i + 1] ?? ''))) {
          result += 'h';
        }
        break;
      case 'K':
        if (word[i - 1] !== 'C') result += 'K';
        break;
      case 'P':
        result += (word[i + 1] === 'H') ? 'F' : 'P';
        if (word[i + 1] === 'H') i++;
        break;
      case 'Q':
        result += 'K';
        break;
      case 'R':
        result += (i < word.length - 1 && word[i + 1] !== 'E') ? '2' : 'R';
        break;
      case 'S':
        if (word[i + 1] === 'I' && (word[i + 2] === 'O' || word[i + 2] === 'A')) {
          result += 'X';
        } else if (word[i + 1] === 'H') {
          result += 'X';
          i++;
        } else {
          result += 'S';
        }
        break;
      case 'T':
        if (word[i + 1] === 'I' && (word[i + 2] === 'O' || word[i + 2] === 'A')) {
          result += 'X';
        } else if (word[i + 1] === 'H') {
          result += '0';
          i++;
        } else if (word[i + 1] !== 'C') {
          result += 'T';
        }
        break;
      case 'V':
        result += 'F';
        break;
      case 'W':
        if (vowels.includes(word[i + 1] ?? '')) {
          result += '2';
        }
        break;
      case 'X':
        if (i === 0) {
          result += 'S';
        } else {
          result += 'KS';
        }
        break;
      case 'Y':
        if (vowels.includes(word[i + 1] ?? '')) {
          result += 'Y';
        }
        break;
      case 'Z':
        result += 'S';
        break;
      case 'F':
      case 'J':
      case 'L':
      case 'M':
      case 'N':
      case 'T':
      case 'W':
      case 'Y':
        result += char;
        break;
    }
    
    i++;
    if (result.length >= 4) break;
  }
  
  return result || word.slice(0, 4);
}

export const soundexEncode = generateSoundex;
export const metaphoneEncode = generateMetaphone;

/**
 * Compare two strings using phonetic algorithms
 * Returns a score from 0 to 1
 */
export function comparePhonetic(
  str1: string,
  str2: string,
  method: 'soundex' | 'metaphone' | 'jaro' | 'jaroWinkler' = 'jaroWinkler',
): number {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;
  
  switch (method) {
    case 'soundex':
      return generateSoundex(str1) === generateSoundex(str2) ? 1 : 0;
    case 'metaphone':
      return generateMetaphone(str1) === generateMetaphone(str2) ? 1 : 0;
    case 'jaro':
      return calculateJaroSimilarity(str1, str2);
    case 'jaroWinkler':
      return calculateJaroWinklerSimilarity(str1, str2);
    default:
      return 0;
  }
}
