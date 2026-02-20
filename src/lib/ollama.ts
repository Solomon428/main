// ============================================================================
// CreditorFlow - Ollama Integration
// ============================================================================
// Provides LLM-powered invoice processing capabilities using local Ollama
// Features:
// - Intelligent invoice data extraction
// - Anomaly explanation generation
// - Natural language query processing
// - Fraud pattern analysis with LLM reasoning
//
// Requirements: Ollama running locally on port 11434
// Install: https://ollama.com/download
// Models: llama3.2 (recommended), mistral, or llama2
// ============================================================================

import { ExtractedInvoiceData, ExtractedLineItem } from "@/types";

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

interface OllamaConfig {
  host: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export class OllamaClient {
  private config: OllamaConfig;

  constructor(config: Partial<OllamaConfig> = {}) {
    this.config = {
      host: config.host || process.env.OLLAMA_HOST || "http://localhost:11434",
      model: config.model || process.env.OLLAMA_MODEL || "llama3.2",
      temperature: config.temperature || 0.1, // Low temperature for consistent extraction
      maxTokens: config.maxTokens || 4096,
    };
  }

  /**
   * Check if Ollama is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.host}/api/tags`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get list of available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.host}/api/tags`);
      if (!response.ok) return [];

      const data = await response.json();
      return data.models?.map((m: any) => m.name) || [];
    } catch {
      return [];
    }
  }

  /**
   * Generate a completion using Ollama
   */
  async generate(prompt: string): Promise<string> {
    const response = await fetch(`${this.config.host}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.config.model,
        prompt,
        stream: false,
        options: {
          temperature: this.config.temperature,
          num_predict: this.config.maxTokens,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.statusText}`);
    }

    const data: OllamaResponse = await response.json();
    return data.response;
  }

  /**
   * Extract invoice data from text using LLM
   */
  async extractInvoiceData(
    rawText: string,
  ): Promise<Partial<ExtractedInvoiceData>> {
    const prompt = `
You are an expert invoice processing system. Extract structured data from the following invoice text.
Return ONLY a valid JSON object with no markdown formatting or additional text.

Invoice Text:
"""
${rawText}
"""

Extract the following fields and return as JSON:
{
  "invoiceNumber": "string or null",
  "supplierName": "string or null",
  "supplierVAT": "string or null",
  "supplierEmail": "string or null",
  "supplierPhone": "string or null",
  "supplierAddress": "string or null",
  "invoiceDate": "YYYY-MM-DD or null",
  "dueDate": "YYYY-MM-DD or null",
  "subtotalExclVAT": number or null,
  "vatAmount": number or null,
  "vatRate": number or 15.0,
  "totalAmount": number or null,
  "currency": "ZAR or USD or EUR etc",
  "paymentTerms": number or 30,
  "referenceNumber": "string or null",
  "bankName": "string or null",
  "accountNumber": "string or null",
  "branchCode": "string or null",
  "lineItems": [
    {
      "lineNumber": number,
      "description": "string",
      "quantity": number,
      "unitPrice": number,
      "vatRate": number or 15.0,
      "vatAmount": number,
      "lineTotalExclVAT": number,
      "lineTotalInclVAT": number
    }
  ]
}

Important:
- Use null for missing fields, do not guess
- Dates must be in YYYY-MM-DD format
- Amounts should be numbers without currency symbols
- VAT rate is typically 15% for South Africa
- Calculate line item totals if not explicitly stated
`;

    try {
      const response = await this.generate(prompt);

      // Clean up the response - remove markdown formatting if present
      const cleanedResponse = response
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();

      const extractedData = JSON.parse(cleanedResponse);

      // Convert date strings to Date objects
      if (extractedData.invoiceDate) {
        extractedData.invoiceDate = new Date(extractedData.invoiceDate);
      }
      if (extractedData.dueDate) {
        extractedData.dueDate = new Date(extractedData.dueDate);
      }

      // Add raw text for reference
      extractedData.rawText = rawText;
      extractedData.extractionConfidence = 0.85; // LLM extraction has high confidence

      return extractedData;
    } catch (error) {
      console.error("Ollama extraction failed:", error);
      return {
        rawText,
        extractionConfidence: 0,
      };
    }
  }

