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
    description: "Arithmetic operations in FHEVM",
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
  {
    description: "Bitwise operations in FHEVM",
    difficulty: "beginner",
    label: "Bitwise Operations",
    packageJson: {
      description: "A simple bitwise contract",
      keywords: ["fhevm", "bitwise", "example"],
      name: "@fhevm-examples/bitwise",
      version: "0.0.1",
    },
    path: "bitwise",
    value: "bitwise",
  },
  {
    description: "Comparison operations in FHEVM",
    difficulty: "beginner",
    label: "Comparison Logic",
    packageJson: {
      description: "A simple comparison contract",
      keywords: ["fhevm", "comparison", "example"],
      name: "@fhevm-examples/comparison",
      version: "0.0.1",
    },
    path: "comparison",
    value: "comparison",
  },
  {
    description: "Example demonstrating access control patterns",
    difficulty: "intermediate",
    label: "Access Control (ACL)",
    packageJson: {
      description: "A simple access control contract",
      keywords: ["fhevm", "access-control", "example"],
      name: "@fhevm-examples/access-control",
      version: "0.0.1",
    },
    path: "access-control",
    value: "access-control",
  },
  {
    description: "Example demonstrating branching patterns",
    difficulty: "intermediate",
    label: "Branching (If/Else)",
    packageJson: {
      description: "A simple branching contract",
      keywords: ["fhevm", "branching", "example"],
      name: "@fhevm-examples/branching",
      version: "0.0.1",
    },
    path: "branching",
    value: "branching",
  },
  {
    description: "User and Public Decryption patterns",
    difficulty: "intermediate",
    label: "Decryption Patterns",
    packageJson: {
      description: "A simple decryption contract",
      keywords: ["fhevm", "decryption", "example"],
      name: "@fhevm-examples/decryption",
      version: "0.0.1",
    },
    path: "decryption",
    value: "decryption",
  },
  {
    description: "Example demonstrating reorg protection patterns",
    difficulty: "intermediate",
    label: "Reorg Protection",
    packageJson: {
      description: "A simple reorg protection contract",
      keywords: ["fhevm", "reorg", "example"],
      name: "@fhevm-examples/reorg",
      version: "0.0.1",
    },
    path: "reorgs",
    value: "reorgs",
  },
  {
    description: "A privacy-preserving ERC20 token contract",
    difficulty: "advanced",
    label: "Confidential ERC20",
    packageJson: {
      dependencies: {
        "@openzeppelin/confidential-contracts": "^0.3.0",
        "@openzeppelin/contracts": "^5.4.0",
      },
      description: "A simple confidential ERC20 contract",
      keywords: ["fhevm", "confidential-erc20", "example"],
      name: "@fhevm-examples/confidential-erc20",
      version: "0.0.1",
    },
    path: "confidential-erc20",
    value: "confidential-erc20",
  },
];
