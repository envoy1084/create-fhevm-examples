---
title: "Arithmetic"
---

## Overview


The power of FHE lies in its ability to perform math on data while it remains encrypted.
This guide covers the four basic arithmetic operations: Addition, Subtraction, Multiplication, Division, Remainder, and Minimum/Maximum.

We will verify that:
* $Enc(a) + Enc(b) = Enc(a + b)$
* $Enc(a) - Enc(b) = Enc(a - b)$
* $Enc(a) * Enc(b) = Enc(a * b)$
* $Enc(a) / b = Enc(a / b)$ (Scalar Division)
* $Enc(a) % b = Enc(a % b)$ (Remainder)
* $Enc(a) < Enc(b)$ if $a < b$
* $Enc(a) > Enc(b)$ if $a > b$

---

## Setup

Standard setup to deploy the arithmetic contract and verify we are running on the Mock FHEVM.

```typescript
if (!fhevm.isMock) {
  console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
  this.skip();
}
({ contract, address } = await deployFixture());
```

---

## Addition

Addition is the most fundamental operation. Here we create an encrypted input for `10`
and add it to the contract's state.

**Key Concept:** Both the contract state and the input are encrypted. The EVM cannot see `10`,
but it successfully computes the new encrypted sum.

```typescript
const clear10 = 10n;

// 1. Encrypt the input (User Side)
const encrypted10 = await fhevm
  .createEncryptedInput(address, signers.alice.address)
  .add32(clear10)
  .encrypt();

// 2. Perform Homomorphic Addition (On-Chain)
const tx = await contract
  .connect(signers.alice)
  .add(encrypted10.handles[0], encrypted10.inputProof);
await tx.wait();

// 3. Verify Result (Decryption)
const encValueAfterAdd = await contract.get();
const clearValueAfterAdd = await fhevm.userDecryptEuint(
  FhevmType.euint32,
  encValueAfterAdd,
  address,
  signers.alice,
);

expect(clearValueAfterAdd).to.eq(clear10);
```

---

## Subtraction

Subtraction works similarly to addition. FHEVM handles underflows according to modular arithmetic rules,
but for simple cases, it behaves exactly as expected.

```typescript
// Now subtract 5
const clear5 = 5n;
const encrypted5 = await fhevm
  .createEncryptedInput(address, signers.alice.address)
  .add32(clear5)
  .encrypt();

const tx = await contract
  .connect(signers.alice)
  .sub(encrypted5.handles[0], encrypted5.inputProof);
await tx.wait();

const encValueAfterSub = await contract.get();
const clearValueAfterSub = await fhevm.userDecryptEuint(
  FhevmType.euint32,
  encValueAfterSub,
  address,
  signers.alice,
);

expect(clearValueAfterSub).to.eq(clear10 - clear5);
```

---

## Multiplication

We can multiply two encrypted numbers together. This is a more computationally expensive operation
than addition but is fully supported.

```typescript
const clear3 = 3n;
const encrypted3 = await fhevm
  .createEncryptedInput(address, signers.alice.address)
  .add32(clear3)
  .encrypt();

const tx = await contract
  .connect(signers.alice)
  .mul(encrypted3.handles[0], encrypted3.inputProof);
await tx.wait();
```

---

## Division (Scalar)

Division is unique. In FHE, dividing an encrypted number by another encrypted number is extremely
expensive and complex. However, dividing an **Encrypted Number** by a **Public (Clear) Number** is fast.

This is known as **Scalar Division**.

**Why do we do this?**
In many real-world protocols (like AMMs or DAOs), you often need to divide by a known constant or
a public variable (e.g., "calculate 5% fee" or "average over 10 users").

Notice below that we pass `clear2` directly to the contract. We do **not** use `createEncryptedInput`
because the divisor is public.

