export type BlockType = "markdown" | "code";

export interface MarkdownBlock {
  type: "markdown";
  content: string;
}

export interface CodeBlock {
  type: "code";
  id: string; // The snippet name (e.g. "deploy-logic")
  content: string; // The actual code
  language: string; // "typescript", "solidity", etc.
  sourceFile: string; // File path for reference
}

export type DocBlock = MarkdownBlock | CodeBlock;

export interface DocSection {
  title: string;
  blocks: DocBlock[];
}

export interface DocChapter {
  id: string;
  title: string;
  priority: number;
  sections: DocSection[];
}
