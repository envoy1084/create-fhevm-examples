import path from "node:path";
import { fileURLToPath } from "node:url";

import fsExtra from "fs-extra";

import { examples } from "../data/index.js";
import { safeParse } from "../helpers/package/merge.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type ResolveExamplePathOptions = {
  exampleName: string;
};

export const resolveExamplePath = (opts: ResolveExamplePathOptions) => {
  if (!opts.exampleName) {
    throw new Error("Example must be specified");
  }
  const examplesRoot = path.join(__dirname, "examples");
  // biome-ignore lint/style/noNonNullAssertion: safe
  const example = examples.find((e) => e.value === opts.exampleName)!;
  const examplePath = path.join(examplesRoot, example.path);
  return examplePath;
};

export const getTemplatePath = () => {
  const templateRoot = path.join(__dirname, "template");
  return templateRoot;
};

export const getPackageVersion = async () => {
  const packageRoot = path.join(__dirname, "../package.json");
  const content = await fsExtra.readFile(packageRoot, "utf-8");
  const packageJson = safeParse(content, "Template Directory");
  return packageJson.version;
};
