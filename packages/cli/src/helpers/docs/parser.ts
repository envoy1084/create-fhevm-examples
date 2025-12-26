/** biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: safe */
import * as fs from "node:fs";
import * as path from "node:path";

import { glob } from "glob";

import { docgenLogger } from "../logger.js";
import { buildConfig, type DocgenConfig } from "./config.js";
import type { DocChapter, DocSection } from "./types.js";

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
      try {
        this.processFile(filePath);
      } catch (err: unknown) {
        docgenLogger(
          `[DocParser] Error processing %s: %s`,
          filePath,
          (err as Error).message,
        );
      }
    }

    return Array.from(this.chapters.values()).sort(
      (a, b) => a.priority - b.priority,
    );
  }

  private processFile(filePath: string): void {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");

    // Auto-detect language
    const ext = path.extname(filePath).replace(".", "").toLowerCase();
    const language =
      ext === "ts" || ext === "tsx"
        ? "typescript"
        : ext === "sol"
          ? "solidity"
          : ext === "rs"
            ? "rust"
            : ext;

    // --- Parser State ---
    let currentChapterId: string | null = null;
    let currentSectionTitle = "Overview"; // Default section if none specified

    // We capture code lines in a buffer until we hit "@end"
    let isCapturingCode = false;
    let activeSnippetId: string | null = null;
    let codeBuffer: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // ---------------------------------------------------------
      // 1. Handle Directives (Control Flow)
      // ---------------------------------------------------------

      // A. Chapter Definition: /// @chapter: id "Title"
      const chapterMatch = trimmed.match(
        /^\/\/\/\s*@chapter:\s*([a-z0-9-_]+)\s+"(.+)"/,
      );
      if (chapterMatch) {
        const id = chapterMatch[1];
        const title = chapterMatch[2];
        if (id && title) {
          currentChapterId = id;
          this.ensureChapter(id, title);
        }
        continue;
      }

      // B. Priority: /// @priority: 10
      const priorityMatch = trimmed.match(/^\/\/\/\s*@priority:\s*(\d+)/);
      if (priorityMatch && currentChapterId) {
        const chapter = this.chapters.get(currentChapterId);
        if (chapter) {
          const priority = parseInt(priorityMatch[1] ?? "100", 10);
          chapter.priority = Number.isNaN(priority) ? 100 : priority;
        }
        continue;
      }

      // C. Section Header: /// @section: "Title"
      const sectionMatch = trimmed.match(/^\/\/\/\s*@section:\s*"(.*)"/);
      if (sectionMatch) {
        const title = sectionMatch[1];
        if (title && currentChapterId) {
          currentSectionTitle = title;
          // Ensure the section exists so we can write to it immediately
          this.ensureSection(currentChapterId, currentSectionTitle);
        }
        continue;
      }

      // D. Code Block Start: // @start: snippet-id
      const startMatch = trimmed.match(/^\/\/\s*@start:\s*([a-z0-9-_]+)/);
      if (startMatch) {
        const snippetId = startMatch[1];
        if (snippetId) {
          // If we were already capturing, flush the previous block first
          if (isCapturingCode && activeSnippetId && currentChapterId) {
            this.flushCodeBuffer(
              currentChapterId,
              currentSectionTitle,
              activeSnippetId,
              codeBuffer,
              language,
              filePath,
            );
          }

          isCapturingCode = true;
          activeSnippetId = snippetId;
          codeBuffer = [];
        }
        continue;
      }

      // E. Code Block End: // @end: snippet-id
      const endMatch = trimmed.match(/^\/\/\s*@end:\s*([a-z0-9-_]+)/);
      if (endMatch) {
        const snippetId = endMatch[1];
        // Only stop if the ID matches what we are currently capturing
        if (
          isCapturingCode &&
          snippetId === activeSnippetId &&
          currentChapterId &&
          activeSnippetId
        ) {
          this.flushCodeBuffer(
            currentChapterId,
            currentSectionTitle,
            activeSnippetId,
            codeBuffer,
            language,
            filePath,
          );
          isCapturingCode = false;
          activeSnippetId = null;
          codeBuffer = [];
        }
        continue;
      }

      // F. Ignore Directive: // @ignore
      if (trimmed.startsWith("// @ignore")) {
        continue;
      }

      // ---------------------------------------------------------
      // 2. Handle Content (Markdown or Code)
      // ---------------------------------------------------------

      // Case A: Markdown Line (starts with ///)
      if (trimmed.startsWith("///")) {
        // Strip the marker
        const text = line.replace(/^\s*\/\/\/\s?/, "");

        if (currentChapterId) {
          this.addMarkdownBlock(currentChapterId, currentSectionTitle, text);
        }
      }
      // Case B: Code Line (inside @start ... @end)
      else if (isCapturingCode) {
        codeBuffer.push(line);
      }
    }
  }

  // --- Helper Methods ---

  private ensureChapter(id: string, title: string): void {
    if (!this.chapters.has(id)) {
      this.chapters.set(id, {
        id,
        priority: 100,
        sections: [],
        title,
      });
    }
  }

  private ensureSection(
    chapterId: string,
    sectionTitle: string,
  ): DocSection | undefined {
    const chapter = this.chapters.get(chapterId);
    if (!chapter) return undefined;

    let section = chapter.sections.find((s) => s.title === sectionTitle);
    if (!section) {
      section = { blocks: [], title: sectionTitle };
      chapter.sections.push(section);
    }
    return section;
  }

  private addMarkdownBlock(
    chapterId: string,
    sectionTitle: string,
    text: string,
  ): void {
    const section = this.ensureSection(chapterId, sectionTitle);
    if (!section) return;

    // Optimization: If the last block was markdown, append to it instead of creating a new block
    // This makes the output markdown cleaner (fewer logic breaks)
    const lastBlock = section.blocks[section.blocks.length - 1];
    if (lastBlock && lastBlock.type === "markdown") {
      lastBlock.content += `\n${text}`;
    } else {
      section.blocks.push({
        content: text,
        type: "markdown",
      });
    }
  }

  private flushCodeBuffer(
    chapterId: string,
    sectionTitle: string,
    snippetId: string,
    buffer: string[],
    language: string,
    filePath: string,
  ): void {
    const section = this.ensureSection(chapterId, sectionTitle);
    if (!section) return;

    if (buffer.length === 0) return;

    // Clean up indentation
    const cleanCode = this.dedent(buffer);

    section.blocks.push({
      content: cleanCode,
      id: snippetId,
      language,
      sourceFile: filePath,
      type: "code",
    });
  }

  private dedent(lines: string[]): string {
    // Clone array to avoid mutating buffer
    const buffer = [...lines];

    // Remove leading empty lines
    while (buffer.length > 0 && buffer[0]?.trim() === "") {
      buffer.shift();
    }
    // Remove trailing empty lines
    while (buffer.length > 0 && buffer[buffer.length - 1]?.trim() === "") {
      buffer.pop();
    }

    if (buffer.length === 0) return "";

    // Find minimum indentation
    let minIndent = Infinity;
    for (const line of buffer) {
      if (line.trim() === "") continue;
      const match = line.match(/^\s*/);
      const len = match ? match[0].length : 0;
      if (len < minIndent) minIndent = len;
    }

    if (minIndent === Infinity) return buffer.join("\n");

    return buffer
      .map((line) => {
        // Leave empty lines as-is, slice others
        return line.trim() === "" ? "" : line.slice(minIndent);
      })
      .join("\n");
  }
}
