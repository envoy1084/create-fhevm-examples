/** biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: safe */
/** biome-ignore-all lint/style/noNonNullAssertion: safe */
import * as fs from "node:fs";
import * as path from "node:path";

import { glob, globSync } from "glob";

import { docgenLogger } from "../logger.js";
import { buildConfig, type DocgenConfig } from "./config.js";
import type { CodeBlock, DocChapter, DocSection, TabsBlock } from "./types.js";

interface IncludeOptions {
  strip?: boolean;
  group?: string; // Group ID for tabs
  tabTitle?: string; // Display name in the tab
}

export class DocParser {
  private chapters: Map<string, DocChapter> = new Map();
  private config: DocgenConfig;

  constructor(rootDir: string) {
    this.config = buildConfig(rootDir);
  }

  public async parse(): Promise<DocChapter[]> {
    const files = await glob(this.config.includeGlobs, {
      absolute: true,
      cwd: this.config.rootDir,
      ignore: this.config.excludeGlobs,
    });

    docgenLogger(`[DocParser] Found %d files to scan.`, files.length);

    for (const filePath of files) {
      this.processFile(filePath);
    }

    return Array.from(this.chapters.values()).sort(
      (a, b) => a.priority - b.priority,
    );
  }

  private processFile(filePath: string): void {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    const language = this.getLanguageFromExtension(filePath);

    // State
    let currentChapterId: string | null = null;
    let currentSectionTitle = "Overview";
    let isCapturingCode = false;
    let activeSnippetId: string | null = null;
    let codeBuffer: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // A. Chapter
      const chapterMatch = trimmed.match(
        /^\/\/\/\s*@chapter:\s*([a-z0-9-_]+)\s+"(.+)"/,
      );
      if (chapterMatch) {
        const [_, id, title] = chapterMatch;
        if (id && title) {
          currentChapterId = id;
          this.ensureChapter(id, title, filePath);
        }
        continue;
      }

      // B. Section
      const sectionMatch = trimmed.match(/^\/\/\/\s*@section:\s*"(.*)"/);
      if (sectionMatch && currentChapterId) {
        currentSectionTitle = sectionMatch[1]!;
        this.ensureSection(currentChapterId, currentSectionTitle);
        continue;
      }

      // C. Priority
      const priorityMatch = trimmed.match(/^\/\/\/\s*@priority:\s*(\d+)/);
      if (priorityMatch && currentChapterId) {
        const ch = this.chapters.get(currentChapterId);
        if (ch) ch.priority = parseInt(priorityMatch[1]!, 10);
        continue;
      }

      // D. Include: /// @include: "path" { json }
      const includeMatch = trimmed.match(
        /^\/\/\/\s*@include:\s*"([^"]+)"(?:\s+(\{.*\}))?/,
      );
      if (includeMatch && currentChapterId) {
        const targetPath = includeMatch[1]!;
        const rawOptions = includeMatch[2];
        const options: IncludeOptions = rawOptions
          ? JSON.parse(rawOptions)
          : {};

        // Flush existing code buffer
        if (isCapturingCode && activeSnippetId) {
          this.addCodeBlock(currentChapterId, currentSectionTitle, {
            content: this.dedent(codeBuffer),
            id: activeSnippetId,
            language,
            sourceFile: filePath,
            type: "code",
          });
          isCapturingCode = false;
          activeSnippetId = null;
          codeBuffer = [];
        }

        this.handleInclude(
          currentChapterId,
          currentSectionTitle,
          targetPath,
          filePath,
          options,
        );
        continue;
      }

      // E. Start Code
      const startMatch = trimmed.match(/^\/\/\s*@start:\s*([a-z0-9-_]+)/);
      if (startMatch) {
        if (isCapturingCode && activeSnippetId && currentChapterId) {
          this.addCodeBlock(currentChapterId, currentSectionTitle, {
            content: this.dedent(codeBuffer),
            id: activeSnippetId,
            language,
            sourceFile: filePath,
            type: "code",
          });
        }
        isCapturingCode = true;
        activeSnippetId = startMatch[1]!;
        codeBuffer = [];
        continue;
      }

      // F. End Code
      const endMatch = trimmed.match(/^\/\/\s*@end:\s*([a-z0-9-_]+)/);
      if (endMatch) {
        if (
          isCapturingCode &&
          activeSnippetId === endMatch[1] &&
          currentChapterId
        ) {
          this.addCodeBlock(currentChapterId, currentSectionTitle, {
            content: this.dedent(codeBuffer),
            id: activeSnippetId!,
            language,
            sourceFile: filePath,
            type: "code",
          });
          isCapturingCode = false;
          activeSnippetId = null;
          codeBuffer = [];
        }
        continue;
      }

      // G. Content
      if (trimmed.startsWith("// @ignore")) continue;

      if (trimmed.startsWith("///")) {
        const text = line.replace(/^\s*\/\/\/\s?/, "");
        if (currentChapterId)
          this.addMarkdownBlock(currentChapterId, currentSectionTitle, text);
      } else if (isCapturingCode) {
        codeBuffer.push(line);
      }
    }
  }

  // --- Logic ---

  private handleInclude(
    chapterId: string,
    sectionTitle: string,
    targetPath: string,
    currentFilePath: string,
    options: IncludeOptions,
  ) {
    const resolvedPath = this.resolveIncludePath(targetPath, currentFilePath);
    if (!resolvedPath) {
      docgenLogger(`[DocParser] Warning: Missing include "${targetPath}"`);
      return;
    }

    try {
      let content = fs.readFileSync(resolvedPath, "utf-8");
      const language = this.getLanguageFromExtension(resolvedPath);
      const filename = path.basename(resolvedPath);

      if (options.strip) {
        content = this.stripComments(content);
      }

      this.addCodeBlock(
        chapterId,
        sectionTitle,
        {
          content: content.trim(),
          id: `include-${filename}`,
          language,
          sourceFile: resolvedPath,
          title: options.tabTitle || filename, // Default tab title is filename
          type: "code",
        },
        options.group,
      );
    } catch (e) {
      docgenLogger(`[DocParser] Include Error: ${(e as Error).message}`);
    }
  }

  /**
   * Adds a code block to the section.
   * Smartly merges it into a TabsBlock if a 'group' ID is provided and matches the previous block.
   */
  private addCodeBlock(
    chapterId: string,
    sectionTitle: string,
    block: CodeBlock,
    groupId?: string,
  ) {
    const section = this.ensureSection(chapterId, sectionTitle);
    if (!section) return;

    if (groupId) {
      // Check if the *last* block is a TabsBlock with the same group ID
      const lastBlock = section.blocks[section.blocks.length - 1];

      if (
        lastBlock &&
        lastBlock.type === "tabs" &&
        lastBlock.groupId === groupId
      ) {
        // Merge into existing tab group
        lastBlock.tabs.push(block);
      } else {
        // Start a new tab group
        const tabsBlock: TabsBlock = {
          groupId,
          tabs: [block],
          type: "tabs",
        };
        section.blocks.push(tabsBlock);
      }
    } else {
      // No grouping, just add as standalone code
      section.blocks.push(block);
    }
  }

  // --- Helpers ---

  /**
   * Smart comment stripper.
   * - Removes comments but preserves intentional code spacing.
   * - Removes lines that become empty ONLY because they contained a comment.
   */
  private stripComments(content: string): string {
    // 1. Remove Block Comments first (/* ... */)
    // We do this globally because they can span lines.
    // Replacing with empty string might leave awkward gaps, but usually acceptable for block comments.
    const withoutBlocks = content.replace(/\/\*[\s\S]*?\*\//gm, "");

    // 2. Process Line-by-Line to handle single-line comments (//)
    return withoutBlocks
      .split("\n")
      .reduce((acc: string[], line) => {
        // Check if the line is ALREADY empty/whitespace before we touch it
        const isWhitespaceInitially = line.trim().length === 0;

        // Strip the // comment (ignoring URLs)
        // If the line has code + comment (e.g., "const x = 1; // init"), this keeps "const x = 1; "
        const cleanedLine = line.replace(/(?<!http:|https:)\/\/.*$/, "");

        // Check if it is empty AFTER stripping
        const isWhitespaceFinally = cleanedLine.trim().length === 0;

        // LOGIC:
        // 1. If it has content now -> Keep it.
        // 2. If it was empty initially -> Keep it (User's intentional spacing).
        // 3. If it became empty only after stripping -> Drop it (It was a full-line comment).
        if (!isWhitespaceFinally || isWhitespaceInitially) {
          // Use strict trimRight to remove trailing spaces left by the comment
          acc.push(cleanedLine.trimEnd());
        }

        return acc;
      }, [])
      .join("\n");
  }

  private resolveIncludePath(
    target: string,
    currentFile: string,
  ): string | null {
    if (path.isAbsolute(target)) return fs.existsSync(target) ? target : null;
    if (target.startsWith(".")) {
      const res = path.resolve(path.dirname(currentFile), target);
      return fs.existsSync(res) ? res : null;
    }
    // Deep Search
    const candidates = globSync(`**/${target}`, {
      absolute: true,
      cwd: this.config.rootDir,
      ignore: this.config.excludeGlobs,
      nodir: true,
    });
    return candidates[0] || null;
  }

  private getLanguageFromExtension(p: string): string {
    const ext = path.extname(p).replace(".", "").toLowerCase();
    if (ext === "ts" || ext === "tsx") return "typescript";
    if (ext === "sol") return "solidity";
    return ext;
  }

  private ensureChapter(id: string, title: string, filePath: string) {
    if (!this.chapters.has(id)) {
      this.chapters.set(id, {
        filePath,
        id,
        priority: 100,
        sections: [],
        title,
      });
    }
  }

  private ensureSection(cid: string, title: string): DocSection | undefined {
    const ch = this.chapters.get(cid);
    if (!ch) return undefined;
    let sec = ch.sections.find((s) => s.title === title);
    if (!sec) {
      sec = { blocks: [], title };
      ch.sections.push(sec);
    }
    return sec;
  }

  private addMarkdownBlock(cid: string, title: string, text: string) {
    const sec = this.ensureSection(cid, title);
    if (!sec) return;
    const last = sec.blocks[sec.blocks.length - 1];
    if (last && last.type === "markdown") last.content += `\n${text}`;
    else sec.blocks.push({ content: text, type: "markdown" });
  }

  private dedent(lines: string[]): string {
    const buffer = [...lines];
    while (buffer.length > 0 && !buffer[0]!.trim()) buffer.shift();
    while (buffer.length > 0 && !buffer[buffer.length - 1]!.trim())
      buffer.pop();
    if (buffer.length === 0) return "";
    const minIndent = buffer.reduce((min, l) => {
      if (!l.trim()) return min;
      const len = l.match(/^\s*/)![0].length;
      return len < min ? len : min;
    }, Infinity);
    return minIndent === Infinity
      ? buffer.join("\n")
      : buffer.map((l) => (l.trim() ? l.slice(minIndent) : "")).join("\n");
  }
}
