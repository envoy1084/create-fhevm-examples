---
title: Branching (If/Else)
---

## Overview


A common question is: *"How do I write an `if` statement with encrypted variables?"*

**The Challenge:**
In standard Solidity, `if (x > y)` requires the EVM to see the result of the comparison to jump to the correct bytecode branch.
In FHEVM, comparisons return an `ebool` (Encrypted Boolean). The EVM sees an opaque handle, not `true` or `false`.

**The Solution: `FHE.select`**
Instead of branching code execution, we branch **data selection**. This is equivalent to the ternary operator in standard languages:
```solidity
// Standard
uint32 result = (x > y) ? x : y;

// FHEVM
ebool condition = FHE.gt(x, y);
euint32 result = FHE.select(condition, x, y);
```

In this example, we implement a "High Water Mark" contract: it only updates the stored value if the new input is **greater** than the current value.

---

## Setup

Standard setup.

```typescript
if (!fhevm.isMock) {
  console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
  this.skip();
}
({ contract, address } = await deployFixture());
```

---

## Conditional Update

The test demonstrates the `setValue` function logic:
1. Start with `5`.
2. Try to update with `10`.
3. The contract computes `isAbove = 10 > 5` (which is Encrypted True).
4. It executes `FHE.select(isAbove, 10, 5)`.
5. The stored value becomes `10`.



```typescript
const encValueBefore = await contract.value();
const clearValueBefore = await fhevm.userDecryptEuint(
  FhevmType.euint32,
  encValueBefore,
  address,
  signers.alice,
);
```

```typescript
const clear10 = 10n;

// Encrypt the new candidate value (10)
const encryptedValue = await fhevm
  .createEncryptedInput(address, signers.alice.address)
  .add32(clear10)
  .encrypt();

// Call the contract function that uses FHE.select()
const tx = await contract
  .connect(signers.alice)
  .setValue(encryptedValue.handles[0], encryptedValue.inputProof);

await tx.wait();
```

```typescript
// Verify the value updated (because 10 > 5)
const encValueAfter = await contract.value();
const clearValueAfter = await fhevm.userDecryptEuint(
  FhevmType.euint32,
  encValueAfter,
  address,
  signers.alice,
);

expect(clearValueAfter).to.gt(clearValueBefore);
expect(clearValueAfter).to.eq(10);
```

---

