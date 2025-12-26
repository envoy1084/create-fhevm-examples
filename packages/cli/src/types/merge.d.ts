declare module "three-way-merger" {
  export function merge(args: {
    ours: unknown;
    source: unknown;
    theirs: unknown;
  }): Record<string, MergeOperations>;
}

declare module "rfc6902-ordered" {
  export function createPatch(source: unknown, target: unknown): unknown[];
  export function applyPatch(
    target: unknown,
    patch: unknown[],
    source?: unknown,
    theirs?: unknown,
  ): void;
}
