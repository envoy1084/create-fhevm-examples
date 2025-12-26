import type { PackageJson } from "type-fest";

export type Example = {
  label: string;
  packageJson: PackageJson;
  path: string;
  value: string;
};

export const examples: Example[] = [
  {
    label: "Counter",
    packageJson: {
      description: "A simple counter contract",
      keywords: ["fhevm", "counter", "example"],
      name: "@fhevm-examples/counter",
      version: "0.0.1",
    },
    path: "counter",
    value: "counter",
  },
];
