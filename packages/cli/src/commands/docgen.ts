import * as prompt from "@clack/prompts";

import {
  generateSolidityDocs,
  generateTestDocs,
} from "../helpers/docs/index.js";

export const generateDocs = async (rootDir: string) => {
  const s = prompt.spinner();
  s.start("Generating Documentation...");
  await generateSolidityDocs(rootDir);
  await generateTestDocs(rootDir);
  s.stop("Documentation generated");
};
