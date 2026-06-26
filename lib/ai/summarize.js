import OpenAI from "openai";
import { summaryResponseSchema } from "@/lib/validators";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005",
    "X-Title": "Meet - AI Meeting Summaries",
  },
});

export async function generateSummary(transcript) {
  let lastError = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a meeting summarizer. Given a transcript, produce a strict JSON response with these fields:
- summary: a 2-4 sentence overview of the discussion
- actionItems: an array of specific tasks that need to be done
- keyPoints: an array of the most important points discussed
- followUps: an optional array of topics that need follow-up discussion

The transcript may be in any language, but you MUST output the summary, actionItems, keyPoints, and followUps in English only. Treat the content as an English discussion even if the transcript contains non-English speech — translate and summarize into English.

Respond ONLY with valid JSON. No markdown, no code blocks.`,
          },
          { role: "user", content: transcript },
        ],
        response_format: { type: "json_object" },
        max_tokens: 800,
      });

      const raw = JSON.parse(response.choices[0].message.content);
      return summaryResponseSchema.parse(raw);
    } catch (error) {
      lastError = error;
      if (attempt === 1) {
        throw new Error(`Summary generation failed: ${lastError.message}`);
      }
    }
  }
}
