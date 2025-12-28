/** biome-ignore-all lint/style/noNonNullAssertion: safe */
/** biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: safe */

import * as fs from "node:fs";
import * as path from "node:path";

import type { DocChapter, MetaConfig, NavNode, RenderItem } from "./types.js";

export class NavTree {
  public root: NavNode;

  constructor(sourceRoot: string) {
    this.root = this.createNode("root", "", sourceRoot);
  }

  public addChapter(chapter: DocChapter, relativePath: string) {
    const node = this.traversePath(relativePath);
    // Ensure we track the source location for meta resolution
    node.sourcePath = path.dirname(chapter.filePath);
    node.chapters.push(chapter);
  }

  public addFile(filePath: string, title: string) {
    const node = this.traversePath(filePath);
    const fileName = path.basename(filePath);
    const id = path.parse(fileName).name;

    node.files.push({ id, path: filePath, title });
  }

  public processMeta() {
    this.processNode(this.root);
  }

  private processNode(node: NavNode) {
    // 1. Recurse children first
    for (const child of node.children.values()) {
      this.processNode(child);
    }

    // 2. Read _meta.json
    const metaPath = path.join(node.sourcePath, "_meta.json");
    let meta: MetaConfig = {};
    if (fs.existsSync(metaPath)) {
      try {
        meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
      } catch (_) {
        console.warn(`[DocGen] Warning: Invalid JSON in ${metaPath}`);
      }
    }

    // 3. Map Available Items
    const available = new Map<string, RenderItem>();

    node.children.forEach((child, key) => {
      available.set(key, { data: child, type: "node" });
    });

    node.chapters.forEach((ch) => {
      if (!ch.writeDir) ch.writeDir = node.fullPath;
      available.set(ch.id, { data: ch, type: "chapter" });
    });

    node.files.forEach((f) => {
      available.set(f.id, { data: f, type: "file" });
    });

    const renderList: RenderItem[] = [];
    const usedKeys = new Set<string>();

    // 4. Process Meta Keys
    for (const [key, config] of Object.entries(meta)) {
      if (key === "..." || key === "...rest") continue;

      if (
        key.startsWith("---") ||
        (typeof config === "object" && config.type === "separator")
      ) {
        const title =
          typeof config === "object"
            ? config.title
            : typeof config === "string"
              ? config
              : "";
        renderList.push({ title: title || "", type: "separator" });
        continue;
      }

      // Check Direct Child
      if (available.has(key)) {
        const item = available.get(key)!;
        usedKeys.add(key);
        this.applyConfig(item, config);
        renderList.push(item);
        continue;
      }

      // Check Hoisted Item
      if (key.includes("/")) {
        const hoistedChapter = this.findAndDetachChapter(node, key);
        if (hoistedChapter) {
          hoistedChapter.writeDir = node.fullPath;
          const item: RenderItem = { data: hoistedChapter, type: "chapter" };
          this.applyConfig(item, config);
          renderList.push(item);
        }
      }
    }

    // 5. Append Rest
    const restItems: RenderItem[] = [];
    for (const [key, item] of available) {
      if (!usedKeys.has(key)) {
        // Skip empty folders (Fix from before)
        if (item.type === "node") {
          const childNode = item.data;
          const isEmpty =
            childNode.children.size === 0 &&
            childNode.chapters.length === 0 &&
            childNode.files.length === 0;
          if (isEmpty) continue;
        }
        restItems.push(item);
      }
    }

    restItems.sort((a, b) => {
      if (a.type === "node" && b.type !== "node") return -1;
      if (a.type !== "node" && b.type === "node") return 1;
      const nameA = this.getItemName(a);
      const nameB = this.getItemName(b);
      return nameA.localeCompare(nameB);
    });

    node.renderList = [...renderList, ...restItems];
  }

  /**
   * Traverses down from the current node to find a specific chapter,
   * removes it from that child node, and returns it.
   */
  private findAndDetachChapter(
    startNode: NavNode,
    pathStr: string,
  ): DocChapter | null {
    const parts = pathStr.split("/");
    const chapterId = parts.pop()!; // last part is the ID

    // Traverse down to the folder containing the chapter
    let currentNode = startNode;
    for (const part of parts) {
      if (!currentNode.children.has(part)) return null;
      currentNode = currentNode.children.get(part)!;
    }

    // Find the chapter in that node
    const index = currentNode.chapters.findIndex((c) => c.id === chapterId);
    if (index === -1) return null;

    // Remove it from the old location (Detach)
    const [chapter] = currentNode.chapters.splice(index, 1);

    // Also remove from that node's renderList if it was already processed
    if (currentNode.renderList) {
      currentNode.renderList = currentNode.renderList.filter(
        (i) => !(i.type === "chapter" && i.data.id === chapterId),
      );
    }

    return chapter!;
  }

  // --- Helpers ---

  private traversePath(relativePath: string): NavNode {
    const parts = relativePath
      .split("/")
      .filter((p) => p && !p.endsWith(".md"));
    let currentNode = this.root;
    let currentPath = "";
    let currentSource = this.root.sourcePath;

    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      currentSource = path.join(currentSource, part);

      if (!currentNode.children.has(part)) {
        currentNode.children.set(
          part,
          this.createNode(part, currentPath, currentSource),
        );
      }
      currentNode = currentNode.children.get(part)!;
    }
    return currentNode;
  }

  private createNode(
    segment: string,
    fullPath: string,
    sourcePath: string,
  ): NavNode {
    return {
      chapters: [],
      children: new Map(),
      files: [],
      fullPath,
      label: segment,
      renderList: [],
      segment,
      sourcePath,
    };
  }

  // biome-ignore lint/suspicious/noExplicitAny: safe
  private applyConfig(item: RenderItem, config: any) {
    if (typeof config === "object" && config.hidden) return;
    const titleOverride = typeof config === "string" ? config : config.title;

    if (titleOverride) {
      if (item.type === "node") item.data.label = titleOverride; // <--- ONLY Change Label
      if (item.type === "chapter") item.data.title = titleOverride;
      if (item.type === "file") item.data.title = titleOverride;
    }
  }

  private getItemName(item: RenderItem): string {
    if (item.type === "node") return item.data.label; // Sort by display name
    if (item.type === "chapter") return item.data.title;
    if (item.type === "file") return item.data.title;
    return "";
  }
}
