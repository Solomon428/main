export class FuzzyMatcher {
  /**
   * Calculate similarity between two strings using Levenshtein distance
   * Returns a value between 0 (completely different) and 1 (identical)
   */
  static calculateSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    if (str1 === str2) return 1;

    const s1 = this.normalizeString(str1);
    const s2 = this.normalizeString(str2);

    if (s1 === s2) return 1;

    const distance = this.levenshteinDistance(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);

    return 1 - (distance / maxLength);
  }

  /**
   * Normalize a string for comparison
   */
  private static normalizeString(str: string): string {
    if (!str) return '';
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') // Remove special characters
      .replace(/\s+/g, '') // Remove whitespace
      .trim();
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const s1 = str1 || '';
    const s2 = str2 || '';
    const m = s1.length;
    const n = s2.length;

    // Create a 2D array for dynamic programming
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    // Initialize base cases
    for (let i = 0; i <= m; i++) {
      dp[i][0] = i;
    }
    for (let j = 0; j <= n; j++) {
      dp[0][j] = j;
    }

    // Fill the DP table
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (s1[i - 1] === s2[j - 1]) {
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
   * Find the best match for a query string from a list of candidates
   */
  static findBestMatch(query: string, candidates: string[]): {
    bestMatch: string | null;
    similarity: number;
    index: number;
  } {
    let bestMatch: string | null = null;
    let bestSimilarity = 0;
    let bestIndex = -1;

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i] || '';
      const similarity = this.calculateSimilarity(query, candidate);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = candidate;
        bestIndex = i;
      }
    }

    return {
      bestMatch,
      similarity: bestSimilarity,
      index: bestIndex
    };
  }

  /**
   * Find all matches above a threshold
   */
  static findMatchesAboveThreshold(
    query: string,
    candidates: string[],
    threshold: number = 0.8
  ): Array<{
    candidate: string;
    similarity: number;
    index: number;
  }> {
    const matches: Array<{
      candidate: string;
      similarity: number;
      index: number;
    }> = [];

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i] || '';
      const similarity = this.calculateSimilarity(query, candidate);
      if (similarity >= threshold) {
        matches.push({
          candidate: candidate,
          similarity,
          index: i
        });
      }
    }

    return matches.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Check if two strings are similar enough to be considered a match
   */
  static isSimilar(str1: string, str2: string, threshold: number = 0.85): boolean {
    return this.calculateSimilarity(str1, str2) >= threshold;
  }

  /**
   * Tokenize a string into words and find similar tokens
   */
  static tokenizeAndMatch(text: string, dictionary: string[]): Array<{
    token: string;
    bestMatch: string | null;
    similarity: number;
  }> {
    const tokens = text.toLowerCase().split(/\s+/);
    const results: Array<{
      token: string;
      bestMatch: string | null;
      similarity: number;
    }> = [];

    for (const token of tokens) {
      const { bestMatch, similarity } = this.findBestMatch(token, dictionary);
      results.push({
        token,
        bestMatch,
        similarity
      });
    }

    return results;
  }
}