```typescript
// Divisor is PUBLIC (Cleartext)
const clear2 = 2n;

// We pass the raw bigint directly. No encryption handles needed.
const tx = await contract.connect(signers.alice).div(clear2);
await tx.wait();

// Decrypt to verify: 10 / 2 = 5
const encValueAfterDiv = await contract.get();
const clearValueAfterDiv = await fhevm.userDecryptEuint(
  FhevmType.euint32,
  encValueAfterDiv,
  address,
  signers.alice,
);

expect(clearValueAfterDiv).to.eq(clear10 / clear2);
```

---

## Remainder (Modulo)

Just like division, the Remainder operation is typically performed against a **public scalar**
to be computationally efficient.

This is commonly used in blockchain logic for:
* **Vesting Schedules:** Calculating `time % period`.
* **Lotteries:** Determining a winner from a random number.

In this example, we calculate $Enc(10) \% 3$.

```typescript
// The modulus is Public (Cleartext)
const clear3 = 3n;

// We pass the raw bigint directly
const tx = await contract.connect(signers.alice).rem(clear3);
await tx.wait();

// Verify: 10 % 3 = 1
const encValueAfterRem = await contract.get();
const clearValueAfterRem = await fhevm.userDecryptEuint(
  FhevmType.euint32,
  encValueAfterRem,
  address,
  signers.alice,
);

expect(clearValueAfterRem).to.eq(clear10 % clear3);
```

---

## Comparisons (Min/Max)

FHEVM allows for homomorphic comparisons. You can determine the smaller or larger of two
**encrypted** numbers without ever revealing what those numbers are.

This is incredibly powerful for financial privacy, such as:
* **Capping Withdrawals:** `min(requested_amount, daily_limit)`
* **Flooring Collateral:** `max(user_collateral, liquidation_threshold)`

Below, we compute the minimum of the encrypted state (10) and a new encrypted input (3).

```typescript
const clear3 = 3;

// 1. Encrypt the comparison value
const encrypted3 = await fhevm
  .createEncryptedInput(address, signers.alice.address)
  .add32(clear3)
  .encrypt();

// 2. Compute Min(State, Input)
const tx = await contract
  .connect(signers.alice)
  .min(encrypted3.handles[0], encrypted3.inputProof);
await tx.wait();

// Verify: min(10, 3) = 3
const encValueAfterMin = await contract.get();
const clearValueAfterMin = await fhevm.userDecryptEuint(
  FhevmType.euint32,
  encValueAfterMin,
  address,
  signers.alice,
);

expect(clearValueAfterMin).to.eq(Math.min(clear10, clear3));
```

The Maximum operation works identically. Here we verify that the state updates
to the larger of the two values.

```typescript
const clear11 = 11;

// Encrypt the comparison value
const encrypted11 = await fhevm
  .createEncryptedInput(address, signers.alice.address)
  .add32(clear11)
  .encrypt();

// Compute Max(State, Input)
const tx = await contract
  .connect(signers.alice)
  .max(encrypted11.handles[0], encrypted11.inputProof);
await tx.wait();

// Verify: max(10, 11) = 11
const encValueAfterMax = await contract.get();
const clearValueAfterMax = await fhevm.userDecryptEuint(
  FhevmType.euint32,
  encValueAfterMax,
  address,
  signers.alice,
);

expect(clearValueAfterMax).to.eq(Math.max(clear10, clear11));
```

{% tabs %}
{% tab title="Arithmetic.sol" %}
{% code title="Arithmetic.sol" %}
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title EncryptedArithmetic
 * @notice Demonstrates basic encrypted arithmetic using FHEVM
 *
 * @dev This contract stores an encrypted uint and allows
 * arithmetic operations without revealing the value.
 */
