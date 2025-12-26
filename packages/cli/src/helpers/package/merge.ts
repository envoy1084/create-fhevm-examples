import rfc6902 from "rfc6902-ordered";
import ThreeWayMerger from "three-way-merger";
import type { PackageJson } from "type-fest";

type DependencyType =
  | "dependencies"
  | "devDependencies"
  | "peerDependencies"
  | "optionalDependencies";

const DEPENDENCY_KEYS: readonly DependencyType[] = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
];

interface MergeOperationItem {
  name: string;
  version: string;
}

interface MergeOperations {
  add: MergeOperationItem[];
  remove: MergeOperationItem[];
  change: MergeOperationItem[];
}

/**
 * Deep clones an object using native structuredClone (Node 17+).
 * Fallback to JSON parsing for older environments if needed.
 */
const deepClone = <T>(obj: T): T => {
  if (typeof structuredClone === "function") {
    return structuredClone(obj);
  }
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Sorts object keys alphabetically.
 */
const sortObjectKeys = <T extends Record<string, unknown>>(obj: T): T => {
  return Object.keys(obj)
    .sort()
    .reduce((sorted, key) => {
      // @ts-expect-error: TypeScript struggles to infer the generic accumulation here, but it is safe.
      sorted[key] = obj[key];
      return sorted;
    }, {} as T);
};

/**
 * Parses JSON safely with error handling.
 */
export const safeParse = (json: string, label: string): PackageJson => {
  try {
    return JSON.parse(json);
  } catch (error) {
    throw new Error(
      `Failed to parse ${label} package.json: ${(error as Error).message}`,
    );
  }
};

const applyDependencyOperations = (
  operations: MergeOperations,
  deps: Record<string, string>,
) => {
  operations.add.forEach((dep) => {
    deps[dep.name] = dep.version;
  });
  operations.remove.forEach((dep) => {
    delete deps[dep.name];
  });
  operations.change.forEach((dep) => {
    deps[dep.name] = dep.version;
  });
};

const mergeDependencyChanges = (
  source: PackageJson,
  ours: PackageJson,
  theirs: PackageJson,
): PackageJson => {
  const mergeOperations = ThreeWayMerger.merge({ ours, source, theirs });

  const result = deepClone(ours);

  DEPENDENCY_KEYS.forEach((dependencyKey) => {
    if (!result[dependencyKey]) {
      result[dependencyKey] = {};
    }

    const targetDeps = result[dependencyKey] as Record<string, string>;
    const ops = mergeOperations[dependencyKey];

    if (ops) {
      applyDependencyOperations(ops, targetDeps);
    }

    if (Object.keys(targetDeps).length === 0) {
      delete result[dependencyKey];
    } else {
      result[dependencyKey] = sortObjectKeys(targetDeps);
    }
  });

  return result;
};

function mergeNonDependencyChanges(
  source: PackageJson,
  ours: PackageJson,
  theirs: PackageJson,
): PackageJson {
  // Create a JSON patch from 'Source' (Base) to 'Theirs' (Incoming)
  const patchFromSourceToTheirs = rfc6902.createPatch(source, theirs);

  // Apply that patch onto 'Ours' (Current)
  // This effectively replays changes from the other branch onto our branch
  rfc6902.applyPatch(ours, patchFromSourceToTheirs, source, theirs);

  return ours;
}

/**
 * Merges three package.json contents (Source/Base, Current/Ours, Incoming/Theirs).
 *
 * @param currentPackageJson - The content of the current (HEAD) package.json
 * @param fromPackageJson - The content of the base (common ancestor) package.json
 * @param toPackageJson - The content of the incoming (merge source) package.json
 * @returns The merged package.json
 */
export const mergePackageJson = (
  currentPackageJson: PackageJson,
  fromPackageJson: PackageJson,
  toPackageJson: PackageJson,
): PackageJson => {
  const mergedDependenciesPkg = mergeDependencyChanges(
    fromPackageJson,
    currentPackageJson,
    toPackageJson,
  );

  const mergedOtherPkg = mergeNonDependencyChanges(
    fromPackageJson,
    deepClone(currentPackageJson),
    toPackageJson,
  );

  const finalMergedPkg = deepClone(mergedOtherPkg);

  DEPENDENCY_KEYS.forEach((key) => {
    if (mergedDependenciesPkg[key]) {
      finalMergedPkg[key] = mergedDependenciesPkg[key];
    } else {
      delete finalMergedPkg[key];
    }
  });

  return finalMergedPkg;
};

/**
 *
 * @param base The base package.json
 * @param overrides The overrides package.json
 * @returns The merged package.json
 */
export const mergeTwoPackageJsons = (
  base: PackageJson,
  overrides: PackageJson,
): PackageJson => {
  return mergePackageJson(base, {}, overrides);
};
