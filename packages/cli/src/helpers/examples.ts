import fs from "fs-extra";

import { resolveExamplePath } from "../resolve/examples.ts";
import { copyWithGitignore } from "./copy.js";

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
