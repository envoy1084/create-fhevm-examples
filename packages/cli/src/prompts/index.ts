import path from "node:path";

import * as prompt from "@clack/prompts";
import fs from "fs-extra";
import whichPMRuns from "which-pm-runs";

import { examples } from "../data/index.js";
import { type PackageManager, packageManagers } from "../helpers/package.ts";

export type PromptAnswers = {
  directory: string;
  example: string;
  git: boolean;
  packageManager: PackageManager;
  install: boolean;
};

export const getArguments = async (): Promise<PromptAnswers> => {
  prompt.intro("Welcome to FHEVM Examples 🔐");

  const defaultPackageManager = whichPMRuns()?.name ?? "npm";

  const args = await prompt.group(
    // biome-ignore assist/source/useSortedKeys: need to preserve order
    {
      directory: () => {
        return prompt.text({
          defaultValue: ".",
          message: "Where should we create the project?",
          placeholder: ".",
          validate: (value) => {
            const targetDir = path.resolve(process.cwd(), value ?? "");
            const exists = fs.pathExistsSync(targetDir);

            if (exists) {
              // Should be a directory
              const stat = fs.statSync(value ?? ".");
              if (!stat.isDirectory()) {
                return "Given path is not a directory";
              }

              // Should be empty
              if (fs.readdirSync(targetDir).length > 0) {
                return "Target directory is not empty";
              }
            }
          },
        });
      },
      example: () => {
        return prompt.select({
          initialValue: "counter",
          maxItems: 5,
          message: "What example do you want to use?",
          options: examples.map((v) => ({
            hint: v.package.description,
            label: v.label,
            value: v.value,
          })),
        });
      },
      git: () => {
        return prompt.confirm({
          initialValue: true,
          message: "Do you want to initialize a git repository?",
        });
      },
      packageManager: () => {
        return prompt.select({
          initialValue: defaultPackageManager,
          message: "Which package manager do you want to use?",
          options: packageManagers.map((v) => ({
            label: v,
            value: v,
          })),
        });
      },
      install: () => {
        return prompt.confirm({
          initialValue: true,
          message: "Do you want to install dependencies?",
        });
      },
    },
    {
      onCancel: () => {
        prompt.cancel("Operation cancelled.");
        process.exit(0);
      },
    },
  );

  return args as PromptAnswers;
};
