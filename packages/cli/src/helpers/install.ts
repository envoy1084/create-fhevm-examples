import * as prompt from "@clack/prompts";
import { execa } from "execa";

type InstallDependenciesOptions = {
  targetDir: string;
  packageManager: string;
};

export const installDependencies = async ({
  targetDir,
  packageManager,
}: InstallDependenciesOptions) => {
  const log = prompt.taskLog({
    limit: 5,
    title: `Installing dependencies with ${packageManager}`,
  });

  const subprocess = execa(packageManager, ["install"], {
    cwd: targetDir,
    lines: true,
  });

  for await (const line of subprocess) {
    log.message(line);
  }

  await subprocess;

  log.success("Dependencies installed");
};
