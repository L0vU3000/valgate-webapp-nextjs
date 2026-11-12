import { describe, expect, it } from "vitest";
import { propertyTypeChoiceEnum } from "@/lib/db/schema/property";
import { propertyTypeChoiceSchema } from "@/lib/data/types/property";
import { editPropertySchema, PROPERTY_TYPES } from "@/lib/property-form";
import { TYPE_LABEL } from "@/lib/property-helpers";

// One property-type list lives in four places; a value missing from any one is a 400, a Postgres
// error, or a raw enum string on screen. Same order everywhere (DB order: ADD VALUE appends).
describe("property type contract", () => {
  it("zod, drizzle, the edit form, and the labels agree", () => {
    const values = [...propertyTypeChoiceSchema.options];
    expect([...propertyTypeChoiceEnum.enumValues]).toEqual(values);
    expect([...PROPERTY_TYPES]).toEqual(values);
    expect(Object.keys(TYPE_LABEL).sort()).toEqual([...values].sort());
  });

  it("shows \"none\" as None and lets the edit form round-trip it", () => {
    expect(TYPE_LABEL.none).toBe("None");
    expect(editPropertySchema.shape.propertyType.safeParse("none").success).toBe(true);
    expect(editPropertySchema.shape.propertyType.safeParse("castle").success).toBe(false);
  });
});
