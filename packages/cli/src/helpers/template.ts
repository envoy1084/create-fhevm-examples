import path from "node:path";

import fs from "fs-extra";

import { getTemplatePath } from "../resolve/examples.ts";
import { copyWithGitignore } from "./copy.js";

export const copyTemplate = async (targetDir: string) => {
  const templatePath = getTemplatePath();

  await copyWithGitignore(templatePath, targetDir);

  await finalizeGitIgnore(targetDir);
};

export const finalizeGitIgnore = async (targetDir: string) => {
  const gitIgnorePath = path.join(targetDir, ".gitignore");
  const templateGitignorePath = path.join(targetDir, ".gitignore.template");

  const templateGitignoreExists = await fs.pathExists(templateGitignorePath);

  if (templateGitignoreExists) {
    await fs.move(templateGitignorePath, gitIgnorePath);
  }
};
