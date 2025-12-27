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
  title?: string; // Optional title for the code block
}

export interface TabsBlock {
  type: "tabs";
  groupId: string; // Identifier to merge consecutive blocks
  tabs: CodeBlock[];
}

export type DocBlock = MarkdownBlock | CodeBlock | TabsBlock;

export interface DocSection {
  title: string;
  blocks: DocBlock[];
}

export interface DocChapter {
  id: string;
  title: string;
  priority: number;
  sections: DocSection[];
  filePath: string;
}
