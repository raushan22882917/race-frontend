import { sendMessageToGemini, isGeminiAvailable } from './geminiService';

export interface PredictiveInsight {
  summary: string;
  keyFindings: string[];
  recommendations: string[];
  warnings?: string[];
  confidence?: 'high' | 'medium' | 'low';
}

export interface AnalysisExplanation {
  title: string;
  description: string;
  whatItMeans: string;
  howToUse: string[];
  tips: string[];
}

/**
 * Generate AI-powered insights for Pre-Event Analysis
 */
export async function generatePreEventInsights(
  predictedTimes: number[],
  actualTimes: number[],
  trackName: string,
  vehicleId: string,
  startingLap: number
): Promise<PredictiveInsight> {
  if (!isGeminiAvailable()) {
    return {
      summary: 'AI insights unavailable. Please configure Gemini API key.',
      keyFindings: [],
      recommendations: [],
      confidence: 'low',
    };
  }

  const validPairs = predictedTimes
    .map((pred, i) => ({ pred, actual: actualTimes[i] }))
    .filter((p) => p.pred > 0 && p.actual > 0);

  const avgError = validPairs.length > 0
    ? validPairs.reduce((sum, p) => sum + Math.abs(p.pred - p.actual), 0) / validPairs.length
    : 0;

  const prompt = `You are an expert race analyst. Analyze this pre-event prediction data:

Track: ${trackName}
Vehicle: ${vehicleId}
Starting Lap: ${startingLap}
Total Laps Predicted: ${predictedTimes.length}

Predicted Lap Times: ${predictedTimes.slice(0, 10).map(t => t.toFixed(2)).join(', ')}${predictedTimes.length > 10 ? '...' : ''}
Actual Lap Times: ${actualTimes.slice(0, 10).map(t => t.toFixed(2)).join(', ')}${actualTimes.length > 10 ? '...' : ''}
Average Prediction Error: ${avgError.toFixed(2)}s

Provide a concise analysis in JSON format:
{
  "summary": "2-3 sentence summary of prediction quality",
  "keyFindings": ["Finding 1", "Finding 2", "Finding 3"],
  "recommendations": ["Recommendation 1", "Recommendation 2"],
  "warnings": ["Warning if any"],
  "confidence": "high|medium|low"
}

Return ONLY valid JSON, no markdown formatting.`;

  try {
    const response = await sendMessageToGemini(prompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No JSON found in response');
  } catch (error) {
    console.error('Failed to generate pre-event insights:', error);
    return {
      summary: `Prediction shows average error of ${avgError.toFixed(2)}s. ${avgError < 1 ? 'Good accuracy' : avgError < 2 ? 'Moderate accuracy' : 'High variance'}.`,
      keyFindings: [
        `Average prediction error: ${avgError.toFixed(2)}s`,
        `Predicted ${predictedTimes.length} laps starting from lap ${startingLap}`,
      ],
      recommendations: [
        'Compare predicted vs actual times to identify patterns',
        'Use this data to refine future predictions',
      ],
      confidence: avgError < 1 ? 'high' : avgError < 2 ? 'medium' : 'low',
    };
  }
}

/**
 * Generate AI-powered insights for Real-Time Strategy Comparison
 */
export async function generateRealTimeInsights(
  noPitTimes: number[],
  pitTimes: number[],
  trackName: string,
  vehicleId: string
): Promise<PredictiveInsight> {
  if (!isGeminiAvailable()) {
    return {
      summary: 'AI insights unavailable. Please configure Gemini API key.',
      keyFindings: [],
      recommendations: [],
      confidence: 'low',
    };
  }

  const noPitTotal = noPitTimes.reduce((a, b) => a + b, 0);
  const pitTotal = pitTimes.reduce((a, b) => a + b, 0);
  const timeDifference = Math.abs(noPitTotal - pitTotal);

  const prompt = `You are a race engineer making strategic decisions. Analyze this real-time strategy comparison:

Track: ${trackName}
Vehicle: ${vehicleId}

No Pit Stop Strategy:
- Total Time: ${noPitTotal.toFixed(2)}s
- Average Lap: ${(noPitTotal / noPitTimes.length).toFixed(2)}s
- Lap Times: ${noPitTimes.slice(0, 5).map(t => t.toFixed(2)).join(', ')}...

With Pit Stop Strategy:
- Total Time: ${pitTotal.toFixed(2)}s
- Average Lap: ${(pitTotal / pitTimes.length).toFixed(2)}s
- Lap Times: ${pitTimes.slice(0, 5).map(t => t.toFixed(2)).join(', ')}...

Time Difference: ${timeDifference.toFixed(2)}s

Provide strategic analysis in JSON format:
{
  "summary": "2-3 sentence summary of which strategy is better and why",
  "keyFindings": ["Finding 1", "Finding 2", "Finding 3"],
  "recommendations": ["Specific recommendation 1", "Specific recommendation 2"],
  "warnings": ["Risk or warning if any"],
  "confidence": "high|medium|low"
}

Return ONLY valid JSON, no markdown formatting.`;

  try {
    const response = await sendMessageToGemini(prompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No JSON found in response');
  } catch (error) {
    console.error('Failed to generate real-time insights:', error);
    const betterStrategy = noPitTotal < pitTotal ? 'No Pit Stop' : 'Pit Stop';
    return {
      summary: `${betterStrategy} strategy is faster by ${timeDifference.toFixed(2)}s over ${noPitTimes.length} laps.`,
      keyFindings: [
        `No Pit Stop: ${noPitTotal.toFixed(2)}s total`,
        `Pit Stop: ${pitTotal.toFixed(2)}s total`,
        `Difference: ${timeDifference.toFixed(2)}s`,
      ],
      recommendations: [
        `Consider ${betterStrategy} strategy for optimal performance`,
        'Monitor tire degradation and fuel consumption',
      ],
      confidence: timeDifference > 5 ? 'high' : timeDifference > 2 ? 'medium' : 'low',
    };
  }
}

/**
 * Generate AI-powered insights for Post-Event Analysis
 */
export async function generatePostEventInsights(
  mae: number,
  rmse: number,
  modelR2: number,
  modelRmse: number,
  performanceStatus: string,
  trackName: string
): Promise<PredictiveInsight> {
  if (!isGeminiAvailable()) {
    return {
      summary: 'AI insights unavailable. Please configure Gemini API key.',
      keyFindings: [],
      recommendations: [],
      confidence: 'low',
    };
  }

  const prompt = `You are a data scientist analyzing prediction model performance. Analyze this post-event analysis:

Track: ${trackName}
Model Performance:
- Model R² Score: ${modelR2.toFixed(2)}%
- Model RMSE: ${modelRmse.toFixed(2)}s

Session Performance:
- Session MAE: ${mae.toFixed(2)}s
- Session RMSE: ${rmse.toFixed(2)}s
- Performance Status: ${performanceStatus}

Provide analysis in JSON format:
{
  "summary": "2-3 sentence summary of model performance and accuracy",
  "keyFindings": ["Finding 1", "Finding 2", "Finding 3"],
  "recommendations": ["Recommendation 1", "Recommendation 2"],
  "warnings": ["Warning if model needs improvement"],
  "confidence": "high|medium|low"
}

Return ONLY valid JSON, no markdown formatting.`;

  try {
    const response = await sendMessageToGemini(prompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No JSON found in response');
  } catch (error) {
    console.error('Failed to generate post-event insights:', error);
    return {
      summary: `Model shows ${performanceStatus} performance with RMSE of ${rmse.toFixed(2)}s compared to model baseline of ${modelRmse.toFixed(2)}s.`,
      keyFindings: [
        `Session RMSE: ${rmse.toFixed(2)}s`,
        `Model RMSE: ${modelRmse.toFixed(2)}s`,
        `Performance: ${performanceStatus}`,
      ],
      recommendations: [
        rmse > modelRmse ? 'Consider model retraining with recent data' : 'Model is performing well',
        'Continue monitoring prediction accuracy',
      ],
      confidence: rmse < modelRmse + 0.5 ? 'high' : rmse < modelRmse + 1 ? 'medium' : 'low',
    };
  }
}

/**
 * Get explanation for analysis modes
 */
export async function getAnalysisModeExplanation(mode: string): Promise<AnalysisExplanation> {
  if (!isGeminiAvailable()) {
    // Fallback explanations
    const fallbacks: Record<string, AnalysisExplanation> = {
      pre: {
        title: 'Pre-Event Analysis',
        description: 'Compare predicted lap times with actual lap times before the race starts.',
        whatItMeans: 'This helps validate prediction accuracy and identify potential issues early.',
        howToUse: [
          'Select track, session, vehicle, starting lap, and stint length',
          'Click "Pre-Event Analysis" mode',
          'Review predicted vs actual comparison',
        ],
        tips: [
          'Use this to validate model accuracy',
          'Look for consistent patterns in errors',
          'Compare with historical data',
        ],
      },
      real: {
        title: 'Real-Time Strategy',
        description: 'Compare pit stop vs no-pit strategies during the race.',
        whatItMeans: 'Helps make real-time strategic decisions about pit stops.',
        howToUse: [
          'Configure your race parameters',
          'Select "Real-Time Strategy" mode',
          'Compare both strategies side-by-side',
        ],
        tips: [
          'Consider tire degradation',
          'Factor in track position',
          'Monitor fuel consumption',
        ],
      },
      post: {
        title: 'Post-Event Analysis',
        description: 'Analyze prediction accuracy with detailed metrics and insights.',
        whatItMeans: 'Provides comprehensive analysis of how well predictions matched reality.',
        howToUse: [
          'Run a prediction first',
          'Select "Post-Event Analysis" mode',
          'Review metrics and insights',
        ],
        tips: [
          'Focus on RMSE and MAE metrics',
          'Compare with model baseline',
          'Use insights to improve future predictions',
        ],
      },
    };
    return fallbacks[mode] || fallbacks.pre;
  }

  const prompt = `Explain the "${mode}" analysis mode for a racing prediction system. Provide a clear, user-friendly explanation in JSON format:

{
  "title": "Mode title",
  "description": "What this mode does (1-2 sentences)",
  "whatItMeans": "What the results mean for the user (1-2 sentences)",
  "howToUse": ["Step 1", "Step 2", "Step 3"],
  "tips": ["Tip 1", "Tip 2", "Tip 3"]
}

Return ONLY valid JSON, no markdown formatting.`;

  try {
    const response = await sendMessageToGemini(prompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No JSON found in response');
  } catch (error) {
    console.error('Failed to get mode explanation:', error);
    // Return fallback
    return {
      title: mode.charAt(0).toUpperCase() + mode.slice(1) + ' Analysis',
      description: 'Analyze race predictions and performance.',
      whatItMeans: 'Provides insights into race predictions.',
      howToUse: ['Configure settings', 'Select mode', 'Review results'],
      tips: ['Use the sidebar to configure', 'Check all parameters'],
    };
  }
}

