import path from "node:path";

import fs from "fs-extra";
import ignore from "ignore";

export const copyWithGitignore = async (srcDir: string, destDir: string) => {
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
