
'use server';
/**
 * @fileOverview An AI agent for estimating trade slippage.
 *
 * - estimateSlippage - A function that handles the slippage estimation process.
 * - SlippageEstimatorInput - The input type for the estimateSlippage function.
 * - SlippageEstimatorOutput - The return type for the estimateSlippage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { OrderBookLevel } from '@/types';


const AskLevelSchema = z.object({
  price: z.number().describe('The price of the ask level.'),
  quantity: z.number().describe('The quantity available at this ask level.'),
});

const SlippageEstimatorInputSchema = z.object({
  spotAsset: z.string().describe('The trading pair, e.g., BTC-USDT-SWAP.'),
  tradeQuantity: z.number().describe('The quantity of the base asset to be traded (e.g., amount of BTC).'),
  bestAskPrice: z.number().describe('The best (lowest) ask price currently available.'),
  askBookSnapshot: z.array(AskLevelSchema).max(10).describe('A snapshot of the top (up to 10) levels of the ask side of the order book, sorted by price ascending.'),
});
export type SlippageEstimatorInput = z.infer<typeof SlippageEstimatorInputSchema>;

const SlippageEstimatorOutputSchema = z.object({
  estimatedSlippageValue: z.number().describe('The total estimated slippage for the trade in quote currency (e.g., USDT). This is the total extra cost due to price movement caused by the trade, not a percentage or per-unit value.'),
  confidence: z.enum(['high', 'medium', 'low']).describe('The confidence level of the estimation.'),
  reasoning: z.string().optional().describe('A brief explanation for the estimated slippage and confidence.'),
});
export type SlippageEstimatorOutput = z.infer<typeof SlippageEstimatorOutputSchema>;


export async function estimateSlippage(input: SlippageEstimatorInput): Promise<SlippageEstimatorOutput> {
  // In a real scenario, you might add more complex pre-processing here
  // or call other services before invoking the LLM.
  return slippageEstimatorFlow(input);
}

const slippageEstimationPrompt = ai.definePrompt({
  name: 'slippageEstimationPrompt',
  input: {schema: SlippageEstimatorInputSchema},
  output: {schema: SlippageEstimatorOutputSchema},
  prompt: `You are an expert financial market analyst specializing in trade execution and slippage estimation for cryptocurrency markets.

Analyze the following trade request and order book data to estimate the total slippage in the quote currency.

Trade Details:
- Asset: {{{spotAsset}}}
- Quantity to Buy: {{{tradeQuantity}}}
- Current Best Ask Price: {{{bestAskPrice}}}

Ask Book Snapshot (Price, Quantity available):
{{#each askBookSnapshot}}
- Price: {{{this.price}}}, Quantity: {{{this.quantity}}}
{{/each}}

Your Task:
1. Calculate the likely execution price if an order of the specified 'Quantity to Buy' is placed.
2. Determine the total slippage in the quote currency. Slippage is the difference between the total cost if the entire order was filled at the 'Current Best Ask Price' and the actual total cost based on walking the book.
3. Provide a confidence level (high, medium, low) for your estimation.
4. Briefly explain your reasoning, especially if the order size is large relative to visible liquidity.

Consider that large orders might consume multiple levels of the order book, leading to a higher average execution price than the best ask. If the order quantity exceeds the total visible liquidity in the snapshot, estimate slippage based on the visible portion and state that the order may not be fully filled at these levels, impacting confidence.

Output ONLY the JSON object as specified.
`,
});

const slippageEstimatorFlow = ai.defineFlow(
  {
    name: 'slippageEstimatorFlow',
    inputSchema: SlippageEstimatorInputSchema,
    outputSchema: SlippageEstimatorOutputSchema,
  },
  async (input: SlippageEstimatorInput): Promise<SlippageEstimatorOutput> => {
    // Ensure numerical inputs for the prompt
    const processedInput = {
      ...input,
      tradeQuantity: Number(input.tradeQuantity),
      bestAskPrice: Number(input.bestAskPrice),
      askBookSnapshot: input.askBookSnapshot.map(ask => ({
        price: Number(ask.price),
        quantity: Number(ask.quantity),
      })),
    };

    try {
      const {output} = await slippageEstimationPrompt(processedInput);
      if (!output) {
        console.error("Slippage estimation prompt did not return structured output.");
        return {
          estimatedSlippageValue: 0,
          confidence: 'low',
          reasoning: 'AI model did not return structured output.',
        };
      }
      return output;
    } catch (error: any) {
      console.error("Error during AI slippage estimation:", error);
      let reasoning = 'Failed to get estimation from AI model due to an unexpected error.';
      // Check if the error message indicates a rate limit
      if (error.message && (error.message.includes("429") || error.message.toLowerCase().includes("too many requests") || error.message.toLowerCase().includes("quota exceeded"))) {
        reasoning = 'AI estimation failed due to API rate limits. Please try again later or check your API plan. You may need to wait a few minutes.';
      } else if (error.message) {
        reasoning = `AI estimation failed: ${error.message}`;
      }
      return {
        estimatedSlippageValue: 0,
        confidence: 'low',
        reasoning: reasoning,
      };
    }
  }
);

