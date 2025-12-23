import fs from "fs-extra";

import { resolveExamplePath } from "../resolve/index.js";
import { copyWithGitignore } from "./copy.ts";

type CopyExampleFilesOptions = {
  example: string;
  targetDir: string;
};

export const copyExampleFiles = async ({
  example,
  targetDir,
}: CopyExampleFilesOptions) => {
  const examplePath = resolveExamplePath({ example });

  if (!(await fs.pathExists(examplePath))) {
    return;
  }

  await copyWithGitignore(examplePath, targetDir);
};
