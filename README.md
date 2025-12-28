# 🚀 Create FHEVM Examples

The fastest way to bootstrap privacy-preserving dApps on FHEVM.

`create-fhevm-examples` is a CLI tool that scaffolds a production-ready FHEVM project in seconds. It comes pre-configured with Hardhat, Zama's FHE libraries, and a powerful "Docs-as-Code" engine that automatically generates GitBook-compatible documentation from your test files.

## ✨ Features

- 📦 **Instant Bootstrap**: One command to set up a fully typed Hardhat environment.
- 🛡️ **Production Templates**: Choose from Beginner (Counter) to Advanced (Confidential ERC20) patterns.
- 📚 **Auto-Documentation**: Write tutorials inside your test files. The built-in generator extracts code, comments, and structure into beautiful Markdown.
- ⚡️ **Developer Experience**: Pre-configured with `typescript`, `typechain`, and `fhevm-mocks` for fast local testing.
- 🔧 **Flexible**: Supports `npm`, `pnpm`, `yarn`, and `bun` out of the box.

## 🏁 Quick Start

To create a new project, simply run:

```bash
npx create-fhevm-examples
```

Follow the interactive prompts:

- Project Directory: (e.g., my-private-dapp)
- Select a Template: (e.g., Confidential ERC20)
- Select a Package Manager: (e.g., pnpm)
- Install Dependencies: Yes
- Initialize Git: Yes
- 
Once installed, navigate to your folder and start building:


```bash
cd my-private-dapp

# 1. Compile Contracts
pnpm compile

# 2. Run Tests (Simulated FHE environment)
pnpm test

# 3. Generate Documentation
pnpm docgen
```

## 📚 The "Docs-as-Code" Engine

The killer feature of this boilerplate is the Documentation Generator. Instead of maintaining a separate `docs/` folder that gets outdated, you write your documentation directly inside your integration tests.

If your test passes, your documentation is correct.


Detailed Docs are available [here](https://github.com/envoy1084/create-fhevm-examples/blob/main/DOCS.md).

**How it works**

1. **Annotate your Test**: Use `///` comments and `@directives` in your `.ts` files.
2. **Generate**: Run `pnpm docgen`.
3. **Publish**: The `docs/` folder is fully compatible with GitBook.

Example Syntax

Input (`test/counter.ts`):

```ts/// @chapter: counter "Encrypted Counter"
/// @section: "Incrementing"
/// To update the counter, we must provide an encrypted input.

it("should increment securely", async () => {
  // @start: increment-code
  const input = await fhevm.createEncryptedInput(contractAddress, user.address)
    .add32(1)
    .encrypt();

  const tx = await contract.increment(input.handles[0], input.inputProof);
  await tx.wait();
  // @end: increment-code

  expect(await contract.value()).to.eq(1);
});
```

Output (`docs/chapters/counter.md`):

```md
---
title: "Encrypted Counter"
---

## Incrementing

To update the counter, we must provide an encrypted input.

\`\`\`typescript
const input = await fhevm.createEncryptedInput(contractAddress, user.address)
  .add32(1)
  .encrypt();

const tx = await contract.increment(input.handles[0], input.inputProof);
await tx.wait();
\`\`\`
```

### Supported Directives

| Directive | Usage | Description |
| --- | --- | --- |
| `@chapter` | `/// @chapter: id "Title"` | Defines a new page. The ID determines the filename. |
| `@section` | `/// @section: "Title"` | Creates a ## Header in the markdown. |
| `@start / @end` | `// @start: id` | Captures the code block between these tags. |
| `@ignore` | `// @ignore` | Hides the next line from the generated output. |
| `@include` | `/// @include: "File.sol"` | Injects an external file (e.g., a Contract) into the docs. |

---

## 🗂 Project Structure

```text
my-private-dapp/
├── contracts/               # Solidity Smart Contracts
├── test/                    # Integration Tests & Documentation Source
│   ├── basic/
│   │   └── counter.ts
│   └── advanced/
│       └── erc20.ts
├── docs/                    # Auto-generated documentation
│   ├── api/                 # Solidity API docs (hardhat-docgen)
│   ├── chapters/            # Generated Guides
│   └── SUMMARY.md           # GitBook Navigation
├── hardhat.config.ts
└── package.json
```

### 🧭 Organizing Your Sidebar (_meta.json)

You don't need to rename folders to change the order of your documentation. Just add a `_meta.json` file in any directory to control the GitBook sidebar.

`test/advanced/_meta.json`:

```json
{
  "erc20": "Confidential Tokens",
  "---": "Governance",
  "voting": "DAO Systems"
}
```

**Features**:

- Rename: Change `"erc20"` to "Confidential Tokens".
- Separators: Add `"---": "Title"` to create visual dividers.
- Hoisting: Map a deep file like `"tokens/erc20"` to a top-level entry.

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

Fork the repository.

- Create a feature branch.
- Commit your changes.
- Open a Pull Request.

---

## 📄 License

Distributed under the MIT License. See [LICENSE](https://github.com/envoy1084/create-fhevm-examples/blob/main/LICENSE) for more information.


<p align="center"> Built with ❤️ for the FHEVM Community </p>