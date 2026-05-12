import { checkRateLimit } from "@/lib/rateLimit";
import { google } from "@ai-sdk/google";
import { streamText, tool } from "ai";
import { headers } from "next/headers";
import { z } from "zod";

export const maxDuration = 30;

export async function POST(req: Request) {
  const ip =
    (await headers()).get("x-forwarded-for")?.split(",")[0].trim() ??
    "127.0.0.1";
  const { allowed } = checkRateLimit(ip);
  if (!allowed) {
    return new Response("Rate limit exceeded", { status: 429 });
  }

  const { messages, assets, holdings } = await req.json();

  // Build a concise portfolio context string for the system prompt
  const today = new Date().toISOString().split("T")[0];

  const assetLines: string[] = (assets ?? []).map(
    (a: { ticker: string; name: string }) => `  - ${a.ticker} (${a.name})`,
  );

  const holdingLines: string[] = Object.entries(
    holdings ?? {},
  ).map(([ticker, h]) => {
    const holding = h as { netShares: number; avgCostBasis: number };
    return `  - ${ticker}: ${holding.netShares} shares @ avg $${holding.avgCostBasis.toFixed(2)}`;
  });

  const systemPrompt = `You are a helpful portfolio assistant. Today's date is ${today}.

The user's tracked assets are:
${assetLines.length ? assetLines.join("\n") : "  (none yet)"}

Current holdings (positions with shares):
${holdingLines.length ? holdingLines.join("\n") : "  (no open positions)"}

Your job:
- Help the user record trades (buy/sell) by extracting details from natural language.
- Always use the official ticker symbol (e.g. "NVIDIA" → "NVDA", "Apple" → "AAPL").
- When the user describes a trade, call the record_trade tool with the extracted details.
- If a date is not mentioned, use today (${today}).
- If a price is not mentioned, ask the user for it — do not guess.
- Confirm ambiguous details before calling the tool.
- Keep responses concise and friendly.
- Do NOT call record_trade for sell transactions that would result in more shares sold than held.`;

  const result = streamText({
    model: google("gemini-2.0-flash"),
    system: systemPrompt,
    messages,
    tools: {
      record_trade: tool({
        description:
          "Record a buy or sell transaction in the user's portfolio. Call this after confirming the trade details with the user.",
        parameters: z.object({
          ticker: z
            .string()
            .toUpperCase()
            .describe("The official stock/ETF ticker symbol (e.g. NVDA, AAPL)"),
          type: z.enum(["buy", "sell"]).describe("Whether this is a buy or sell"),
          shares: z
            .number()
            .positive()
            .describe("Number of shares bought or sold"),
          pricePerShare: z
            .number()
            .positive()
            .describe("Price per share in USD"),
          date: z
            .string()
            .optional()
            .describe(
              "ISO date string (YYYY-MM-DD). Defaults to today if omitted.",
            ),
        }),
        execute: async ({ ticker, type, shares, pricePerShare, date }) => {
          // The actual addTransaction call happens client-side after user confirms.
          // This just echoes back the parsed trade for the confirmation card.
          return { ticker, type, shares, pricePerShare, date: date ?? today };
        },
      }),
    },
  });

  return result.toDataStreamResponse();
}
