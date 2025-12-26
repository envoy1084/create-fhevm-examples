import { execa } from "execa";

import { docgenLogger } from "../logger.js";
import { DocParser } from "./parser.js";
import { MarkdownRenderer } from "./renderer.js";

export async function generateTestDocs(rootDir: string) {
  docgenLogger("Starting Documentation Generation...");

  const parser = new DocParser(rootDir);
  const chapters = await parser.parse();

  if (chapters.length === 0) {
    docgenLogger(
      "No chapters found. Did you add @chapter tags to your JSDocs?",
    );
    process.exit(0);
  }

  const renderer = new MarkdownRenderer(rootDir);
  await renderer.render(chapters);

  docgenLogger("Documentation generation complete! 🚀");
}

export const generateSolidityDocs = async (rootDir: string) => {
  await execa("pnpm", ["hardhat", "docgen"], {
    cwd: rootDir,
    preferLocal: true,
    stdio: "ignore",
  });
};
