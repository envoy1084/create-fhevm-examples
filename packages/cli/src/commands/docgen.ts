import * as prompt from "@clack/prompts";

import {
  generateSolidityDocs,
  generateTestDocs,
} from "../helpers/docs/index.js";

export const generateDocs = async (rootDir: string) => {
  const s = prompt.spinner();
  s.start("Generating Solidity API Reference...");
  await generateSolidityDocs(rootDir);
  s.stop("Solidity API reference generated");

  s.start("Generating Tests Documentation...");
  await generateTestDocs(rootDir);
  s.stop("Tests documentation generated");
};
