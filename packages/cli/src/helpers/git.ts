import { execa } from "execa";
import { simpleGit } from "simple-git";

type InitializeGitOptions = {
  targetDir: string;
};

export const initializeGit = async ({ targetDir }: InitializeGitOptions) => {
  try {
    await execa("git", ["--version"]);
  } catch (_: unknown) {
    throw new Error("Git is not installed. Please install it and try again.");
  }

  const git = simpleGit({
    baseDir: targetDir,
    binary: "git",
  });

  const isRepo = await git.checkIsRepo();

  if (!isRepo) {
    await git.init();
  }

  await git.add(".");

  await git.commit("chore: initial commit", undefined, {
    "--allow-empty": null,
  });
};
