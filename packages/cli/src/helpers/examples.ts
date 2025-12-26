import fs from "fs-extra";

import { resolveExamplePath } from "../resolve/examples.ts";
import { copyWithGitignore } from "./copy.js";

type CopyExampleFilesOptions = {
  exampleName: string;
  targetDir: string;
};

export const copyExampleFiles = async ({
  exampleName,
  targetDir,
}: CopyExampleFilesOptions) => {
  const examplePath = resolveExamplePath({ exampleName });

  if (!(await fs.pathExists(examplePath))) {
    return;
  }

  await copyWithGitignore(examplePath, targetDir);
};
