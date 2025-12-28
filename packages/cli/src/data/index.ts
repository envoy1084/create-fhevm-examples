import type { PackageJson } from "type-fest";
export type Difficulty = "beginner" | "intermediate" | "advanced";
export type Example = {
  description: string;
  label: string;
  packageJson: PackageJson;
  difficulty: Difficulty;
  path: string;
  value: string;
};

export const examples: Example[] = [
  {
    description: "A simple FHEVM counter contract",
    difficulty: "beginner",
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
  {
    description:
      "Example on how to perform basic arithmetic operations on encrypted data",
    difficulty: "beginner",
    label: "Encrypted Arithmetic",
    packageJson: {
      description: "A simple arithmetic contract",
      keywords: ["fhevm", "arithmetic", "example"],
      name: "@fhevm-examples/arithmetic",
      version: "0.0.1",
    },
    path: "arithmetic",
    value: "arithmetic",
  },
];
