import path from "node:path";
import { fileURLToPath } from "node:url";

import folderSize from "fast-folder-size";
import fs from "fs-extra";
import ignore from "ignore";

export const copyWithGitignore = async (srcDir, destDir) => {
  const ig = ignore();

  const gitignorePath = path.join(srcDir, ".gitignore");

  if (await fs.pathExists(gitignorePath)) {
    const gitignore = await fs.readFile(gitignorePath, "utf8");
    ig.add(gitignore);
    ig.add(".gitignore");
  }

  ig.add(".git");

  await fs.copy(srcDir, destDir, {
    filter: (src) => {
      const rel = path.relative(srcDir, src);

      if (!rel) return true;

      const normalized = rel.split(path.sep).join("/");

      return !ig.ignores(normalized);
    },
  });
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEST = path.resolve(__dirname, "../dist");

const TESTS_SRC = path.resolve(__dirname, "../../examples/test");
const EXAMPLES_SRC = path.resolve(__dirname, "../../examples/contracts");
const TEMPLATES_SRC = path.resolve(__dirname, "../../template");

const EXAMPLES_DEST = path.resolve(__dirname, "../dist/examples");
const TEMPLATES_DEST = path.resolve(__dirname, "../dist/template");

async function main() {
  await fs.remove(EXAMPLES_DEST);
  await fs.remove(TEMPLATES_DEST);

  await copyWithGitignore(TEMPLATES_SRC, TEMPLATES_DEST);

  const examplesFolders = await fs.readdir(EXAMPLES_SRC);

  for (const folder of examplesFolders) {
    const example = folder;

    const contractPath = path.join(EXAMPLES_SRC, example);
    const testsPath = path.join(TESTS_SRC, example);

    const contractDestPath = path.join(EXAMPLES_DEST, example, "contracts");
    const testsDestPath = path.join(EXAMPLES_DEST, example, "test");

    await copyWithGitignore(contractPath, contractDestPath);
    await copyWithGitignore(testsPath, testsDestPath);
  }

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
