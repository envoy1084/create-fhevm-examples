import { getTemplatePath } from "../resolve/index.ts";
import { copyWithGitignore } from "./copy.ts";

export const copyTemplate = async (targetDir: string) => {
  const templatePath = getTemplatePath();

  await copyWithGitignore(templatePath, targetDir);
};
