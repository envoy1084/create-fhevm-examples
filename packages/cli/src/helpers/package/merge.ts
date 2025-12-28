import rfc6902 from "rfc6902-ordered";
import ThreeWayMerger from "three-way-merger";
import type { PackageJson } from "type-fest";

// 1. Remove "scripts" from this list so ThreeWayMerger/applyDependencyOperations ignores it
const DEPENDENCY_KEYS = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
] as const;

interface MergeOperationItem {
  name: string;
  version: string;
}

interface MergeOperations {
  add: MergeOperationItem[];
  remove: MergeOperationItem[];
  change: MergeOperationItem[];
}

const deepClone = <T>(obj: T): T => {
  if (typeof structuredClone === "function") {
    return structuredClone(obj);
  }
  return JSON.parse(JSON.stringify(obj));
};

const sortObjectKeys = <T extends Record<string, unknown>>(obj: T): T => {
  return Object.keys(obj)
    .sort()
    .reduce((sorted, key) => {
      // @ts-expect-error: Safe generic accumulation
      sorted[key] = obj[key];
      return sorted;
    }, {} as T);
};

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

// 2. Custom 3-way merge logic specifically for Scripts
const mergeScripts = (
  source: PackageJson["scripts"] = {},
  ours: PackageJson["scripts"] = {},
  theirs: PackageJson["scripts"] = {},
): PackageJson["scripts"] => {
  const allKeys = new Set([
    ...Object.keys(source || {}),
    ...Object.keys(ours || {}),
    ...Object.keys(theirs || {}),
  ]);

  const result: Record<string, string> = {};

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: safe
  allKeys.forEach((key) => {
    const vSource = source?.[key];
    const vOurs = ours?.[key];
    const vTheirs = theirs?.[key];

    // Case 1: Deleted in both (or never existed)
    if (vOurs === undefined && vTheirs === undefined) return;

    // Case 2: No conflict (Ours and Theirs match)
    if (vOurs === vTheirs) {
      if (vOurs !== undefined) result[key] = vOurs;
      return;
    }

    // Case 3: Changed in Theirs, unchanged in Ours (Take Theirs)
    if (vOurs === vSource && vTheirs !== vSource) {
      if (vTheirs !== undefined) result[key] = vTheirs;
      return;
    }

    // Case 4: Changed in Ours, unchanged in Theirs (Keep Ours)
    if (vTheirs === vSource && vOurs !== vSource) {
      if (vOurs !== undefined) result[key] = vOurs;
      return;
    }

    // Case 5: Conflict (Both changed) -> Prefer Theirs (Incoming/Override)
    if (vTheirs !== undefined) {
      result[key] = vTheirs;
    } else if (vOurs !== undefined) {
      result[key] = vOurs;
    }
  });

  return Object.keys(result).length > 0 ? sortObjectKeys(result) : undefined;
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
  const patchFromSourceToTheirs = rfc6902.createPatch(source, theirs);

  // Apply patch to 'Ours'
  // Note: rfc6902 might overwrite 'scripts' here if source={} and theirs={scripts...},
  // but we will explicitly overwrite 'scripts' with our custom merge result later.
  rfc6902.applyPatch(ours, patchFromSourceToTheirs, source, theirs);

  return ours;
}

export const mergePackageJson = (
  currentPackageJson: PackageJson,
  fromPackageJson: PackageJson,
  toPackageJson: PackageJson,
): PackageJson => {
  // Merge Dependencies (using ThreeWayMerger)
  const mergedDependenciesPkg = mergeDependencyChanges(
    fromPackageJson,
    currentPackageJson,
    toPackageJson,
  );

  // Merge Other Fields (using RFC6902 patch)
  const mergedOtherPkg = mergeNonDependencyChanges(
    fromPackageJson,
    deepClone(currentPackageJson),
    toPackageJson,
  );

  // Merge Scripts (using custom logic)
  const mergedScripts = mergeScripts(
    fromPackageJson.scripts,
    currentPackageJson.scripts,
    toPackageJson.scripts,
  );

  // Assemble Final Package
  const finalMergedPkg = deepClone(mergedOtherPkg);

  // Apply merged dependencies
  DEPENDENCY_KEYS.forEach((key) => {
    if (mergedDependenciesPkg[key]) {
      finalMergedPkg[key] = mergedDependenciesPkg[key];
    } else {
      delete finalMergedPkg[key];
    }
  });

  // Apply merged scripts
  if (mergedScripts) {
    finalMergedPkg.scripts = mergedScripts;
  } else {
    delete finalMergedPkg.scripts;
  }

  return finalMergedPkg;
};

export const mergeTwoPackageJsons = (
  base: PackageJson,
  overrides: PackageJson,
): PackageJson => {
  return mergePackageJson(base, {}, overrides);
};
