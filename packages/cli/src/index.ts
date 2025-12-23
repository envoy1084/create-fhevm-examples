import { Command } from "commander";
import kleur from "kleur";

import packageJson from "../package.json" with { type: "json" };
import { createProject } from "./commands/create.js";

const program = new Command();

program
  .name("create-fhevm-examples")
  .version(packageJson.version)
  .description("Scaffold production-grade FHEVM example repositories")
  .action(async () => {
    await createProject().catch((err) => {
      console.error(kleur.red("✖ Error:"), err.message);
      process.exit(1);
    });
  });

await program.parseAsync();
