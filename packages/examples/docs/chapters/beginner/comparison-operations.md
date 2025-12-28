---
title: "Comparison"
---

## Overview


FHEVM allows you to compare two encrypted numbers (or an encrypted number and a clear number).

**Crucial Concept: Encrypted Booleans (`ebool`)**
The result of a comparison is **not** a public `true` or `false`. It is an `ebool` (encrypted boolean).
This means the network knows a comparison happened, but it does **not** know the result.

`ebool` is primarily used with `FHE.select(condition, ifTrue, ifFalse)` to implement encrypted "If/Else" statements.

---

## Setup

Standard setup. Comparisons behave identically on Mock and Real networks.

```typescript
if (!fhevm.isMock) {
  console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
  this.skip();
}
({ contract, address } = await deployFixture());
```

---

## Equality Checks (==, !=)

These operations determine if two encrypted values are identical or distinct.

* `eq`: Returns an `ebool` that is effectively `Encrypted(1)` if equal, `Encrypted(0)` if not.
* `neq`: The inverse.

Note the use of `userDecryptEbool` in the verification step.

```typescript
const clear10 = 10;

// Encrypt the value to compare against
const encrypted10 = await fhevm
  .createEncryptedInput(address, signers.alice.address)
  .add32(clear10)
  .encrypt();

// Run Comparison: 10 == 10
const tx = await contract
  .connect(signers.alice)
  .eq(encrypted10.handles[0], encrypted10.inputProof);
await tx.wait();

// Verify Result (Decrypted Boolean)
const encResult = await contract.result();
const clearResult = await fhevm.userDecryptEbool(
  encResult,
  address,
  signers.alice,
);

expect(clearResult).to.eq(true);
```

```typescript
const clear10 = 10;
const encrypted10 = await fhevm
  .createEncryptedInput(address, signers.alice.address)
  .add32(clear10)
  .encrypt();

// Run Comparison: 10 != 10
const tx = await contract
  .connect(signers.alice)
  .neq(encrypted10.handles[0], encrypted10.inputProof);
await tx.wait();

const encResult = await contract.result();
const clearResult = await fhevm.userDecryptEbool(
  encResult,
  address,
  signers.alice,
);

expect(clearResult).to.eq(false);
```

---

## Greater Than (> / >=)

Used for checking thresholds (e.g., "Does user have enough balance?").

* `gt`: Strictly greater than (`>`)
* `gte`: Greater than or equal to (`>=`)

```typescript
const clear11 = 11;
const encrypted11 = await fhevm
  .createEncryptedInput(address, signers.alice.address)
  .add32(clear11)
  .encrypt();

// Run Comparison: 10 > 11
const tx = await contract
  .connect(signers.alice)
  .gt(encrypted11.handles[0], encrypted11.inputProof);
await tx.wait();

const encResult = await contract.result();
const clearResult = await fhevm.userDecryptEbool(
  encResult,
  address,
  signers.alice,
);

expect(clearResult).to.eq(clear10 > clear11);
```

```typescript
const clear11 = 11;
const encrypted11 = await fhevm
  .createEncryptedInput(address, signers.alice.address)
  .add32(clear11)
  .encrypt();

const tx = await contract
  .connect(signers.alice)
  .gte(encrypted11.handles[0], encrypted11.inputProof);
await tx.wait();

const encResult = await contract.result();
const clearResult = await fhevm.userDecryptEbool(
  encResult,
  address,
  signers.alice,
);

expect(clearResult).to.eq(clear10 >= clear11);
```

---

## Less Than (< / <=)

Symmetric to Greater Than operations.

```typescript
const clear11 = 11;
const encrypted11 = await fhevm
  .createEncryptedInput(address, signers.alice.address)
  .add32(clear11)
  .encrypt();

const tx = await contract
  .connect(signers.alice)
  .lt(encrypted11.handles[0], encrypted11.inputProof);
await tx.wait();

const encResult = await contract.result();
const clearResult = await fhevm.userDecryptEbool(
  encResult,
  address,
  signers.alice,
);

expect(clearResult).to.eq(clear10 < clear11);
```

