import { Command } from "commander";
import kleur from "kleur";

import packageJson from "../package.json" with { type: "json" };
import { createProject } from "./commands/create.js";
import { generateDocs } from "./commands/docgen.js";
import { listExamples } from "./commands/list.js";

const program = new Command();

program
  .name("create-fhevm-examples")
  .version(packageJson.version)
  .description("Scaffold production-grade FHEVM example repositories")
  .action(async () => {
    await createProject().catch((err: Error) => {
      console.error(kleur.red(`✖ Error: ${err.message}}`));
      process.exit(1);
    });
  });

program
  .command("docgen")
  .description("Generate Markdown documentation for this CLI")
  .action(async () => {
    await generateDocs(process.cwd());
  });

program
  .command("list")
  .description("List All Available Examples for FHEVM")
  .action(async () => {
    await listExamples();
  });

await program.parseAsync();
