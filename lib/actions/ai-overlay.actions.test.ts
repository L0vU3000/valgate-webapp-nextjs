import { describe, it, expect } from "vitest";
import { surfaceKey, isToolStepSuccessful } from "./ai-overlay-utils";

describe("surfaceKey", () => {
  it("maps /pro/clients/<id> to client:<id>", () => {
    expect(surfaceKey("/pro/clients/CLIENT-0001")).toBe("client:CLIENT-0001");
    expect(surfaceKey("/pro/clients/CLIENT-0001/overview")).toBe("client:CLIENT-0001");
  });

  it("maps generic /pro routes to 'pro'", () => {
    expect(surfaceKey("/pro/dashboard")).toBe("pro");
    expect(surfaceKey("/pro/rent")).toBe("pro");
    expect(surfaceKey("/pro/work-orders")).toBe("pro");
    expect(surfaceKey("/pro/compliance")).toBe("pro");
    expect(surfaceKey("/pro/clients")).toBe("pro");
    expect(surfaceKey("/pro")).toBe("pro");
  });

  it("maps non-Pro routes to 'consumer'", () => {
    expect(surfaceKey("/portfolio")).toBe("consumer");
    expect(surfaceKey("/property/PROP-0001")).toBe("consumer");
    expect(surfaceKey("/")).toBe("consumer");
    expect(surfaceKey("/analytics")).toBe("consumer");
  });
});

describe("isToolStepSuccessful", () => {
  const toolCallId = "call-1";

  it("returns true when a matching tool result exists and no error part", () => {
    const ok = isToolStepSuccessful(
      toolCallId,
      [{ toolCallId }],
      [{ type: "tool-result", toolCallId }],
    );
    expect(ok).toBe(true);
  });

  it("returns false when content includes a tool-error for the call", () => {
    const ok = isToolStepSuccessful(
      toolCallId,
      [{ toolCallId }],
      [{ type: "tool-error", toolCallId }],
    );
    expect(ok).toBe(false);
  });

  it("returns false when there is no matching tool result", () => {
    const ok = isToolStepSuccessful(toolCallId, [], []);
    expect(ok).toBe(false);
  });
});
