import path from "node:path";

import fs from "fs-extra";
import { glob } from "glob";

import { docgenLogger } from "../logger.js";
import { buildConfig, type DocgenConfig } from "./config.js";
import { NavTree } from "./nav-tree.js";
import type { DocChapter, RenderItem } from "./types.js";

export class MarkdownRenderer {
  private config: DocgenConfig;

  constructor(rootDir: string) {
    this.config = buildConfig(rootDir);
  }

  public async render(chapters: DocChapter[]): Promise<void> {
    // 1. Clean Output
    if (fs.existsSync(this.config.outDir)) {
      fs.rmSync(this.config.outDir, { force: true, recursive: true });
    }
    fs.mkdirSync(this.config.outDir, { recursive: true });

    // 2. Determine Source Root
    const commonPrefix = this.getCommonPrefix(
      chapters.map((c) => c.relativeDir),
    );
    const sourceRoot = path.join(this.config.rootDir, commonPrefix);

    const tree = new NavTree(sourceRoot);

    // 3. Add Chapters to Tree
    for (const chapter of chapters) {
      // Normalize relative path
      let cleanDir = chapter.relativeDir.slice(commonPrefix.length);
      if (cleanDir.startsWith(path.sep) || cleanDir.startsWith("/"))
        cleanDir = cleanDir.slice(1);
      cleanDir = cleanDir.replace(/\\/g, "/");

      tree.addChapter(chapter, cleanDir);
    }

    // 4. Process Meta (Calculates writeDir for hoisted files)
    tree.processMeta();

    // 5. Generate Files
    for (const chapter of chapters) {
      let folderPath = "";

      // USE THE HOISTED PATH IF AVAILABLE
      if (chapter.writeDir !== undefined) {
        folderPath = chapter.writeDir;
      } else {
        // Fallback to original structure
        folderPath = chapter.relativeDir.slice(commonPrefix.length);
        if (folderPath.startsWith(path.sep)) folderPath = folderPath.slice(1);
      }

      folderPath = folderPath.replace(/\\/g, "/");

      const fullPath = path.join(
        this.config.outDir,
        folderPath,
        `${chapter.id}.md`,
      );
      fs.ensureDirSync(path.dirname(fullPath));
      fs.writeFileSync(fullPath, this.generateChapterContent(chapter));
    }

    // 6. Generate SUMMARY
    let summaryContent = "# Table of Contents\n\n* [Introduction](README.md)\n";
    summaryContent += this.renderTreeItems(tree.root.renderList, 0, "chapters");
    summaryContent += await this.getApiDocsSummary();

    fs.writeFileSync(this.config.summaryFile, summaryContent);
    docgenLogger(`[DocGen] Generated SUMMARY.md`);
  }

  private renderTreeItems(
    items: RenderItem[],
    depth: number,
    linkPrefix: string,
  ): string {
    let output = "";

    for (const item of items) {
      const indent = "  ".repeat(depth);

      if (item.type === "separator") {
        output += `\n${indent}### ${item.title || "---"}\n`;
      } else if (item.type === "node") {
        const node = item.data;

        // 1. DISPLAY NAME: Use node.label ("⚡️ Beginner")
        if (depth === 0) output += `\n## ${node.label}\n\n`;
        else output += `${indent}* ${node.label}\n`;

        // 2. URL PATH: Use node.segment ("beginner")
        // This ensures the link stays valid: chapters/beginner/file.md
        const nextLinkPrefix = `${linkPrefix}/${node.segment}`;

        output += this.renderTreeItems(
          node.renderList,
          depth + 1,
          nextLinkPrefix,
        );
      } else if (item.type === "chapter") {
        const url = `${linkPrefix}/${item.data.id}.md`;
        output += `${indent}* [${item.data.title}](${url})\n`;
      }
    }
    return output;
  }

  private async getApiDocsSummary(): Promise<string> {
    const apiDir = path.resolve(this.config.rootDir, "docs/api");
    if (!fs.existsSync(apiDir)) return "";

    const files = await glob("**/*.md", {
      cwd: apiDir,
      ignore: ["README.md", "SUMMARY.md"],
    });
    let out = "\n## API Reference\n\n";
    for (const f of files.sort()) {
      out += `* [${path.basename(f, ".md")}](api/${f})\n`;
    }
    return out;
  }

  private generateChapterContent(chapter: DocChapter): string {
    const frontMatter = `---\ntitle: "${chapter.title}"\n---\n\n`;
    let md = frontMatter;

    for (const section of chapter.sections) {
      md += `## ${section.title}\n\n`;
      for (const block of section.blocks) {
        if (block.type === "markdown") {
          md += `${block.content}\n\n`;
        } else if (block.type === "code") {
          md += `\`\`\`${block.language}\n${block.content}\n\`\`\`\n\n`;
        } else if (block.type === "tabs") {
          md += `{% tabs %}\n`;
          for (const tab of block.tabs) {
            const title = tab.title || "Code";
            md += `{% tab title="${title}" %}\n{% code title="${title}" %}\n\`\`\`${tab.language}\n${tab.content}\n\`\`\`\n{% endcode %}\n{% endtab %}\n`;
          }
          md += `{% endtabs %}\n\n`;
        }
      }
      md += `---\n\n`;
    }
    return md;
  }

  private getCommonPrefix(paths: string[]): string {
    if (paths.length === 0) return "";
    const split = paths.map((p) => p.split(path.sep));
    const base = split[0] ?? [];
    let len = 0;
    for (let i = 0; i < base.length; i++) {
      if (split.every((p) => p[i] === base[i])) len++;
      else break;
    }
    return base.slice(0, len).join(path.sep);
  }
}
