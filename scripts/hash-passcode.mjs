import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
const passcode = process.argv.includes("--stdin")
  ? readFileSync(0, "utf8").trimEnd()
  : process.argv[2];
if (!passcode) {
  console.error('Usage: npm run hash-passcode -- "your passcode"');
  process.exit(1);
}
const hash = await bcrypt.hash(passcode, 12);
// Next.js expands unescaped $VARIABLE sequences in .env files.
console.log(hash.replaceAll("$", "\\$"));
