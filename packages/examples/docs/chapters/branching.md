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

{% tabs %}
{% tab title="Branching.sol" %}
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, ebool, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract Branching is ZamaEthereumConfig {
    euint32 public value;

    function set(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        euint32 encryptedValue = FHE.fromExternal(inputEuint32, inputProof);

        value = encryptedValue;

        FHE.allowThis(value);
        FHE.allow(value, msg.sender);
    }

    function setValue(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        euint32 encryptedValue = FHE.fromExternal(inputEuint32, inputProof);

        ebool isAbove = FHE.gt(encryptedValue, value);

        value = FHE.select(isAbove, encryptedValue, value);

        FHE.allowThis(value);
        FHE.allow(value, msg.sender);
    }
}
```
{% endtab %}
{% tab title="branching.test.ts" %}
```typescript
import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { ethers, fhevm } from "hardhat";

chai.use(chaiAsPromised);
const { expect } = chai;

import type { Branching } from "@/types";


type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = await ethers.getContractFactory("Branching");
  const contract = await factory.deploy();
  const address = await contract.getAddress();

  return { address, contract };
}

describe("Branching Logic", () => {
  let signers: Signers;
  let contract: Branching;
  let address: string;

  before(async () => {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      alice: ethSigners[1],
      bob: ethSigners[2],
      deployer: ethSigners[0],
    };
  });


  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }
    ({ contract, address } = await deployFixture());
  });

  const set = async (value: bigint | number) => {
    const encryptedValue = await fhevm
      .createEncryptedInput(address, signers.alice.address)
      .add32(BigInt(value))
      .encrypt();

    const tx = await contract
      .connect(signers.alice)
      .set(encryptedValue.handles[0], encryptedValue.inputProof);

    await tx.wait();
  };


  it("should replace value if greater", async () => {
    await set(5);

    const encValueBefore = await contract.value();
    const clearValueBefore = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encValueBefore,
      address,
      signers.alice,
    );

    const clear10 = 10n;

    const encryptedValue = await fhevm
      .createEncryptedInput(address, signers.alice.address)
      .add32(clear10)
      .encrypt();

    const tx = await contract
      .connect(signers.alice)
      .setValue(encryptedValue.handles[0], encryptedValue.inputProof);

    await tx.wait();

    const encValueAfter = await contract.value();
    const clearValueAfter = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encValueAfter,
      address,
      signers.alice,
    );

    expect(clearValueAfter).to.gt(clearValueBefore);
    expect(clearValueAfter).to.eq(10);
  });
});
```
{% endtab %}
{% endtabs %}

---

