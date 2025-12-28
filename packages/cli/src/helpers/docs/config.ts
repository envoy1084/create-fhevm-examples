import * as path from "node:path";

export interface DocgenConfig {
  rootDir: string;
  includeGlobs: string[];
  excludeGlobs: string[];
  outDir: string;
  summaryFile: string;
}

export const buildConfig = (projectRoot: string): DocgenConfig => {
  return {
    excludeGlobs: ["**/node_modules/**", "**/*.d.ts"],
    includeGlobs: ["test/**/*.ts", "contracts/**/*.sol"],
    outDir: path.resolve(projectRoot, "docs/chapters"),
    rootDir: projectRoot,
    summaryFile: path.resolve(projectRoot, "docs/SUMMARY.md"),
  };
};
