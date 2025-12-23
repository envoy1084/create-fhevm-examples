import { validateOutputDir } from "../helpers/index.js";
import { getArguments } from "../prompts/index.js";
import { resolveExamplePath } from "../resolve/examples.js";

export async function createProject() {
  const args = await getArguments();

  // Step 1: Validate Directory/Create if not exists
  const targetDir = await validateOutputDir(args.directory);

  // Step 2: Resolve example path
  const examplesPath = resolveExamplePath({ example: args.example });

  // Step 3: Copy Base Hardhat Template

  // Step 4: Copy Example specific files

  // Step 4: Initialize Git if enabled

  // Step 5. Install dependencies if enabled
}
