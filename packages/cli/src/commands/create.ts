import * as prompt from "@clack/prompts";

import {
  copyExampleFiles,
  copyTemplate,
  initializeGit,
  installDependencies,
  validateOutputDir,
} from "../helpers/index.js";
import { getArguments } from "../prompts/index.js";

export async function createProject() {
  const args = await getArguments();

  // Step 1: Validate Directory/Create if not exists
  const targetDir = await validateOutputDir(args.directory);

  // Step 2: Copy Base Hardhat Template
  await copyTemplate(targetDir);

  // Step 3: Copy Example specific files
  await copyExampleFiles({ example: args.example, targetDir });

  // Step 4. Install dependencies if enabled
  if (args.install) {
    const s = prompt.spinner();
    s.start("Installing dependencies...");
    await installDependencies({
      packageManager: args.packageManager,
      targetDir,
    });
    s.stop("Dependencies installed");
  }

  // Step 5: Initialize Git if enabled
  if (args.git) {
    const s = prompt.spinner();
    s.start("Initializing Git...");
    await initializeGit({ targetDir });
    s.stop("Git initialized");
  }
}
