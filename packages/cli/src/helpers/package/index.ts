import { EOL } from "node:os";
import path from "node:path";

import { execa } from "execa";
import fs from "fs-extra";
import type { PackageJson } from "type-fest";

import { examples } from "../../data/index.js";
import { logger } from "../logger.js";
import { mergeTwoPackageJsons, safeParse } from "./merge.js";

export const packageManagers = ["npm", "pnpm", "yarn", " bun"] as const;
export type PackageManager = (typeof packageManagers)[number];

export const getPackageManagerVersion = async (
  manager: PackageManager,
): Promise<string> => {
  try {
    const { stdout } = await execa(manager, ["--version"]);
    return stdout.trim();
  } catch (_error: unknown) {
    logger(`Could not detect %s version. Defaulting to 'latest'.`, manager);
    return "latest";
  }
};

export const validatePmExists = async (manager: PackageManager) => {
  try {
    await execa(manager, ["--version"]);
  } catch (_error: unknown) {
    throw new Error(`Could not find ${manager} in your PATH.`);
  }
};

export const updatePackageJson = async (
  targetDir: string,
  exampleName: string,
  pm: PackageManager,
) => {
  const packageJsonPath = path.join(targetDir, "package.json");

  // check file exists
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`package.json not found in ${targetDir}`);
  }

  const content = await fs.readFile(packageJsonPath, "utf-8");
  const packageJson = safeParse(content, "Target Directory");

  const example = examples.find((e) => e.value === exampleName);
  if (!example) {
    logger(`Example '%s' not found.`, exampleName);
    return;
  }

  const pmVersion = await getPackageManagerVersion(pm);

  const additions: PackageJson = {
    packageManager: `${pm}@${pmVersion}`,
  };

  const newPackageJson = mergeTwoPackageJsons(
    packageJson,
    mergeTwoPackageJsons(example.packageJson, additions),
  );

  await fs.writeFile(
    packageJsonPath,
    JSON.stringify(newPackageJson, null, 2).replace(/\n/g, EOL) + EOL,
  );
};
