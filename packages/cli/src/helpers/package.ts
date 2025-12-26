import path from "node:path";

import { execa } from "execa";
import fs from "fs-extra";

import { examples } from "../data/index.js";
import { logger } from "./logger.js";

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

import type { PackageJson } from "type-fest";

export const updatePackageJson = async (
  targetDir: string,
  exampleName: string,
  pm: PackageManager,
) => {
  const packageJsonPath = path.join(targetDir, "package.json");

  let packageJson: PackageJson;
  try {
    const content = await fs.readFile(packageJsonPath, "utf-8");
    packageJson = JSON.parse(content);
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      "code" in error &&
      typeof error.code === "string" &&
      error.code === "ENOENT"
    )
      return; // File doesn't exist, just exit
    throw error; // Other errors (permissions, malformed JSON) should throw
  }

  const example = examples.find((e) => e.value === exampleName);
  if (!example) {
    logger(`Example '%s' not found.`, exampleName);
    return;
  }

  const pmVersion = await getPackageManagerVersion(pm);

  const { dependencies, devDependencies, scripts, ...metaFields } =
    example.package;

  const newPackageJson = {
    ...packageJson,
    ...metaFields,
    dependencies: sortAndFilter({
      ...(packageJson.dependencies ?? {}),
      ...(dependencies ?? {}),
    }),
    devDependencies: sortAndFilter({
      ...(packageJson.devDependencies || {}),
      ...devDependencies,
    }),
    packageManager: `${pm}@${pmVersion}`,
    scripts: {
      ...(packageJson.scripts || {}),
      ...scripts,
    },
  };

  await fs.writeFile(packageJsonPath, JSON.stringify(newPackageJson, null, 2));
};

const sortAndFilter = (
  obj: Record<string, string | undefined>,
): Record<string, string> => {
  return Object.keys(obj)
    .sort()
    .reduce(
      (result, key) => {
        const value = obj[key];
        if (value !== undefined) {
          result[key] = value;
        }
        return result;
      },
      {} as Record<string, string>,
    );
};