  /**
   * Explain fraud score in natural language
   */
  async explainFraudScore(
    fraudScore: number,
    riskFactors: Array<{ factor: string; score: number; description: string }>,
  ): Promise<string> {
    const prompt = `
You are a fraud detection expert. Explain the following fraud assessment in clear, business-friendly language.

Fraud Score: ${fraudScore}/100
Risk Level: ${fraudScore >= 80 ? "CRITICAL" : fraudScore >= 60 ? "HIGH" : fraudScore >= 40 ? "MEDIUM" : "LOW"}

Risk Factors:
${riskFactors.map((rf) => `- ${rf.factor}: ${rf.score}/100 - ${rf.description}`).join("\n")}

Provide a concise 2-3 sentence explanation of:
1. Why this invoice was flagged (if score > 40)
2. What specific patterns or anomalies were detected
3. Recommended actions

Keep it professional and actionable.
`;

    try {
      return await this.generate(prompt);
    } catch {
      return "Unable to generate fraud explanation. Please review the risk factors manually.";
    }
  }

  /**
   * Categorize invoice based on content
   */
  async categorizeInvoice(
    supplierName: string,
    lineItems: string[],
    totalAmount: number,
  ): Promise<{ category: string; confidence: number; reason: string }> {
    const prompt = `
You are an accounting expert. Categorize this invoice based on the following information:

Supplier: ${supplierName}
Line Items:
${lineItems.map((item) => `- ${item}`).join("\n")}
Total Amount: R${totalAmount}

Available categories:
- IT_SOFTWARE (software licenses, subscriptions, SaaS)
- IT_HARDWARE (computers, servers, networking equipment)
- UTILITIES (electricity, water, internet)
- LOGISTICS (shipping, freight, courier)
- MAINTENANCE (repairs, servicing)
- CONSULTANCY (professional services, advisory)
- MARKETING (advertising, promotions)
- OFFICE (stationery, supplies, furniture)
- COMMUNICATIONS (telephone, mobile)
- INSURANCE (premiums, policies)
- RENT (property, premises)
- TRAVEL (flights, accommodation, meals)
- TRAINING (courses, certifications)
- OTHER

Return ONLY a JSON object:
{
  "category": "string",
  "confidence": number between 0-1,
  "reason": "brief explanation of categorization"
}
`;

    try {
      const response = await this.generate(prompt);
      const cleanedResponse = response
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();

      return JSON.parse(cleanedResponse);
    } catch {
      return {
        category: "OTHER",
        confidence: 0,
        reason: "Unable to categorize",
      };
    }
  }

  /**
   * Answer natural language questions about invoices
   */
  async answerQuery(query: string, invoiceContext: string): Promise<string> {
    const prompt = `
You are a helpful assistant for an invoice management system. Answer the user's question based on the provided invoice context.

Invoice Context:
"""
${invoiceContext}
"""

User Question: ${query}

Provide a clear, concise answer. If you don't have enough information, say so.
`;

    try {
      return await this.generate(prompt);
    } catch {
      return "I apologize, but I was unable to process your question at this time.";
    }
  }

  /**
   * Detect anomalous patterns with LLM reasoning
   */
  async detectAnomaliesWithReasoning(
    currentInvoice: any,
    historicalInvoices: any[],
  ): Promise<Array<{ type: string; description: string; severity: string }>> {
    const prompt = `
You are a data analyst specializing in invoice pattern detection. Compare the current invoice against historical data to identify anomalies.

Current Invoice:
${JSON.stringify(currentInvoice, null, 2)}

Historical Invoices (last 10):
${JSON.stringify(historicalInvoices.slice(0, 10), null, 2)}

Identify any anomalies or unusual patterns. Return ONLY a JSON array:
[
  {
    "type": "AMOUNT_DEVIATION | FREQUENCY_SPIKE | TIMING_ANOMALY | SUPPLIER_CHANGE | OTHER",
    "description": "detailed description of the anomaly",
    "severity": "LOW | MEDIUM | HIGH | CRITICAL"
  }
]

If no anomalies detected, return an empty array [].
`;

    try {
      const response = await this.generate(prompt);
      const cleanedResponse = response
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();

      return JSON.parse(cleanedResponse);
    } catch {
      return [];
    }
  }
}

// Export singleton instance
export const ollamaClient = new OllamaClient();

export default OllamaClient;
