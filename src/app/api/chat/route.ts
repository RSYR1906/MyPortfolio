import { checkRateLimit } from "@/lib/rateLimit";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { UIMessage } from "ai";
import { convertToModelMessages, stepCountIs, streamText, tool } from "ai";
import { headers } from "next/headers";
import { z } from "zod";

export const maxDuration = 30;
export const runtime = "nodejs";

interface AssetContext {
  ticker: string;
  name: string;
}

interface HoldingContext {
  netShares: number;
  avgCostBasis: number;
}

interface ChatRequestBody {
  messages: UIMessage[];
  assets: AssetContext[];
  holdings: Record<string, HoldingContext>;
}

const RECORD_TRADE_SCHEMA = z.object({
  ticker: z
    .string()
    .describe("The official stock/ETF ticker symbol (e.g. NVDA, AAPL)"),
  type: z.enum(["buy", "sell"]).describe("Whether this is a buy or sell"),
  shares: z.number().positive().describe("Number of shares bought or sold"),
  pricePerShare: z.number().positive().describe("Price per share in USD"),
  date: z
    .string()
    .optional()
    .describe("ISO date string (YYYY-MM-DD). Defaults to today if omitted."),
});

function getRequestIp(forwardedFor: string | null): string {
  if (!forwardedFor) return "127.0.0.1";
  const [firstIp] = forwardedFor.split(",");
  return firstIp.trim();
}

function getGoogleApiKey(): string | null {
  const key =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!key) return null;
  return key.trim() || null;
}

function buildSystemPrompt(
  today: string,
  assets: AssetContext[] = [],
  holdings: Record<string, HoldingContext> = {},
): string {
  const assetLines = assets.map((a) => `  - ${a.ticker} (${a.name})`);

  const holdingLines = Object.entries(holdings).map(([ticker, h]) => {
    return `  - ${ticker}: ${h.netShares} shares @ avg $${h.avgCostBasis.toFixed(2)}`;
  });

  return `You are a helpful portfolio assistant. Today's date is ${today}.

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
}

export async function POST(req: Request) {
  const ip = getRequestIp((await headers()).get("x-forwarded-for"));
  const { allowed } = checkRateLimit(`chat:${ip}`);
  if (!allowed) {
    return new Response("Too many chat requests. Please wait and try again.", {
      status: 429,
    });
  }

  const { messages, assets, holdings } =
    (await req.json()) as ChatRequestBody;

  const googleApiKey = getGoogleApiKey();
  if (!googleApiKey) {
    return new Response(
      "Missing Google AI API key on server. Set GOOGLE_GENERATIVE_AI_API_KEY (or GOOGLE_API_KEY) in Vercel project environment variables and redeploy.",
      { status: 500 },
    );
  }
  const google = createGoogleGenerativeAI({ apiKey: googleApiKey });

  // Build a concise portfolio context string for the system prompt
  const today = new Date().toISOString().split("T")[0];
  const systemPrompt = buildSystemPrompt(today, assets, holdings);

  try {
    const result = streamText({
      model: google("gemini-2.5-flash"),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      stopWhen: stepCountIs(3),
      tools: {
        record_trade: tool({
          description:
            "Record a buy or sell transaction in the user's portfolio. Call this after confirming the trade details with the user.",
          inputSchema: RECORD_TRADE_SCHEMA,
          execute: async ({ ticker, type, shares, pricePerShare, date }) => {
            // The actual addTransaction call happens client-side after user confirms.
            // This just echoes back the parsed trade for the confirmation card.
            const tradeDate = typeof date === "string" && date ? date : today;
            return {
              ticker: ticker.toUpperCase(),
              type,
              shares,
              pricePerShare,
              date: tradeDate,
            };
          },
        }),
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat route failed", error);
    const message = error instanceof Error ? error.message : String(error);
    if (/api key|unauthorized|permission|forbidden|401|403/i.test(message)) {
      return new Response(
        "Google AI authentication failed. Verify your Vercel environment variable and key restrictions.",
        { status: 401 },
      );
    }
    return new Response(`AI assistant is unavailable right now. ${message}`, {
      status: 500,
    });
  }
}
