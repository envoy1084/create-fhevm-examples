import path from "node:path";

import fs from "fs-extra";

export const validateOutputDir = async (dir: string) => {
  const targetDir = path.resolve(process.cwd(), dir);
  const exists = await fs.pathExists(targetDir);

  if (!exists) {
    fs.mkdirSync(dir);
  }

  return targetDir;
};
