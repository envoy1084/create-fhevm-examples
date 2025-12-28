export type BlockType = "markdown" | "code" | "tabs";

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
  title?: string; // Title for the tab (e.g., "Contract", "Test")
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
  filePath: string; // Absolute path to source file
  relativeDir: string; // Relative path from project root (e.g. "test/advanced")
  writeDir?: string;
}

// --- Navigation & Meta Types ---

export interface MetaConfig {
  [key: string]: string | MetaItem;
}

export interface MetaItem {
  title?: string;
  type?: "separator" | "folder" | "page";
  href?: string;
  hidden?: boolean;
}

export interface NavFile {
  title: string;
  path: string; // Relative path for links
  id: string; // Filename without extension
}

export interface NavNode {
  segment: string; // Folder name
  label: string;
  fullPath: string; // Relative path from common root
  sourcePath: string; // Absolute path to find _meta.json
  children: Map<string, NavNode>;
  chapters: DocChapter[];
  files: NavFile[]; // API Files
  renderList: RenderItem[];
}

export type RenderItem =
  | { type: "node"; data: NavNode }
  | { type: "chapter"; data: DocChapter }
  | { type: "file"; data: NavFile }
  | { type: "separator"; title: string };
