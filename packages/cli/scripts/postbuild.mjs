import path from "path";
import { fileURLToPath } from "url";

import folderSize from "fast-folder-size";
import fs from "fs-extra";
import ignore from "ignore";

export const copyWithGitignore = async (srcDir, destDir) => {
  const ig = ignore();

  const gitignorePath = path.join(srcDir, ".gitignore");

  if (await fs.pathExists(gitignorePath)) {
    const gitignore = await fs.readFile(gitignorePath, "utf8");
    ig.add(gitignore);
  }

  // Always ignore .git folders
  ig.add(".git");

  await fs.copy(srcDir, destDir, {
    filter: (src) => {
      const rel = path.relative(srcDir, src);

      // Always allow root
      if (!rel) return true;

      // Normalize for ignore()
      const normalized = rel.split(path.sep).join("/");

      return !ig.ignores(normalized);
    },
  });
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEST = path.resolve(__dirname, "../dist");

const EXAMPLES_SRC = path.resolve(__dirname, "../../examples/src/examples");
const EXAMPLES_DEST = path.resolve(__dirname, "../dist/examples");

const TEMPLATES_SRC = path.resolve(__dirname, "../../template");
const TEMPLATES_DEST = path.resolve(__dirname, "../dist/template");

async function main() {
  await fs.remove(EXAMPLES_DEST);
  await fs.remove(TEMPLATES_DEST);

  await copyWithGitignore(EXAMPLES_SRC, EXAMPLES_DEST);
  await copyWithGitignore(TEMPLATES_SRC, TEMPLATES_DEST);

  folderSize(DEST, (err, bytes) => {
    if (err) {
      console.error(err);
      return;
    }
    const Kb = bytes / 1024;
    console.log(
      `[create-fhevm-examples] Assets copied to dist/ ${Kb.toFixed(2)} KB`,
    );
  });
}

main().catch((err) => {
  console.error("Failed to copy examples", err);
  process.exit(1);
});