```typescript
const encrypted11 = await fhevm
  .createEncryptedInput(address, signers.alice.address)
  .add32(clear11)
  .encrypt();

const tx = await contract
  .connect(signers.alice)
  .lte(encrypted11.handles[0], encrypted11.inputProof);
await tx.wait();

const encResult = await contract.result();
const clearResult = await fhevm.userDecryptEbool(
  encResult,
  address,
  signers.alice,
);

expect(clearResult).to.eq(clear10 <= clear11);
```

{% tabs %}
{% tab title="Comparison.sol" %}
{% code title="Comparison.sol" %}
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, ebool, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title Comparison Operations
 * @notice Demonstrates basic comparison operations using FHEVM
 */
contract ComparisonOperations is ZamaEthereumConfig {
    euint32 private value;
    ebool public result;

    /**
     * @notice Get the current value
     * @return value The current encrypted value
     */
    function get() external view returns (euint32) {
        return value;
    }

    /**
     * @notice Initialize the encrypted value
     * @param inputEuint32 Encrypted uint32 input
     * @param inputProof Proof that the encrypted value is well-formed
     * @dev This example omits overflow/underflow checks for simplicity and readability.
     * In a production contract, proper range checks should be implemented.
     */
    function set(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        euint32 encryptedValue = FHE.fromExternal(inputEuint32, inputProof);
        value = encryptedValue;

        FHE.allowThis(value);
        FHE.allow(value, msg.sender);
    }

    /**
     * @notice Compares two encrypted values for equality
     * @param inputEuint32 Encrypted uint32 input
     * @param inputProof Proof that the encrypted value is well-formed
     */
    function eq(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        euint32 encryptedValue = FHE.fromExternal(inputEuint32, inputProof);

        result = FHE.eq(value, encryptedValue);

        FHE.allowThis(result);
        FHE.allow(result, msg.sender);
    }

    /**
     * @notice Compares two encrypted values for inequality
     * @param inputEuint32 Encrypted uint32 input
     * @param inputProof Proof that the encrypted value is well-formed
     */
    function neq(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        euint32 encryptedValue = FHE.fromExternal(inputEuint32, inputProof);

        result = FHE.ne(value, encryptedValue);

        FHE.allowThis(result);
        FHE.allow(result, msg.sender);
    }

    /**
     * @notice Compares two encrypted values for greater than
     * @param inputEuint32 Encrypted uint32 input
     * @param inputProof Proof that the encrypted value is well-formed
     */
    function gt(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        euint32 encryptedValue = FHE.fromExternal(inputEuint32, inputProof);

        result = FHE.gt(value, encryptedValue);

        FHE.allowThis(result);
        FHE.allow(result, msg.sender);
    }

    /**
     * @notice Compares two encrypted values for greater than or equal to
     * @param inputEuint32 Encrypted uint32 input
     * @param inputProof Proof that the encrypted value is well-formed
     */
    function gte(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        euint32 encryptedValue = FHE.fromExternal(inputEuint32, inputProof);

        result = FHE.ge(value, encryptedValue);

        FHE.allowThis(result);
        FHE.allow(result, msg.sender);
    }

    /**
     * @notice Compares two encrypted values for less than
     * @param inputEuint32 Encrypted uint32 input
     * @param inputProof Proof that the encrypted value is well-formed
     */
    function lt(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        euint32 encryptedValue = FHE.fromExternal(inputEuint32, inputProof);

        result = FHE.lt(value, encryptedValue);

        FHE.allowThis(result);
        FHE.allow(result, msg.sender);
    }

    /**
     * @notice Compares two encrypted values for less than or equal to
     * @param inputEuint32 Encrypted uint32 input
     * @param inputProof Proof that the encrypted value is well-formed
     */
    function lte(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        euint32 encryptedValue = FHE.fromExternal(inputEuint32, inputProof);

        result = FHE.le(value, encryptedValue);

        FHE.allowThis(result);
        FHE.allow(result, msg.sender);
    }
}
```
{% endcode %}
{% endtab %}
{% tab title="comparison.test.ts" %}
{% code title="comparison.test.ts" %}
```typescript
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

