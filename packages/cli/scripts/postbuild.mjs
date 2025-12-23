import path from "path";
import { fileURLToPath } from "url";

import fs from "fs-extra";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXAMPLES_SRC = path.resolve(__dirname, "../../examples/src/examples");

const EXAMPLES_DEST = path.resolve(__dirname, "../dist/examples");

async function main() {
  await fs.remove(EXAMPLES_DEST);
  await fs.copy(EXAMPLES_SRC, EXAMPLES_DEST);
}

main().catch((err) => {
  console.error("Failed to copy examples", err);
  process.exit(1);
});
