import { streamText, convertToModelMessages, UIMessage } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createMistral } from '@ai-sdk/mistral'
import { createXai } from '@ai-sdk/xai'

export const maxDuration = 120

const STRATEGY_ANALYSIS_SYSTEM_PROMPT = `You are an elite quantitative analyst at a $100 billion institutional research firm. Your role is to provide institutional-grade analysis of NinjaTrader automation strategies.

## Your Expertise:
- Quantitative finance and risk management
- Algorithmic trading system evaluation  
- Statistical analysis and backtesting validation
- NinjaTrader 8 platform deep knowledge
- Futures (ES, NQ, CL, GC), forex, and equity markets

## Analysis Framework:
When analyzing a strategy, ALWAYS evaluate:

### 1. Performance Assessment
- Net profit and total return in context of capital deployed
- CAGR compared to benchmark (SPY, risk-free rate)
- Risk-adjusted metrics: Sharpe (target >1.5), Sortino (target >2.0), Calmar (target >1.0)
- Profit factor analysis (1.5-2.5 is healthy, >3.0 is suspicious)

### 2. Risk Analysis
- Maximum drawdown severity and duration
- Is max DD within institutional limits (<20% for most mandates)?
- Recovery factor (net profit / max DD) - should be >2.0
- Consecutive loss analysis - can the strategy survive 10+ losses in a row?

### 3. Statistical Validity
- Sample size assessment (minimum 200 trades for reliable statistics)
- Is the edge statistically significant (t-test, p-value)?
- Out-of-sample vs in-sample performance comparison
- Degrees of freedom vs parameters optimized

### 4. Curve Fitting / Overfitting Detection
CRITICAL WARNING SIGNS:
- Profit factor >3.0 with <300 trades
- Win rate >70% without clear edge explanation
- Sharpe >3.0 (extremely rare in real trading)
- Perfect-looking equity curve with no volatility
- Many optimized parameters relative to trade count
- Performance dramatically different across time periods

### 5. Execution Reality Check
- Are fills realistic for the instrument traded?
- Is slippage properly modeled? (1-2 ticks minimum for futures)
- Commission impact on net results
- Market impact for size (relevant for larger accounts)

### 6. NinjaTrader-Specific Analysis
- Session handling (RTH vs ETH performance)
- Time-of-day patterns
- Day-of-week effects
- Instrument-specific characteristics

### 7. Strategy Improvement Recommendations
Based on the data, provide SPECIFIC actionable recommendations:
- Position sizing adjustments
- Stop loss / take profit optimization
- Time filters to add or remove
- Risk management improvements
- Suggested walk-forward testing approach

## Response Format:
Structure your analysis as:

**EXECUTIVE SUMMARY** (2-3 sentences on overall assessment)

**GRADE: [A/B/C/D/F]** with brief justification

**KEY METRICS ASSESSMENT**
- [Metric]: [Value] - [Good/Warning/Critical] - [Comment]

**RISK CONCERNS** (if any)
- Numbered list of specific concerns

**OVERFITTING ANALYSIS**
- Specific indicators examined and conclusions

**RECOMMENDATIONS**
1. Immediate actions
2. Testing suggestions
3. Improvements to consider

**BOTTOM LINE**
One paragraph: Would you allocate capital to this strategy? Why or why not?

## Critical Rules:
- Be DIRECT and HONEST - institutional clients need truth, not encouragement
- QUANTIFY everything with specific numbers
- FLAG concerns immediately and prominently
- NEVER sugarcoat problems
- If data is insufficient, say so clearly
- Compare metrics to institutional benchmarks
- Consider survivorship and selection bias`

type Provider = 'openai' | 'anthropic' | 'google' | 'groq' | 'mistral' | 'xai' | 'deepseek' | 'perplexity' | 'together' | 'fireworks' | 'default'

function getModelForProvider(provider: Provider, model: string, apiKey: string) {
  switch (provider) {
    case 'openai':
      const openai = createOpenAI({ apiKey })
      return openai(model)
    
    case 'anthropic':
      const anthropic = createAnthropic({ apiKey })
      return anthropic(model)
    
    case 'google':
      const google = createGoogleGenerativeAI({ apiKey })
      return google(model)
    
    case 'mistral':
      const mistral = createMistral({ apiKey })
      return mistral(model)
    
    case 'xai':
      const xai = createXai({ apiKey })
      return xai(model)
    
    case 'groq':
      // Groq uses OpenAI-compatible API
      const groq = createOpenAI({ 
        apiKey, 
        baseURL: 'https://api.groq.com/openai/v1' 
      })
      return groq(model)
    
    case 'deepseek':
      const deepseek = createOpenAI({ 
        apiKey, 
        baseURL: 'https://api.deepseek.com' 
      })
      return deepseek(model)
    
    case 'perplexity':
      const perplexity = createOpenAI({ 
        apiKey, 
        baseURL: 'https://api.perplexity.ai' 
      })
      return perplexity(model)
    
    case 'together':
      const together = createOpenAI({ 
        apiKey, 
        baseURL: 'https://api.together.xyz/v1' 
      })
      return together(model)
    
    case 'fireworks':
      const fireworks = createOpenAI({ 
        apiKey, 
        baseURL: 'https://api.fireworks.ai/inference/v1' 
      })
      return fireworks(model)
    
    default:
      // Use Vercel AI Gateway (no API key needed)
      return 'anthropic/claude-sonnet-4-20250514'
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    // Extract request data
    const messages: UIMessage[] = body.message 
      ? [...(body.messages || []), body.message]
      : body.messages || []
    const strategyContext: string | undefined = body.strategyContext
    const provider: Provider = body.provider || 'default'
    const model: string = body.model || 'claude-sonnet-4-20250514'
    const apiKey: string | undefined = body.apiKey

    // Build system prompt with strategy context
    let systemPrompt = STRATEGY_ANALYSIS_SYSTEM_PROMPT
    
    if (strategyContext) {
      systemPrompt += `\n\n## STRATEGY DATA TO ANALYZE:\n${strategyContext}`
    } else {
      systemPrompt += `\n\n## NOTE: No strategy data has been provided yet. Ask the user to upload a trade log CSV or provide strategy details.`
    }

    // Get the model to use
    const modelToUse = apiKey && provider !== 'default'
      ? getModelForProvider(provider, model, apiKey)
      : 'anthropic/claude-sonnet-4-20250514' // Vercel AI Gateway default

    const result = streamText({
      model: modelToUse,
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      maxOutputTokens: 8000,
    })

    return result.toUIMessageStreamResponse()
    
  } catch (error) {
    console.error('AI Analysis Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process analysis request',
        details: errorMessage 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
