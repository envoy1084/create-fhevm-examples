import * as prompt from "@clack/prompts";
import boxen from "boxen";
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
import { generateDocs } from "./docgen.js";

export async function createProject() {
  const args = await getArguments();

  //  Validate Package Manager
  await validatePmExists(args.packageManager);

  // Validate Directory/Create if not exists
  const targetDir = await validateOutputDir(args.directory);

  // Copy Base Hardhat Template
  await copyTemplate(targetDir);

  // Copy Example specific files
  await copyExampleFiles({ exampleName: args.example, targetDir });

  // Update package.json for example specific content
  await updatePackageJson(targetDir, args.example, args.packageManager);

  // Install dependencies if enabled
  if (args.install) {
    await installDependencies({
      packageManager: args.packageManager,
      targetDir,
    });

    await generateDocs(targetDir);
  }

  // Initialize Git if enabled
  if (args.git) {
    const s = prompt.spinner();
    s.start("Initializing Git...");
    await initializeGit({ targetDir });
    s.stop("Git initialized");
  }

  prompt.outro(
    boxen(getNextSteps(args), { margin: { left: 2, top: 1 }, padding: 1 }),
  );
}

const getNextSteps = (args: PromptAnswers) => {
  return `✅ Successfully created a new FHEVM project!

Navigate into directory using:
  ${kleur.bold(`cd ${args.directory}`)}

Inside that directory, you can run various commands:
  ${kleur.bold("pnpm test")}    Run the test suite
  ${kleur.bold("pnpm docgen")}  Generate documentation

Happy hacking! 🔥
`;
};
