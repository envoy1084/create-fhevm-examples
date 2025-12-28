// /** biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: safe */
/** biome-ignore-all lint/style/noNonNullAssertion: safe */
/** biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: safe */
// /** biome-ignore-all lint/style/noNonNullAssertion: safe */

import * as fs from "node:fs";
import * as path from "node:path";

import { glob, globSync } from "glob";

import { docgenLogger } from "../logger.js";
import { buildConfig, type DocgenConfig } from "./config.js";
import type { CodeBlock, DocChapter, DocSection, TabsBlock } from "./types.js";

interface IncludeOptions {
  strip?: boolean;
  group?: string;
  tabTitle?: string;
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

    return Array.from(this.chapters.values());
  }

  private processFile(filePath: string): void {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    const language = this.getLanguageFromExtension(filePath);

    // Relative dir for Meta resolution later
    const relativeDir = path.dirname(
      path.relative(this.config.rootDir, filePath),
    );

    // State
    let currentChapterId: string | null = null;
    let currentSectionTitle = "Overview";
    let isCapturingCode = false;
    let activeSnippetId: string | null = null;
    let codeBuffer: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // A. Chapter Definition
      const chapterMatch = trimmed.match(
        /^\/\/\/\s*@chapter:\s*([a-z0-9-_]+)\s+"(.+)"/,
      );
      if (chapterMatch) {
        const [_, id, title] = chapterMatch;
        if (id && title) {
          currentChapterId = id;
          this.ensureChapter(id, title, filePath, relativeDir);
        }
        continue;
      }

      // B. Section Header
      const sectionMatch = trimmed.match(/^\/\/\/\s*@section:\s*"(.*)"/);
      if (sectionMatch && currentChapterId) {
        currentSectionTitle = sectionMatch[1]!;
        this.ensureSection(currentChapterId, currentSectionTitle);
        continue;
      }

      // C. Priority (Optional legacy support, _meta.json preferred)
      const priorityMatch = trimmed.match(/^\/\/\/\s*@priority:\s*(\d+)/);
      if (priorityMatch && currentChapterId) {
        const ch = this.chapters.get(currentChapterId);
        if (ch) ch.priority = parseInt(priorityMatch[1]!, 10);
        continue;
      }

      // D. Include Directive
      const includeMatch = trimmed.match(
        /^\/\/\/\s*@include:\s*"([^"]+)"(?:\s+(\{.*\}))?/,
      );
      if (includeMatch && currentChapterId) {
        const targetPath = includeMatch[1]!;
        const rawOptions = includeMatch[2]!;
        const options: IncludeOptions = rawOptions
          ? JSON.parse(rawOptions)
          : {};

        if (isCapturingCode && activeSnippetId) {
          this.flushCode(
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
        this.handleInclude(
          currentChapterId,
          currentSectionTitle,
          targetPath,
          filePath,
          options,
        );
        continue;
      }

      // E. Start Code Capture
      const startMatch = trimmed.match(/^\/\/\s*@start:\s*([a-z0-9-_]+)/);
      if (startMatch) {
        if (isCapturingCode && activeSnippetId && currentChapterId) {
          this.flushCode(
            currentChapterId,
            currentSectionTitle,
            activeSnippetId,
            codeBuffer,
            language,
            filePath,
          );
        }
        isCapturingCode = true;
        activeSnippetId = startMatch[1]!;
        codeBuffer = [];
        continue;
      }

      // F. End Code Capture
      const endMatch = trimmed.match(/^\/\/\s*@end:\s*([a-z0-9-_]+)/);
      if (endMatch) {
        if (
          isCapturingCode &&
          activeSnippetId === endMatch[1] &&
          currentChapterId
        ) {
          this.flushCode(
            currentChapterId,
            currentSectionTitle,
            activeSnippetId!,
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

      // G. Content
      if (trimmed.startsWith("// @ignore")) continue;

      if (trimmed.startsWith("///")) {
        const text = line.replace(/^\s*\/\/\/\s?/, "");
        if (currentChapterId)
          this.addMarkdown(currentChapterId, currentSectionTitle, text);
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

  private flushCode(
    cid: string,
    sid: string,
    id: string,
    buf: string[],
    lang: string,
    src: string,
  ) {
    this.addCodeBlock(cid, sid, {
      content: this.dedent(buf),
      id,
      language: lang,
      sourceFile: src,
      type: "code",
    });
  }

  private addCodeBlock(
    chapterId: string,
    sectionTitle: string,
    block: CodeBlock,
    groupId?: string,
  ) {
    const section = this.ensureSection(chapterId, sectionTitle);
    if (!section) return;

    if (groupId) {
      const lastBlock = section.blocks[section.blocks.length - 1];

      if (
        lastBlock &&
        lastBlock.type === "tabs" &&
        lastBlock.groupId === groupId
      ) {
        lastBlock.tabs.push(block);
      } else {
        const tabsBlock: TabsBlock = {
          groupId,
          tabs: [block],
          type: "tabs",
        };
        section.blocks.push(tabsBlock);
      }
    } else {
      section.blocks.push(block);
    }
  }

  // --- Helpers ---

  private stripComments(content: string): string {
    const withoutBlocks = content.replace(/\/\*[\s\S]*?\*\//gm, "");
    return withoutBlocks
      .split("\n")
      .reduce((acc: string[], line) => {
        const isWhitespaceInitially = line.trim().length === 0;
        const cleanedLine = line.replace(/(?<!http:|https:)\/\/.*$/, "");
        const isWhitespaceFinally = cleanedLine.trim().length === 0;
        if (!isWhitespaceFinally || isWhitespaceInitially)
          acc.push(cleanedLine.trimEnd());
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
    return ext === "ts" || ext === "tsx"
      ? "typescript"
      : ext === "sol"
        ? "solidity"
        : ext;
  }

  private ensureChapter(
    id: string,
    title: string,
    filePath: string,
    relativeDir: string,
  ) {
    if (!this.chapters.has(id)) {
      this.chapters.set(id, {
        filePath,
        id,
        priority: 100,
        relativeDir,
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

  private addMarkdown(cid: string, title: string, text: string) {
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
