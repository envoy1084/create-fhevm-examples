import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type ResolveExamplePathOptions = {
  example: string;
};

export const resolveExamplePath = (opts: ResolveExamplePathOptions) => {
  if (!opts.example) {
    throw new Error("Example must be specified");
  }
  const examplesRoot = path.join(__dirname, "examples");
  const examplePath = path.join(examplesRoot, opts.example);
  return examplePath;
};

export const getTemplatePath = () => {
  const templateRoot = path.join(__dirname, "template");
  return templateRoot;
};