contract EncryptedArithmetic is ZamaEthereumConfig {
    euint32 private value;

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
     * @notice Add an encrypted value to the current value
     * @param inputEuint32 Encrypted uint32 input
     * @param inputProof Proof that the encrypted value is well-formed
     * @dev This example omits overflow/underflow checks for simplicity and readability.
     * In a production contract, proper range checks should be implemented.
     */
    function add(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        euint32 encryptedValue = FHE.fromExternal(inputEuint32, inputProof);

        value = FHE.add(value, encryptedValue);

        FHE.allowThis(value);
        FHE.allow(value, msg.sender);
    }

    /**
     * @notice Subtract an encrypted value from the current value
     * @param inputEuint32 Encrypted uint32 input
     * @param inputProof Proof that the encrypted value is well-formed
     * @dev This example omits overflow/underflow checks for simplicity and readability.
     * In a production contract, proper range checks should be implemented.
     */
    function sub(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        euint32 encryptedValue = FHE.fromExternal(inputEuint32, inputProof);

        value = FHE.sub(value, encryptedValue);

        FHE.allowThis(value);
        FHE.allow(value, msg.sender);
    }

    /**
     * @notice Multiply the current value by an encrypted value
     * @param inputEuint32 Encrypted uint32 input
     * @param inputProof Proof that the encrypted value is well-formed
     * @dev This example omits overflow/underflow checks for simplicity and readability.
     * In a production contract, proper range checks should be implemented.
     */
    function mul(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        euint32 encryptedValue = FHE.fromExternal(inputEuint32, inputProof);

        value = FHE.mul(value, encryptedValue);

        FHE.allowThis(value);
        FHE.allow(value, msg.sender);
    }

    /**
     * @notice Divide the current value by a divisor
     * @param divisor The divisor
     */
    function div(uint32 divisor) external {
        value = FHE.div(value, divisor);

        FHE.allowThis(value);
        FHE.allow(value, msg.sender);
    }

    /**
     * @notice Modulo the current value by a divisor
     * @param divisor The divisor
     */
    function rem(uint32 divisor) external {
        value = FHE.rem(value, divisor);

        FHE.allowThis(value);
        FHE.allow(value, msg.sender);
    }

    /**
     * @notice Find the minimum of two encrypted values
     * @param inputEuint32 Encrypted uint32 input
     * @param inputProof Proof that the encrypted value is well-formed
     * @dev This example omits overflow/underflow checks for simplicity and readability.
     * In a production contract, proper range checks should be implemented.
     */
    function min(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        euint32 encryptedEuint32 = FHE.fromExternal(inputEuint32, inputProof);

        value = FHE.min(value, encryptedEuint32);

        FHE.allowThis(value);
        FHE.allow(value, msg.sender);
    }

    /**
     * @notice Find the maximum of two encrypted values
     * @param inputEuint32 Encrypted uint32 input
     * @param inputProof Proof that the encrypted value is well-formed
     * @dev This example omits overflow/underflow checks for simplicity and readability.
     * In a production contract, proper range checks should be implemented.
     */
    function max(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        euint32 encryptedEuint32 = FHE.fromExternal(inputEuint32, inputProof);

        value = FHE.max(value, encryptedEuint32);

        FHE.allowThis(value);
        FHE.allow(value, msg.sender);
    }
}
```
{% endcode %}
{% endtab %}
{% tab title="arithmetic.test.ts" %}
{% code title="arithmetic.test.ts" %}
```typescript
import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

import type { EncryptedArithmetic } from "@/types";


type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = await ethers.getContractFactory("EncryptedArithmetic");
  const contract = await factory.deploy();
  const address = await contract.getAddress();

  return { address, contract };
}

