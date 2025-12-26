import * as prompt from "@clack/prompts";
import boxen from "boxen";
import kleur from "kleur";

import { type Example, examples } from "../data/index.js";

export const listExamples = async () => {
  prompt.intro("Welcome to FHEVM Examples 🔐");

  const args = await prompt.group({
    example: () => {
      return prompt.select({
        initialValue: "counter",
        maxItems: 5,
        message: "Available examples:",
        options: examples.map((v) => ({
          hint: v.description,
          label: v.label,
          value: v.value,
        })),
      });
    },
  });

  // biome-ignore lint/style/noNonNullAssertion: should exist
  const example = examples.find((e) => e.value === args.example)!;

  prompt.outro(prettifyExample(example));
};

const prettifyExample = (example: Example) => {
  const content = `
${kleur.bold("Difficulty:")} ${example.difficulty}
${kleur.bold("Description:")} ${example.description}
`;
  return boxen(content, {
    margin: { left: 2, top: 1 },
    padding: 1,
    title: example.label,
    titleAlignment: "center",
  });
};