import type { ComparisonOperations } from "@/types";


type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = await ethers.getContractFactory("ComparisonOperations");
  const contract = await factory.deploy();
  const address = await contract.getAddress();

  return { address, contract };
}

describe("Comparison Operations", () => {
  let signers: Signers;
  let contract: ComparisonOperations;
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

    await contract
      .connect(signers.alice)
      .set(encryptedValue.handles[0], encryptedValue.inputProof);
  };


  it("should check equality", async () => {
    await set(10);

    const clear10 = 10;

    const encrypted10 = await fhevm
      .createEncryptedInput(address, signers.alice.address)
      .add32(clear10)
      .encrypt();

    const tx = await contract
      .connect(signers.alice)
      .eq(encrypted10.handles[0], encrypted10.inputProof);
    await tx.wait();

    const encResult = await contract.result();
    const clearResult = await fhevm.userDecryptEbool(
      encResult,
      address,
      signers.alice,
    );

    expect(clearResult).to.eq(true);
  });

  it("should check inequality", async () => {
    await set(10);

    const clear10 = 10;
    const encrypted10 = await fhevm
      .createEncryptedInput(address, signers.alice.address)
      .add32(clear10)
      .encrypt();

    const tx = await contract
      .connect(signers.alice)
      .neq(encrypted10.handles[0], encrypted10.inputProof);
    await tx.wait();

    const encResult = await contract.result();
    const clearResult = await fhevm.userDecryptEbool(
      encResult,
      address,
      signers.alice,
    );

    expect(clearResult).to.eq(false);
  });


  it("should check greater than", async () => {
    const clear10 = 10;
    await set(10);

    const clear11 = 11;
    const encrypted11 = await fhevm
      .createEncryptedInput(address, signers.alice.address)
      .add32(clear11)
      .encrypt();

    const tx = await contract
      .connect(signers.alice)
      .gt(encrypted11.handles[0], encrypted11.inputProof);
    await tx.wait();

    const encResult = await contract.result();
    const clearResult = await fhevm.userDecryptEbool(
      encResult,
      address,
      signers.alice,
    );

    expect(clearResult).to.eq(clear10 > clear11);
  });

  it("should check greater than or equal to", async () => {
    const clear10 = 10;
    await set(10);

    const clear11 = 11;
    const encrypted11 = await fhevm
      .createEncryptedInput(address, signers.alice.address)
      .add32(clear11)
      .encrypt();

    const tx = await contract
      .connect(signers.alice)
      .gte(encrypted11.handles[0], encrypted11.inputProof);
    await tx.wait();

    const encResult = await contract.result();
    const clearResult = await fhevm.userDecryptEbool(
      encResult,
      address,
      signers.alice,
    );

    expect(clearResult).to.eq(clear10 >= clear11);
  });


  it("should check less than", async () => {
    const clear10 = 10;
    await set(10);

    const clear11 = 11;
    const encrypted11 = await fhevm
      .createEncryptedInput(address, signers.alice.address)
      .add32(clear11)
      .encrypt();

    const tx = await contract
      .connect(signers.alice)
      .lt(encrypted11.handles[0], encrypted11.inputProof);
    await tx.wait();

    const encResult = await contract.result();
    const clearResult = await fhevm.userDecryptEbool(
      encResult,
      address,
      signers.alice,
    );

    expect(clearResult).to.eq(clear10 < clear11);
  });

  it("should check less than or equal to", async () => {
    const clear10 = 10;
    const clear11 = 11;
    await set(clear10);

    const encrypted11 = await fhevm
      .createEncryptedInput(address, signers.alice.address)
      .add32(clear11)
      .encrypt();

    const tx = await contract
      .connect(signers.alice)
      .lte(encrypted11.handles[0], encrypted11.inputProof);
    await tx.wait();

    const encResult = await contract.result();
    const clearResult = await fhevm.userDecryptEbool(
      encResult,
      address,
      signers.alice,
    );

    expect(clearResult).to.eq(clear10 <= clear11);
  });
});
```
{% endcode %}
{% endtab %}
{% endtabs %}

---

