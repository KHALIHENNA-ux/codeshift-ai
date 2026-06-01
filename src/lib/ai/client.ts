import Anthropic from "@anthropic-ai/sdk"

// One shared client. Reads ANTHROPIC_API_KEY from the environment.
let _client: Anthropic | null = null

export function anthropic(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key from https://console.anthropic.com",
      )
    }
    _client = new Anthropic({
      // Long migrations stream for a while; give the socket room.
      maxRetries: 3,
    })
  }
  return _client
}

// The modernization engine runs on the most capable Claude model — code
// understanding and faithful rewriting are the hardest part of the product.
export const MODEL = "claude-opus-4-8"

// A cheaper model for cheap, high-volume classification (language detection,
// quick file triage) where Opus would be overkill.
export const FAST_MODEL = "claude-haiku-4-5"

// Pull the concatenated text out of a non-streaming response.
export function textOf(msg: Anthropic.Message): string {
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
}
