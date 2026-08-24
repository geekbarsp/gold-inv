import { describe, expect, it } from "vitest";
import { itemSchema, settingsSchema, updateItemSchema } from "./validation";
const valid = {
  barcode: "B0428",
  item_name: "Gold Bracelet",
  category: "Bracelet",
  karat: "18K",
  grams: "12.83",
  status: "available",
};
describe("inventory business rules", () => {
  it("accepts valid decimal gram values", () =>
    expect(itemSchema.parse(valid).grams).toBe(12.83));
  it("rejects zero or negative weights", () =>
    expect(() => itemSchema.parse({ ...valid, grams: 0 })).toThrow());
  it("requires a barcode", () =>
    expect(() => itemSchema.parse({ ...valid, barcode: "" })).toThrow());
  it("rejects unsafe barcode characters", () =>
    expect(() =>
      itemSchema.parse({ ...valid, barcode: "B 001,()" }),
    ).toThrow());
  it("normalizes optional blanks to null", () =>
    expect(itemSchema.parse({ ...valid, notes: "" }).notes).toBeNull());
  it("never accepts barcode edits", () =>
    expect(() =>
      updateItemSchema.parse({ barcode: "B9999", grams: 7 }),
    ).toThrow());
  it("does not overwrite fields omitted from a partial edit", () =>
    expect(updateItemSchema.parse({ grams: 7 })).toEqual({ grams: 7 }));
});
describe("settings security", () => {
  it("allows blank passcode fields when the passcode is unchanged", () =>
    expect(
      settingsSchema.parse({ current_passcode: "", new_passcode: "" }),
    ).toEqual({ current_passcode: undefined, new_passcode: undefined }));
  it("rejects a short replacement passcode", () =>
    expect(() => settingsSchema.parse({ new_passcode: "123" })).toThrow());
  it("enforces a safe session timeout range", () =>
    expect(() =>
      settingsSchema.parse({ session_timeout_minutes: 1 }),
    ).toThrow());
});
