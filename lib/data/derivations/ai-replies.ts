import type { AiOverlayContext } from "./ai-context";
import { getProperties } from "@/lib/data/properties";

function normalize(text: string): string {
  return text.toLowerCase().trim();
}

function findPropertyByName(context: AiOverlayContext, query: string) {
  const q = normalize(query);
  if (context.property) {
    if (normalize(context.property.name).includes(q)) return context.property;
  }
  return null;
}

export type AiReplyResult = {
  content: string;
  artifactDocIds?: string[];
};

export async function generateDeterministicReply(
  userMessage: string,
  context: AiOverlayContext,
): Promise<AiReplyResult> {
  const text = normalize(userMessage);

  if (
    text.includes("how many propert") ||
    text.includes("property count") ||
    text.includes("total properties")
  ) {
    if (!context.portfolio) {
      return {
        content:
          "Open your [portfolio](/portfolio) for property counts. I need portfolio context to answer that accurately.",
      };
    }
    const { stats } = context.portfolio;
    return {
      content: [
        `You have **${stats.totalProperties}** active properties in your portfolio.`,
        `- ${stats.rentedCount} rented`,
        `- ${stats.vacantCount} vacant`,
        `- **${stats.occupancyRate}%** occupancy`,
      ].join("\n"),
    };
  }

  if (text.includes("occupancy") || text.includes("vacant") || text.includes("rented")) {
    if (!context.portfolio) {
      return {
        content:
          "Navigate to [portfolio](/portfolio) and ask again — I'll pull live occupancy from your data.",
      };
    }
    const { stats } = context.portfolio;
    return {
      content: [
        `Occupancy is **${stats.occupancyRate}%** across ${stats.totalProperties} properties.`,
        `- Rented: ${stats.rentedCount}`,
        `- Vacant: ${stats.vacantCount}`,
      ].join("\n"),
    };
  }

  if (
    text.includes("monthly rent") ||
    text.includes("rent collection") ||
    text.includes("collected") ||
    text.includes("expected rent")
  ) {
    if (!context.portfolio) {
      return {
        content:
          "Go to [portfolio](/portfolio) for rent KPIs, then ask about monthly collection.",
      };
    }
    const { kpis } = context.portfolio;
    const gapNote = kpis.isUnderCollected
      ? "Collection is below expected this month."
      : "Collection meets or exceeds expected rent this month.";
    return {
      content: [
        `For **${kpis.monthLabel}**:`,
        `- Expected rent: **${kpis.monthlyExpected}**`,
        `- Collected: **${kpis.monthlyCollected}**`,
        `- Portfolio value: **${kpis.totalValueFormatted}**`,
        "",
        gapNote,
      ].join("\n"),
    };
  }

  if (text.includes("document") || text.includes("files")) {
    const docs = context.documents;
    if (docs.length === 0) {
      return {
        content: context.property
          ? `No documents found for **${context.property.name}** yet. Upload files from the property documents page.`
          : "No documents in scope. Open a property page or check your portfolio documents.",
      };
    }
    const lines = docs.slice(0, 8).map(
      (d) =>
        `- **${d.name}** (${d.category}) — [open](${d.href}) · property ${d.propertyId}`,
    );
    const firstDoc = docs[0];
    return {
      content: [
        `Found **${docs.length}** document${docs.length === 1 ? "" : "s"} in scope:`,
        "",
        ...lines,
        docs.length > 8 ? `\n…and ${docs.length - 8} more.` : "",
      ].join("\n"),
      artifactDocIds: firstDoc ? [firstDoc.id] : undefined,
    };
  }

  if (text.includes("value") || text.includes("worth") || text.includes("portfolio value")) {
    if (!context.portfolio) {
      return {
        content:
          "Visit [portfolio](/portfolio) to see total portfolio value and KPIs.",
      };
    }
    return {
      content: `Total portfolio value is **${context.portfolio.kpis.totalValueFormatted}** across ${context.portfolio.stats.totalProperties} properties.`,
    };
  }

  if (context.property && (text.includes("this property") || text.includes(context.property.name.toLowerCase()))) {
    const p = context.property;
    return {
      content: [
        `**${p.name}** (${p.id})`,
        `- Type: ${p.type}`,
        `- Status: ${p.status}`,
        p.address ? `- Address: ${p.address}` : null,
        "",
        `View [rental](/property/${p.id}/rental) · [documents](/property/${p.id}/documents) · [overview](/property/${p.id}/overview)`,
      ]
        .filter(Boolean)
        .join("\n"),
    };
  }

  const properties = await getProperties();
  const matched = properties.find((p) =>
    text.includes(normalize(p.name)),
  );
  if (matched) {
    return {
      content: [
        `**${matched.name}** (${matched.id}) is **${matched.status}** (${matched.type}).`,
        `Open [overview](/property/${matched.id}/overview) or [rental](/property/${matched.id}/rental) for details.`,
      ].join("\n"),
    };
  }

  const byName = findPropertyByName(context, text);
  if (byName) {
    return {
      content: `**${byName.name}** is ${byName.status} (${byName.type}). See [property overview](/property/${byName.id}/overview).`,
    };
  }

  if (text.includes("help") || text === "?" || text.includes("what can you")) {
    return {
      content: [
        "I can answer questions grounded in your portfolio data, for example:",
        "",
        "- How many properties do I have?",
        "- What's my occupancy rate?",
        "- Monthly rent collected vs expected",
        "- Documents for this property",
        "- Tell me about [property name]",
        "",
        "Open **Portfolio** or a **property page** for richer context.",
      ].join("\n"),
    };
  }

  return {
    content: [
      "I don't have a specific answer for that yet. Try asking about:",
      "",
      "- Property count or occupancy",
      "- Monthly rent collection",
      "- Documents in the workspace panel",
      "- A property by name",
      "",
      "Or type **help** for examples.",
    ].join("\n"),
  };
}
