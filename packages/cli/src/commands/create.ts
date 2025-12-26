import * as prompt from "@clack/prompts";
import kleur from "kleur";

import {
  copyExampleFiles,
  copyTemplate,
  initializeGit,
  installDependencies,
  updatePackageJson,
  validateOutputDir,
  validatePmExists,
} from "../helpers/index.js";
import { getArguments, type PromptAnswers } from "../prompts/index.js";
import { generateDocs } from "./docgen.ts";

export async function createProject() {
  const args = await getArguments();

  //  Validate Package Manager
  await validatePmExists(args.packageManager);

  // Validate Directory/Create if not exists
  const targetDir = await validateOutputDir(args.directory);

  // Copy Base Hardhat Template
  await copyTemplate(targetDir);

  // Copy Example specific files
  await copyExampleFiles({ example: args.example, targetDir });

  // Update package.json for example specific content
  await updatePackageJson(targetDir, args.example, args.packageManager);

  // Install dependencies if enabled
  if (args.install) {
    const s = prompt.spinner();
    s.start("Installing dependencies...");
    await installDependencies({
      packageManager: args.packageManager,
      targetDir,
    });
    s.stop("Dependencies installed");

    await generateDocs(targetDir);
  }

  // Initialize Git if enabled
  if (args.git) {
    const s = prompt.spinner();
    s.start("Initializing Git...");
    await initializeGit({ targetDir });
    s.stop("Git initialized");
  }

  prompt.outro(getNextSteps(args));
}

const getNextSteps = (args: PromptAnswers) => {
  return `✅ Your project is ready! Here are some next steps:

1. Navigate using ${kleur.bold(`cd ${args.directory}`)}
2. Install dependencies with ${kleur.bold(`${args.packageManager} install`)}
3. Run ${kleur.bold(`${args.packageManager} docgen`)} to generate documentation
4. Run ${kleur.bold(`${args.packageManager} test`)} to run tests
5. Happy hacking! 🔥
`;
};
