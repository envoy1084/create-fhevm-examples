import { getTemplatePath } from "../resolve/examples.ts";
import { copyWithGitignore } from "./copy.js";

export const copyTemplate = async (targetDir: string) => {
  const templatePath = getTemplatePath();

  await copyWithGitignore(templatePath, targetDir);
};
