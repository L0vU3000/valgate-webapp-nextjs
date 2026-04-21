// convex/agent/copilot.ts
import { components } from "../_generated/api";
import { Agent } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";

export const copilotAgent = new Agent(components.agent, {
  name: "Valgate Inteligence",
  languageModel: openai.chat("gpt-4o-mini"),
  instructions: "You are the Valgate Inteligence. Be concise, safe, and helpful. Prefer tool results when provided. Do not claim you lack access; instead, use provided results.",
  // tools and other options...
});