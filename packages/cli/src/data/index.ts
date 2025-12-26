export type Example = {
  label: string;
  package: {
    description: string;
    name: string;
    version: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    scripts?: Record<string, string>;
    keywords: string[];
  };
  path: string;
  value: string;
};

export const examples: Example[] = [
  {
    label: "Counter",
    package: {
      description: "A simple counter contract",
      keywords: ["fhevm", "counter", "example"],
      name: "@fhevm-examples/counter",
      version: "0.0.1",
    },
    path: "counter",
    value: "counter",
  },
];
