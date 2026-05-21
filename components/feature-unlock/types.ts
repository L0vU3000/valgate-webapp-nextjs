import type { ZodTypeAny, z } from "zod";
// UseFormReturn requires FieldValues; pillar files use concrete types, here we use any.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import type { UseFormReturn } from "react-hook-form";

export type WizardStepRenderCtx<TSchema extends ZodTypeAny> = {
  // Typed as any here; each pillar narrows this to its own concrete form type.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  values: z.infer<TSchema>;
  propertyId: string;
};

export type WizardStepDef<TSchema extends ZodTypeAny> = {
  key: string;
  title: string;
  description?: string;
  fields: ReadonlyArray<keyof z.infer<TSchema> | string>;
  render: (ctx: WizardStepRenderCtx<TSchema>) => React.ReactNode;
  shouldSkip?: (values: z.infer<TSchema>) => boolean;
};

export type WizardSubmitArgs<TSchema extends ZodTypeAny> = {
  values: z.infer<TSchema>;
  propertyId: string;
  entityId: string | null;
};

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type WizardConfig<TSchema extends ZodTypeAny> = {
  pillarKey:
    | "ownership"
    | "financials"
    | "rental"
    | "safety"
    | "location"
    | "valuation"
    | "estate"
    | "documents";
  title: string;
  schema: TSchema;
  loadInitial: (args: { propertyId: string }) => Promise<{
    values: Partial<z.infer<TSchema>>;
    entityId: string | null;
    verified: boolean;
  }>;
  onSubmitData: (
    args: WizardSubmitArgs<TSchema>,
  ) => Promise<ActionResult<{ entityId: string }>>;
  verification?: {
    title: string;
    declaration: string;
    documentLabel: string;
    minFiles: number;
    maxFiles: number;
    onVerify: (args: {
      entityId: string;
      docIds: string[];
      propertyId: string;
    }) => Promise<ActionResult<void>>;
  };
  steps: ReadonlyArray<WizardStepDef<TSchema>>;
};

export type UnlockState =
  | { kind: "unlock" }
  | { kind: "verify"; entityId: string }
  | { kind: "edit"; entityId: string };
