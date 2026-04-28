"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { decryptEnvelope } from "../crypto/kms";
import { api as gen } from "../_generated/api";
import OpenAI from "openai";


function extractProvince(input: string): string | undefined {
  const text = input.trim();
  // Case 1: in "Phnom Penh" ...
  const quoted = text.match(/\bin\s+"([^"]+)"(?:\s|[?.!]|$)/i);
  if (quoted && quoted[1]) return quoted[1].trim();
  // Case 2: in Phnom Penh? / in Phnom Penh.
  const unquoted = text.match(/\bin\s+([a-z\s]+?)(?=["?.!,]|$)/i);
  if (unquoted && unquoted[1]) return unquoted[1].trim();
  return undefined;
}

export const getMessagesDecrypted = action({
  args: { threadId: v.id("copilot_thread") },
  returns: v.array(
    v.object({ id: v.id("copilot_message"), role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")), content: v.string() }),
  ),
  handler: async (ctx, { threadId }) => {
    const raw = await ctx.runQuery(api.copilot.threads.listMessagesRaw, { threadId });
    const out: Array<{ id: any; role: any; content: string }> = [];
    for (const m of raw) {
      const aad = { threadId: String(threadId), v: m.aadV };
      const plaintext = await decryptEnvelope({
        envelope: {
          algo: "AES-256-GCM",
          ivB64: m.ivB64,
          aadV: m.aadV,
          dekCiphertextB64: m.dekCiphertextB64,
          ciphertextB64: m.ciphertextB64,
        },
        aad,
      });
      const content = new TextDecoder().decode(plaintext);
      out.push({ id: m._id as any, role: m.role as any, content });
    }
    return out;
  },
});

// --- helpers ---------------------------------------------------------------
type Msg = { role: "system"|"user"|"assistant"|"tool"; content: string; name?: string; tool_call_id?: string };

export const sendAndStream = action({
  args: { threadId: v.id("copilot_thread"), content: v.string() },
  returns: v.array(v.object({ kind: v.string(), payload: v.any() })),
  handler: async (ctx, { threadId, content }) => {
    // 1) Membership + rate limit
    await ctx.runQuery(api.copilot.threads.getThreadMeta, { threadId } as any);
    const rl = await ctx.runQuery(gen.copilot.usage.checkDailyLimit, { threadId });
    if (!rl.allowed) {
      return [{ kind: "final", payload: "Rate limit reached for today. Please try again tomorrow." }];
    }

    // 2) Persist user message (encrypted) + audit
    const aadUser = { threadId: String(threadId), v: 1 } as any;
    const envUser = await ctx.runAction(api.crypto.actions.encryptEnvelopeAction, {
      aad: aadUser,
      plaintext: content
    });
    await ctx.runMutation(api.copilot.threads.insertEncryptedMessage, {
      threadId, role: "user", envelope: envUser
    } as any);
    await ctx.runMutation(api.copilot.events.logEvent, {
      threadId, kind: "audit", payload: { action: "user_message", size: content.length }
    });

    // 3) Minimal context (last 20 messages; decrypted)
    const recentRaw = await ctx.runQuery(api.copilot.threads.listMessagesRaw, { threadId });
    const recent: Array<{ role: "user"|"assistant"|"system"; content: string }> = [];
    for (const m of recentRaw.slice(-20)) {
      const aad = { threadId: String(threadId), v: m.aadV } as any;
      const plaintext = await decryptEnvelope({
        envelope: {
          algo: "AES-256-GCM",
          ivB64: m.ivB64,
          aadV: m.aadV,
          dekCiphertextB64: m.dekCiphertextB64,
          ciphertextB64: m.ciphertextB64,
        },
        aad,
      });
      recent.push({ role: m.role as any, content: new TextDecoder().decode(plaintext) });
    }

    // 4) Define GPT-5 tools (the model chooses; we just execute)
    const tools: OpenAI.ChatCompletionTool[] = [
      {
        type: "function",
        function: {
          name: "map_geocode",
          description: "Geocode a place string and suggest a map fly-to intent.",
          parameters: {
            type: "object",
            properties: { query: { type: "string" } },
            required: ["query"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "ui_link_to_map",
          description:
            "Construct a navigable link to the map with optional lat/long/zoom/idProperty. Use when suggesting the user to open the map.",
          parameters: {
            type: "object",
            properties: {
              lat: { type: "number", description: "Latitude in WGS84" },
              long: { type: "number", description: "Longitude in WGS84" },
              zoom: { type: "number", description: "Zoom level (0-22)" },
              idProperty: { type: "string", description: "Property id to focus" },
              locale: { type: "string", description: "Locale segment like 'en'" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "rag_search",
          description: "Semantic search over the org/thread document index and return top citations.",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string" },
              k: { type: "number", description: "how many citations to return", default: 3 }
            },
            required: ["query"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "qa_count_properties",
          description: "Return count of properties for the current org/thread.",
          parameters: { type: "object", properties: {} }
        }
      },
      {
        type: "function",
        function: {
          name: "qa_count_properties_in_province",
          description: "Return property count in the given province.",
          parameters: {
            type: "object",
            properties: { province: { type: "string" } },
            required: ["province"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "qa_sum_valuation_in_province",
          description: "Sum asset valuation for a province.",
          parameters: {
            type: "object",
            properties: { province: { type: "string" } },
            required: ["province"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "qa_count_by_type_in_province",
          description: "Count properties by asset type in a province.",
          parameters: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["land","house","shophouse","apartment","condo","unit"] },
              province: { type: "string" }
            },
            required: ["type","province"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "ui_zoom_to_filtered",
          description: "Emit a UI intent for the map to zoom to a province filter.",
          parameters: {
            type: "object",
            properties: { province: { type: "string" } },
            required: ["province"]
          }
        }
      }
    ];

    // 5) Tool backends (server-side implementations)
    const runTool = async (toolName: string, args: any) => {
      switch (toolName) {
        case "map_geocode": {
          const token = process.env.MAPBOX_TOKEN;
          if (!token) return { ok: false, error: "Missing MAPBOX_TOKEN" };
          try {
            const resp = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(args.query)}.json?access_token=${token}&limit=1`
            );
            const data = await resp.json();
            const f = data?.features?.[0];
            if (f?.center && Array.isArray(f.center)) {
              // Also record an intent so your client can animate
              const lng = f.center[0];
              const lat = f.center[1];
              const zoom = 12;
              const locale = typeof args.locale === "string" && args.locale ? args.locale : "en";
              const href = `/${locale}/dashboard/map?lat=${encodeURIComponent(lat)}&long=${encodeURIComponent(lng)}&zoom=${encodeURIComponent(zoom)}`;
              return { ok: true, lng, lat, zoom, link: href, label: "Access the map" };
            }
            return { ok: false, error: "No result" };
          } catch (e: any) {
            return { ok: false, error: e?.message || "Mapbox error" };
          }
        }

        case "ui_link_to_map": {
          const locale = typeof args.locale === "string" && args.locale ? args.locale : "en";
          const qp: string[] = [];
          if (typeof args.lat === "number") qp.push(`lat=${encodeURIComponent(args.lat)}`);
          if (typeof args.long === "number") qp.push(`long=${encodeURIComponent(args.long)}`);
          if (typeof args.zoom === "number") qp.push(`zoom=${encodeURIComponent(args.zoom)}`);
          if (typeof args.idProperty === "string" && args.idProperty) qp.push(`idProperty=${encodeURIComponent(args.idProperty)}`);
          const href = `/${locale}/dashboard/map${qp.length ? `?${qp.join("&")}` : ""}`;
          return { ok: true, link: href, label: "Access the map" };
        }

        case "rag_search": {
          try {
            const idx = await ctx.runQuery(api.copilot.rag.listIndexByThread, {
              threadId, limit: 200
            } as any);

            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey) return { ok: false, error: "Missing OPENAI_API_KEY for embeddings" };

            const oai = new OpenAI({ apiKey });
            const emb = await oai.embeddings.create({
              model: "text-embedding-3-small",
              input: args.query
            });
            const qv = emb.data[0].embedding as number[];

            const cosine = (a: number[], b: number[]) => {
              let dp = 0, na = 0, nb = 0;
              const L = Math.min(a.length, b.length);
              for (let i = 0; i < L; i++) { dp += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
              return dp / ((Math.sqrt(na)+1e-8) * (Math.sqrt(nb)+1e-8));
            };

            const ranked = (idx as any[])
              .map((r) => ({ r, score: cosine(qv, r.vector as number[]) }))
              .sort((x, y) => y.score - x.score)
              .slice(0, Math.max(1, Math.min(10, args.k ?? 3)));

            const cites = ranked.map(x => ({
              fileId: x.r.fileId, span: x.r.chunkRef, score: x.score
            }));

            return { ok: true, citations: cites };
          } catch (e: any) {
            return { ok: false, error: e?.message || "RAG error" };
          }
        }

        case "qa_count_properties": {
          const r = await ctx.runQuery(api.copilot.qa.countProperties, {} as any);
          return { ok: true, result: r };
        }

        case "qa_count_properties_in_province": {
          const r = await ctx.runQuery(api.copilot.qa.countPropertiesInProvince, { province: args.province } as any);
          return { ok: true, province: args.province, result: r };
        }

        case "qa_sum_valuation_in_province": {
          const r = await ctx.runQuery(api.copilot.qa.sumValuationInProvince, { province: args.province } as any);
          return { ok: true, province: args.province, result: r };
        }

        case "qa_count_by_type_in_province": {
          const r = await ctx.runQuery(api.copilot.qa.countByTypeInProvince, {
            type: args.type, province: args.province
          } as any);
          return { ok: true, type: args.type, province: args.province, result: r };
        }

        case "ui_zoom_to_filtered": {
          // We return a dedicated envelope the client can consume as an intent event
          return { ok: true, intent: { type: "ZOOM_TO_FILTERED", province: args.province } };
        }

        default:
          return { ok: false, error: `Unknown tool: ${toolName}` };
      }
    };

    // 6) Ask GPT-5 with tool choice = auto, loop on tool calls (no regex heuristics)
    const apiKey = process.env.OPENAI_API_KEY;
    let reply = "";
    const events: Array<{ kind: string; payload: any }> = [];

    if (!apiKey) {
      reply = "AI unavailable: missing OPENAI_API_KEY.";
    } else {
      const client = new OpenAI({ apiKey });

      const messages: Msg[] = [
        {
          role: "system",
          content:
            "You are the AI Valgate Intelligence Copilot for Valgate platform,Valgate platform is a saas platform for properties management. You are speaking directly to a user and can suggest clear actions and in-app navigation. " +
            "Respond in Markdown. Format any links using [label](url). " +
            "Prefer calling tools to retrieve exact answers, then summarize concisely. " +
            "When the user implies map navigation or a location, first provide an accessible call-to-action link to open the map (label: 'Access the map'), " +
            "formatted as '/{locale}/dashboard/map?lat=...&long=...&zoom=...' or with 'idProperty=...'. " +
            "Use ui_link_to_map or map_geocode to produce the link. Then briefly explain what they will see. " +
            "If a province filter is requested, you may also call ui_zoom_to_filtered."
            
        },
        ...recent as any,
        { role: "user", content: content.trim() }
      ];

      // up to N tool-interaction rounds
      const MAX_TOOL_STEPS = 4;
      for (let step = 0; step < MAX_TOOL_STEPS; step++) {
        const cc = await client.chat.completions.create({
          model: "gpt-5",           // ← GPT-5 with tool calls
          temperature: 1,
          tools,
          tool_choice: "auto",
          messages: messages as any
        });

        const msg = cc.choices?.[0]?.message;
        const toolCalls = msg?.tool_calls ?? [];

        // If the model returned a final answer with no tool calls, stop.
        if (!toolCalls?.length) {
          reply = (msg?.content || "").trim();
          break;
        }

        // Execute each tool call, push tool results, and continue the loop
        // First, append the assistant message that contains the tool_calls so that
        // subsequent tool messages are properly paired to a preceding assistant turn.
        messages.push({
          role: "assistant",
          content: (msg?.content as any) ?? "",
          // Pass through tool_calls so the next turn can include tool results
          // and remain valid per the API contract.
          tool_calls: (msg as any)?.tool_calls,
        } as any);

        for (const tc of toolCalls) {
          const name = (tc as any).function?.name!;
          const args = (tc as any).function?.arguments ? JSON.parse((tc as any).function.arguments) : {};
          const result = await runTool(name, args);

          // For UI intents, surface event immediately
          if (name === "map_geocode" && result?.ok) {
            events.push({
              kind: "intent",
              payload: { type: "MAP_FLY_TO", lng: result.lng, lat: result.lat, zoom: result.zoom }
            });
            if (result.link) {
              events.push({ kind: "link", payload: { href: result.link, label: result.label || "Access the map" } });
            }
          }
          if (name === "ui_zoom_to_filtered" && result?.ok && result.intent) {
            events.push({ kind: "intent", payload: result.intent });
          }
          if (name === "ui_link_to_map" && result?.ok && result.link) {
            events.push({ kind: "link", payload: { href: result.link, label: result.label || "Access the map" } });
          }
          if (name === "rag_search" && result?.ok) {
            events.push({ kind: "citations", payload: result.citations });
          }
          if (name.startsWith("qa_") && result?.ok) {
            events.push({ kind: "tool_result", payload: { name, ...result } });
          }

          // Feed tool output back to the model
          messages.push({
            role: "tool",
            name,
            tool_call_id: tc.id,
            content: JSON.stringify(result)
          });
        }
      }

      // If somehow we still have no reply, ask once more for a summary using the tool outputs now present.
      if (!reply) {
        const cc2 = await client.chat.completions.create({
          model: "gpt-5",
          temperature: 1,
          tools,
          tool_choice: "none",
          messages: messages as any
        });
        reply = (cc2.choices?.[0]?.message?.content || "I'm not sure yet.").trim();
      }
    }

    // 7) Persist assistant reply (encrypted) + audit
    const aadAsst = { threadId: String(threadId), v: 1 } as any;
    const envAsst = await ctx.runAction(api.crypto.actions.encryptEnvelopeAction, {
      aad: aadAsst,
      plaintext: reply
    });
    await ctx.runMutation(api.copilot.threads.insertEncryptedMessage, {
      threadId,
      role: "assistant",
      envelope: envAsst
    } as any);
    await ctx.runMutation(api.copilot.events.logEvent, {
      threadId,
      kind: "audit",
      payload: { action: "assistant_reply", size: reply.length }
    });

    // 8) Usage accounting (rough)
    const tokensIn = Math.ceil(content.length / 4);
    const tokensOut = Math.ceil(reply.length / 4);
    await ctx.runMutation(gen.copilot.usage.increment, { threadId, tokensIn, tokensOut });

    // 9) Return events + tokenized final
    const tokens: Array<{ kind: string; payload: any }> = [...events];
    for (const t of reply.split(/(\s+)/).filter(Boolean)) {
      tokens.push({ kind: "token", payload: t });
      if (tokens.length > 100) break;
    }
    tokens.push({ kind: "final", payload: reply });

    return tokens;
  },
});


export const sendAndStreamV0 = action({
  args: { threadId: v.id("copilot_thread"), content: v.string() },
  returns: v.array(
    v.object({ kind: v.string(), payload: v.any() }),
  ),
  handler: async (ctx, { threadId, content }) => {
    // Early membership guard; throws if unauthorized
    await ctx.runQuery(api.copilot.threads.getThreadMeta, { threadId } as any);
    
    // Rate limit check
    const rl = await ctx.runQuery(gen.copilot.usage.checkDailyLimit, { threadId });
    if (!rl.allowed) {
      return [{ kind: "final", payload: "Rate limit reached for today. Please try again tomorrow." }];
    }
    
    // Persist user message (encrypted)
    const aadUser = { threadId: String(threadId), v: 1 } as any;
    const envUser = await ctx.runAction(api.crypto.actions.encryptEnvelopeAction, { aad: aadUser, plaintext: content });
    await ctx.runMutation(api.copilot.threads.insertEncryptedMessage, { threadId, role: "user", envelope: envUser } as any);
    await ctx.runMutation(api.copilot.events.logEvent, { threadId, kind: "audit", payload: { action: "user_message", size: content.length } });
    
    // Build minimal context by decrypting recent history
    const recentRaw = await ctx.runQuery(api.copilot.threads.listMessagesRaw, { threadId });
    
    const recent: Array<{ role: "user"|"assistant"|"system"; content: string }> = [];
    for (const m of recentRaw.slice(-20)) {
      const aad = { threadId: String(threadId), v: m.aadV } as any;
      const plaintext = await decryptEnvelope({
        envelope: {
          algo: "AES-256-GCM",
          ivB64: m.ivB64,
          aadV: m.aadV,
          dekCiphertextB64: m.dekCiphertextB64,
          ciphertextB64: m.ciphertextB64,
        },
        aad,
      });
      const text = new TextDecoder().decode(plaintext);
      recent.push({ role: m.role as any, content: text });
    }

    // Tool heuristics: map intent
    const events: Array<{ kind: string; payload: any }> = [];
    const trimmed = content.trim();
    
    if (trimmed.toLowerCase().startsWith("map:")) {
      const q = trimmed.slice(4).trim();
      const token = process.env.MAPBOX_TOKEN;
      if (token && q.length > 0) {
        try {
          const resp = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${token}&limit=1`);
          const data = await resp.json();
          const f = data?.features?.[0];
          if (f?.center && Array.isArray(f.center)) {
            events.push({ kind: "intent", payload: { type: "MAP_FLY_TO", lng: f.center[0], lat: f.center[1], zoom: 12 } });
          }
        } catch (error) {
          // Silently handle Mapbox errors
        }
      }
    }

    // RAG heuristic: search documents
    if (/search\s+documents|find\s+in\s+docs|cite/i.test(trimmed)) {
      try {
        // Get top-N vectors (sampled), scoped by thread/org membership
        const idx = await ctx.runQuery(api.copilot.rag.listIndexByThread, { threadId, limit: 200 } as any);
        
        // Embed query
        const oai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
        if (oai) {
          const emb = await oai.embeddings.create({ model: "text-embedding-3-small", input: trimmed });
          const qv = emb.data[0].embedding as number[];
          
          const cosine = (a: number[], b: number[]) => {
            let dp = 0, na = 0, nb = 0;
            for (let i = 0; i < Math.min(a.length, b.length); i++) { dp += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
            return dp / (Math.sqrt(na)+1e-8) / (Math.sqrt(nb)+1e-8);
          };
          const ranked = (idx as any[])
            .map(r => ({ r, score: cosine(qv, r.vector as number[]) }))
            .sort((x, y) => y.score - x.score)
            .slice(0, 3);
          const cites = ranked.map(x => ({ fileId: x.r.fileId, span: x.r.chunkRef, score: x.score }));
          events.push({ kind: "citations", payload: cites });
        }
      } catch (error) {
        // Silently handle RAG errors
      }
    }

    // Simple org-level QA intents (counts/valuation)
    const lower = trimmed.toLowerCase();
    const qaResults: Array<{ kind: string; payload: any }> = [];
    const province = extractProvince(trimmed);
    
    if (/^how\s+many\s+propert(y|ies)\s+do?\s+i\s+have\??$/.test(lower)) {
      const r = await ctx.runQuery(api.copilot.qa.countProperties, {} as any);
      qaResults.push({ kind: "tool_result", payload: { name: "countProperties", result: r } });
    } else if (/^how\s+many\s+propert(y|ies).*in\s+/.test(lower) && province) {
      const r = await ctx.runQuery(api.copilot.qa.countPropertiesInProvince, { province } as any);
      qaResults.push({ kind: "tool_result", payload: { name: "countPropertiesInProvince", province, result: r } });
    } else if (/total\s+valuation.*in\s+/.test(lower) && province) {
      const r = await ctx.runQuery(api.copilot.qa.sumValuationInProvince, { province } as any);
      qaResults.push({ kind: "tool_result", payload: { name: "sumValuationInProvince", province, result: r } });
    } else if (/show\s+(me\s+)?(my\s+)?lands?.*in\s+/.test(lower) && province) {
      events.push({ kind: "intent", payload: { type: "ZOOM_TO_FILTERED", province } });
      const r = await ctx.runQuery(api.copilot.qa.countByTypeInProvince, { type: "land", province } as any);
      qaResults.push({ kind: "tool_result", payload: { name: "countByTypeInProvince", type: "land", province, result: r } });
    } else if (/show\s+(me\s+)?(my\s+)?propert(y|ies).*in\s+/.test(lower) && province) {
      events.push({ kind: "intent", payload: { type: "ZOOM_TO_FILTERED", province } });
    }

    // If we have structured QA tool results, synthesize a deterministic answer
    let reply = "";
    const formatCurrency = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);
    if (qaResults.length > 0) {
      const byName: Record<string, any> = {};
      for (const r of qaResults) {
        byName[r.payload?.name || "unknown"] = r.payload;
      }
      
      if (byName.countProperties?.result) {
        reply = `You have ${byName.countProperties.result.count} properties.`;
      } else if (byName.countPropertiesInProvince?.result) {
        reply = `You have ${byName.countPropertiesInProvince.result.count} properties in ${byName.countPropertiesInProvince.province}.`;
      } else if (byName.sumValuationInProvince?.result) {
        reply = `Estimated total valuation in ${byName.sumValuationInProvince.province} is ${formatCurrency(byName.sumValuationInProvince.result.total)}.`;
      } else if (byName.countByTypeInProvince?.result) {
        reply = `You have ${byName.countByTypeInProvince.result.count} ${byName.countByTypeInProvince.type}(s) in ${byName.countByTypeInProvince.province}.`;
      }
    }
    
    // If no structured reply, fall back to model with tool notes
    if (!reply) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (apiKey) {
        const client = new OpenAI({ apiKey });
        const messages = [
          { role: "system", content: "You are the AI LAND Copilot. Be concise, safe, and helpful. Prefer tool results when provided. Do not claim you lack access; instead, use provided results." },
          ...recent.map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content },
          qaResults.length ? { role: "system", content: `Tools results: ${JSON.stringify(qaResults.map(x => x.payload))}` } : undefined,
        ] as Array<{ role: "system"|"user"|"assistant"; content: string }>;
        
        const completion = await client.chat.completions.create({ model: "gpt-4o-mini", messages: messages.filter(Boolean) as any, temperature: 1 });
        reply = completion?.choices?.[0]?.message?.content?.trim() || "";
      } else {
        reply = "AI unavailable: missing OPENAI_API_KEY.";
      }
    }
    
    const aadAsst = { threadId: String(threadId), v: 1 } as any;
    const envAsst = await ctx.runAction(api.crypto.actions.encryptEnvelopeAction, { aad: aadAsst, plaintext: reply });
    await ctx.runMutation(api.copilot.threads.insertEncryptedMessage, { threadId, role: "assistant", envelope: envAsst } as any);
    await ctx.runMutation(api.copilot.events.logEvent, { threadId, kind: "audit", payload: { action: "assistant_reply", size: reply.length } });
    
    // Increment usage (rough token estimate: 1 token ~ 4 chars)
    const tokensIn = Math.ceil(content.length / 4);
    const tokensOut = Math.ceil(reply.length / 4);
    await ctx.runMutation(gen.copilot.usage.increment, { threadId, tokensIn, tokensOut });
    
    // Return tokenized events then final
    const tokens: Array<{ kind: string; payload: any }> = [...events, ...qaResults];
    for (const t of reply.split(/(\s+)/).filter((s) => s.length)) {
      tokens.push({ kind: "token", payload: t });
      if (tokens.length > 100) break; // cap to avoid huge payloads
    }
    tokens.push({ kind: "final", payload: reply });
    
    return tokens;
  },
});
