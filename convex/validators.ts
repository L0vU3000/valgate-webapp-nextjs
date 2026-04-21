import { z } from "zod";

export const listLandsDto = z.object({
  orgId: z.string(),
  userId: z.string(),
  query: z.string().optional(),
  filters: z
    .object({ status: z.string().optional(), province: z.string().optional(), type: z.string().optional() })
    .optional(),
  sort: z.object({ field: z.string(), direction: z.string() }).optional(),
  page: z.number().optional(),
  pageSize: z.number().optional(),
});

export const getLandDto = z.object({ orgId: z.string(), userId: z.string(), id: z.string() });


