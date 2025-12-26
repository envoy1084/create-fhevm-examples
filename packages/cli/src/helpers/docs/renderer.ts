import path from "node:path";

import fs from "fs-extra";
import { glob } from "glob";

import { docgenLogger } from "../logger.js";
import { buildConfig, type DocgenConfig } from "./config.js";
import type { DocChapter } from "./types.js";
export class MarkdownRenderer {
  private config: DocgenConfig;

  constructor(rootDir: string) {
    this.config = buildConfig(rootDir);
  }

  public async render(chapters: DocChapter[]): Promise<void> {
    if (fs.existsSync(this.config.outDir)) {
      fs.rmSync(this.config.outDir, { force: true, recursive: true });
    }
    fs.mkdirSync(this.config.outDir, { recursive: true });

    let summaryContent = "# Table of Contents\n\n* [Introduction](README.md)\n";

    if (chapters.length > 0) {
      summaryContent += "\n## Guides\n\n";
    }

    for (const chapter of chapters) {
      const fileName = `${chapter.id}.md`;
      const fullPath = path.join(this.config.outDir, fileName);

      const content = this.generateChapterContent(chapter);
      fs.writeFileSync(fullPath, content);

      summaryContent += `* [${chapter.title}](chapters/${fileName})\n`;
      docgenLogger(`[DocGen] Generated Guide: %s`, fileName);
    }

    const apiDir = path.resolve(this.config.rootDir, "docs/api");

    if (fs.existsSync(apiDir)) {
      summaryContent += "\n## API Reference\n\n";

      const apiFiles = await glob("**/*.md", {
        cwd: apiDir,
        ignore: ["**/README.md", "**/SUMMARY.md", "**/index.md"],
      });

      apiFiles.sort();

      if (apiFiles.length === 0) {
        docgenLogger(
          "[DocGen] Warning: No API docs found in docs/api. Did you run 'hardhat docgen'?",
        );
      }

      for (const file of apiFiles) {
        const contractName = path.basename(file, ".md");
        summaryContent += `* [${contractName}](api/${file})\n`;
      }
    }

    fs.writeFileSync(this.config.summaryFile, summaryContent);
    docgenLogger(`[DocGen] Updated SUMMARY.md with API Docs + Guides`);
  }

  private generateChapterContent(chapter: DocChapter): string {
    const frontMatter = `---\ntitle: ${chapter.title}\n---\n\n`;
    let md = "";

    md += frontMatter;

    for (const section of chapter.sections) {
      md += `## ${section.title}\n\n`;

      for (const block of section.blocks) {
        if (block.type === "markdown") {
          md += `${block.content}\n\n`;
        } else if (block.type === "code") {
          md += `\`\`\`${block.language}\n`;
          md += `${block.content}\n`;
          md += `\`\`\`\n\n`;
        }
      }

      md += `---\n\n`;
    }

    return md;
  }
}
