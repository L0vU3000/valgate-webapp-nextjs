"use client";

import Link from "next/link";

type Segment =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "link"; label: string; href: string };

function parseInline(text: string): Segment[] {
  const segments: Segment[] = [];
  const pattern = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    const token = match[0];
    if (token.startsWith("**")) {
      segments.push({ type: "bold", value: token.slice(2, -2) });
    } else {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        segments.push({ type: "link", label: linkMatch[1], href: linkMatch[2] });
      } else {
        segments.push({ type: "text", value: token });
      }
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: "text", value: text }];
}

function InlineContent({ text }: { text: string }) {
  const segments = parseInline(text);
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === "bold") {
          return (
            <strong key={i} className="font-semibold text-foreground">
              {seg.value}
            </strong>
          );
        }
        if (seg.type === "link") {
          const isInternal = seg.href.startsWith("/");
          if (isInternal) {
            return (
              <Link
                key={i}
                href={seg.href}
                className="font-medium text-interactive-primary underline-offset-2 hover:underline"
              >
                {seg.label}
              </Link>
            );
          }
          return (
            <a
              key={i}
              href={seg.href}
              className="font-medium text-interactive-primary underline-offset-2 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {seg.label}
            </a>
          );
        }
        return <span key={i}>{seg.value}</span>;
      })}
    </>
  );
}

export function AIMarkdown({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-2 text-[16px] leading-[26px] text-foreground">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;
        if (line.startsWith("- ")) {
          return (
            <p key={i} className="pl-1">
              <span className="text-secondary mr-1.5">·</span>
              <InlineContent text={line.slice(2)} />
            </p>
          );
        }
        return (
          <p key={i}>
            <InlineContent text={line} />
          </p>
        );
      })}
    </div>
  );
}
