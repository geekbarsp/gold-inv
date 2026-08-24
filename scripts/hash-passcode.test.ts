import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";

const scriptPath = fileURLToPath(new URL("./hash-passcode.mjs", import.meta.url));

describe("hash-passcode helper", () => {
  it("prints an env-safe bcrypt hash that verifies the passcode", () => {
    const output = execFileSync(process.execPath, [scriptPath, "inventory-passcode"], {
      encoding: "utf8",
    }).trim();

    expect(output).toMatch(/^\\\$2[aby]\\\$12\\\$/);
    expect(bcrypt.compareSync("inventory-passcode", output.replaceAll("\\$", "$"))).toBe(true);
  });
});
