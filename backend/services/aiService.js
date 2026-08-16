/**
 * backend/services/aiService.js
 *
 * Academic Intelligence service. This is the single place that decides
 * risk level / weak subjects / observations / recommendations for a
 * student, either via an external AI provider or via the rule-based
 * fallback in fallbackAI.js.
 *
 * SECURITY:
 *   - Reads AI_API_KEY / AI_API_URL / AI_MODEL from process.env only.
 *   - Never send the key to the frontend. Never log the raw key.
 *   - If no key is configured, this module transparently uses the
 *     fallback engine so the rest of the app keeps working.
 *
 * USAGE (from an Express route, Person 2's responsibility to wire up):
 *
 *   const { getStudentAIRecommendation } = require('../services/aiService');
 *   const result = await getStudentAIRecommendation({
 *     attendancePercentage, assignmentAverage, examAverage, subjectAverages,
 *   });
 *
 * `result` always has the shape:
 *   {
 *     riskLevel: 'LOW' | 'MEDIUM' | 'HIGH',
 *     weakSubjects: string[],
 *     observations: string[],
 *     recommendations: string[],
 *     source: 'AI' | 'FALLBACK'
 *   }
 *
 * This shape matches database/models/AIRecommendation.js exactly, so the
 * caller can persist `result` directly (plus `student` + `metrics` + `generatedAt`).
 */

const { generateFallbackRecommendation } = require('./fallbackAI');

const AI_API_KEY = process.env.AI_API_KEY || '';
const AI_API_URL = process.env.AI_API_URL || 'https://api.anthropic.com/v1/messages';
const AI_MODEL = process.env.AI_MODEL || 'claude-sonnet-4-6';
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 8000);

const isAIConfigured = () => Boolean(AI_API_KEY);

/**
 * Builds the prompt sent to the AI provider. Keeps the model strictly to
 * academic-analysis duty (NOT a general chatbot) by constraining output
 * to a fixed JSON schema.
 */
function buildPrompt({ attendancePercentage, assignmentAverage, examAverage, subjectAverages }) {
  return `You are an academic performance analyst for a student management system.
Analyze the metrics below and respond with ONLY a JSON object (no markdown, no preamble).

Metrics:
- Attendance: ${attendancePercentage}%
- Assignment average: ${assignmentAverage}%
- Exam average: ${examAverage}%
- Per-subject averages: ${JSON.stringify(subjectAverages)}

Respond with exactly this JSON shape:
{
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "weakSubjects": string[],
  "observations": string[],
  "recommendations": string[]
}

Rules:
- weakSubjects should only include subjects with average below 60%.
- Keep observations and recommendations concise (max ~6 words to 1 short sentence each).
- riskLevel must be HIGH if attendance < 65% or overall average < 50%.
- riskLevel must be MEDIUM if attendance < 80% or overall average < 70%.
- Otherwise riskLevel is LOW.`;
}

/**
 * Calls the external AI provider. Throws on any failure (network, timeout,
 * bad JSON, non-2xx) -- caller is expected to catch and fall back.
 */
async function callExternalAI(metrics) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await fetch(AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': AI_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: 500,
        messages: [{ role: 'user', content: buildPrompt(metrics) }],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`AI provider responded with status ${response.status}`);
    }

    const data = await response.json();
    const textBlock = (data.content || []).find((block) => block.type === 'text');
    if (!textBlock || !textBlock.text) {
      throw new Error('AI provider returned no text content');
    }

    const cleaned = textBlock.text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (!parsed.riskLevel || !Array.isArray(parsed.recommendations)) {
      throw new Error('AI provider returned an unexpected shape');
    }

    return {
      riskLevel: parsed.riskLevel,
      weakSubjects: parsed.weakSubjects || [],
      observations: parsed.observations || [],
      recommendations: parsed.recommendations || [],
      source: 'AI',
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Public entry point. Always resolves (never rejects) with a valid
 * recommendation object -- falls back internally on any error.
 *
 * @param {Object} metrics
 * @param {number} metrics.attendancePercentage
 * @param {number} metrics.assignmentAverage
 * @param {number} metrics.examAverage
 * @param {Array<{courseName: string, average: number}>} metrics.subjectAverages
 */
async function getStudentAIRecommendation(metrics) {
  if (!isAIConfigured()) {
    return generateFallbackRecommendation(metrics);
  }

  try {
    return await callExternalAI(metrics);
  } catch (err) {
    console.error('[aiService] External AI call failed, using fallback:', err.message);
    return generateFallbackRecommendation(metrics);
  }
}

module.exports = {
  getStudentAIRecommendation,
  isAIConfigured,
};
