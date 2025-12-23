import { execa } from "execa";

type InstallDependenciesOptions = {
  targetDir: string;
  packageManager: string;
};

export const installDependencies = async ({
  targetDir,
  packageManager,
}: InstallDependenciesOptions) => {
  await execa(packageManager, ["install"], {
    cwd: targetDir,
    stdio: "ignore",
  });
};