describe("EncryptedArithmetic", () => {
  let signers: Signers;
  let contract: EncryptedArithmetic;
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

  it("encrypted value should be uninitialized after deployment", async () => {
    const encValue = await contract.get();
    expect(encValue).to.eq(ethers.ZeroHash);
  });


  it("should add to the encrypted value", async () => {
    const encValueBeforeAdd = await contract.get();
    expect(encValueBeforeAdd).to.eq(ethers.ZeroHash);

    const clear10 = 10n;

    const encrypted10 = await fhevm
      .createEncryptedInput(address, signers.alice.address)
      .add32(clear10)
      .encrypt();

    const tx = await contract
      .connect(signers.alice)
      .add(encrypted10.handles[0], encrypted10.inputProof);
    await tx.wait();

    const encValueAfterAdd = await contract.get();
    const clearValueAfterAdd = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encValueAfterAdd,
      address,
      signers.alice,
    );

    expect(clearValueAfterAdd).to.eq(clear10);
  });


  it("should subtract from the encrypted value", async () => {
    const clear10 = 10n;

    await set(clear10);

    const clear5 = 5n;
    const encrypted5 = await fhevm
      .createEncryptedInput(address, signers.alice.address)
      .add32(clear5)
      .encrypt();

    const tx = await contract
      .connect(signers.alice)
      .sub(encrypted5.handles[0], encrypted5.inputProof);
    await tx.wait();

    const encValueAfterSub = await contract.get();
    const clearValueAfterSub = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encValueAfterSub,
      address,
      signers.alice,
    );

    expect(clearValueAfterSub).to.eq(clear10 - clear5);
  });


  it("should multiply the encrypted value", async () => {
    const clear2 = 2n;
    await set(clear2);

    const clear3 = 3n;
    const encrypted3 = await fhevm
      .createEncryptedInput(address, signers.alice.address)
      .add32(clear3)
      .encrypt();

    const tx = await contract
      .connect(signers.alice)
      .mul(encrypted3.handles[0], encrypted3.inputProof);
    await tx.wait();

    const encValueAfterMul = await contract.get();
    const clearValueAfterMul = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encValueAfterMul,
      address,
      signers.alice,
    );

    expect(clearValueAfterMul).to.eq(clear2 * clear3);
  });


  it("should divide the encrypted value", async () => {
    const clear10 = 10n;
    await set(clear10);

    const clear2 = 2n;

    const tx = await contract.connect(signers.alice).div(clear2);
    await tx.wait();

    const encValueAfterDiv = await contract.get();
    const clearValueAfterDiv = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encValueAfterDiv,
      address,
      signers.alice,
    );

    expect(clearValueAfterDiv).to.eq(clear10 / clear2);
  });


  it("should perform remainder operation", async () => {
    const clear10 = 10n;
    await set(clear10);

    const clear3 = 3n;

    const tx = await contract.connect(signers.alice).rem(clear3);
    await tx.wait();

    const encValueAfterRem = await contract.get();
    const clearValueAfterRem = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encValueAfterRem,
      address,
      signers.alice,
    );

    expect(clearValueAfterRem).to.eq(clear10 % clear3);
  });


  it("should perform minimum operation", async () => {
    const clear10 = 10;
    await set(clear10);

    const clear3 = 3;

    const encrypted3 = await fhevm
      .createEncryptedInput(address, signers.alice.address)
      .add32(clear3)
      .encrypt();

    const tx = await contract
      .connect(signers.alice)
      .min(encrypted3.handles[0], encrypted3.inputProof);
    await tx.wait();

    const encValueAfterMin = await contract.get();
    const clearValueAfterMin = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encValueAfterMin,
      address,
      signers.alice,
    );

    expect(clearValueAfterMin).to.eq(Math.min(clear10, clear3));
  });


  it("should perform maximum operation", async () => {
    const clear10 = 10;
    await set(clear10);

    const clear11 = 11;

    const encrypted11 = await fhevm
      .createEncryptedInput(address, signers.alice.address)
      .add32(clear11)
      .encrypt();

    const tx = await contract
      .connect(signers.alice)
      .max(encrypted11.handles[0], encrypted11.inputProof);
    await tx.wait();

    const encValueAfterMax = await contract.get();
    const clearValueAfterMax = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encValueAfterMax,
      address,
      signers.alice,
    );

    expect(clearValueAfterMax).to.eq(Math.max(clear10, clear11));
  });
});
```
{% endcode %}
{% endtab %}
{% endtabs %}

---

