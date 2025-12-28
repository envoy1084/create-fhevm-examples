# 📚 Documentation Generator

This project uses a custom "Docs-as-Code" pipeline designed for FHEVM examples. It allows you to write high-quality, GitBook-compatible tutorials directly inside your Test (`.ts`) and Contract (`.sol`) files.

It treats your code as the single source of truth, ensuring your documentation never drifts from your implementation.

## 🚀 Quick Start

1. Write Docs in Code: Add `///` comments and directives to your test files.
2. Generate: Run the generation script.
   ```bash
   pnpm create-fhevm-examples docgen
   ```
3. View: documentation is generated in `docs/chapters/` and `docs/api/`.

---

## ✍️ Writing Guides

### Chapters

Every guide starts with a `@chapter` directive. This tells the generator to create a new page in the documentation.

```ts
/// @chapter: my-guide "My Awesome Guide"
/// @priority: 1
```

- **ID**: my-guide (Used for the filename: my-guide.md).
- **Title**: "My Awesome Guide" (Displayed in the sidebar and page header).
- **Priority**: Lower numbers appear higher in the sidebar.

### Sections & Markdown

You can write standard Markdown using triple slashes `///`. You can also split your guide into sections using `@section`.

```ts
/// @section: "Introduction"
/// This is a paragraph explaining the concept.
/// You can use **bold**, *italics*, and [links](...).
```

### Capturing Code Snippets

Instead of copy-pasting code into markdown (which gets outdated), "capture" it directly from your test.

Use `// @start: <id>` and `// @end: <id>` to mark the region.

```ts
it("should mint tokens", async () => {
  // @start: mint-logic
  const tx = await contract.mint(alice.address, 100);
  await tx.wait();
  // @end: mint-logic
  
  expect(await contract.balanceOf(alice)).to.eq(100);
});
```

The generator will extract the code between the tags, dedent it, and insert it into the documentation under the current section.

## Ignoring Code

Sometimes you have test setup code that confuses the reader. Hide it with `// @ignore`.

```ts
// @start: setup
const factory = await ethers.getContractFactory("MyContract");
// @ignore
if (!fhevm.isMock) this.skip(); // This line won't show in docs
const contract = await factory.deploy();
// @end: setup
```

---

## 🧩 Advanced Features

### Including External Files

You can include entire files (like Solidity contracts) into your guide using `@include`.

```ts
/// @section: "The Contract"
/// Here is the full smart contract implementation:

/// @include: "MyContract.sol"
```

Smart Resolution: The path can be:

- **Relative**: ./utils/Helper.sol
- **Absolute**: /src/contracts/MyContract.sol
- **Filename Search**: MyContract.sol (Scans the project to find it).

#### Stripping Comments

To show a "clean" version of a file without internal comments, use the strip option.

```ts
/// @include: "MyContract.sol" { "strip": true }
```

#### Grouping Code

You can group multiple code blocks into a tabbed view (e.g., to show "Secure" vs "Insecure" implementations side-by-side).

Use the group option. Consecutive includes with the same group ID are merged.

```ts
/// @include: "BadImplementation.sol" { "group": "impl", "tabTitle": "❌ Insecure" }
/// @include: "GoodImplementation.sol" { "group": "impl", "tabTitle": "✅ Secure" }
```

---

## 🗂 Organization & Navigation (_meta.json)

The system automatically mirrors your folder structure. However, you can customize the sidebar using `_meta.json` files placed in any directory.

**Features**:

1. Renaming Folders: Change beginner/ to ⚡️ Beginner.
2. Reordering: Define the exact order of items.
3. Separators: Add visual dividers.
4. Hoisting: Move a file from a deep subfolder to a parent folder.

Example Structure:

```
test/
└── advanced/
    ├── _meta.json
    ├── voting/
    │   └── dao.test.ts
    └── tokens/
        └── erc20.test.ts
```

`_meta.json`:

```json
{
  "tokens/erc20": "Confidential Tokens", 
  "---": "Governance",
  "voting": "DAO Systems"
}
```


**How "Hoisting" Works**

Notice the key `tokens/erc20`.

- Normally, `erc20.test.ts` resides in `advanced/tokens`.
- By referencing it as `tokens/erc20` in the parent `_meta.json`, you "pull" the file up.
- Result: The documentation file is generated at `docs/advanced/erc20.md`, and the empty tokens folder is removed from the sidebar.


---

## 📝 Example Output


Input (`test/math.ts`):

```ts
/// @chapter: math "Encrypted Math"
/// @section: "Addition"
/// FHE addition is homomorphic.

it("adds two numbers", async () => {
  // @start: add
  const a = await encrypt(5);
  const b = await encrypt(10);
  const res = contract.add(a, b);
  // @end: add
});
```

Output (`docs/chapters/math.md`):

```md
---
title: "Encrypted Math"
---

## Addition

FHE addition is homomorphic.

```typescript
const a = await encrypt(5);
const b = await encrypt(10);
const res = contract.add(a, b);
```
```