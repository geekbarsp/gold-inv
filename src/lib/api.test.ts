import { describe, expect, it } from "vitest";
import { z } from "zod";
import { apiError } from "./api";

describe("apiError", () => {
  it("returns a client validation response for malformed input", async () => {
    let validationError: unknown;
    try {
      z.object({ passcode: z.string().min(1) }).parse({ passcode: "" });
    } catch (error) {
      validationError = error;
    }

    const response = apiError(validationError);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: expect.any(String) });
  });
});
