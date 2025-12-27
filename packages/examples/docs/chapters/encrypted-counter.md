---
title: Encrypted Counter
---

## Overview


This guide demonstrates the fundamental lifecycle of a Fully Homomorphic Encryption (FHE) application.
unlike standard blockchains where state is public, FHEVM contracts operate on **encrypted data**.

In this example, we will:
1. **Deploy** a counter contract containing a `euint32` state variable.
2. **Encrypt** an integer client-side to create a secure input.
3. **Modify** the state on-chain without ever revealing the value.
4. **Decrypt** the result to verify the operation was successful.

---

## Environment Setup

Before running FHE tests, we must ensure we are in a supported environment.
When running locally, we use the `fhevm` mock mode to simulate encryption without the heavy computational overhead.

```typescript
// Check whether the tests are running against an FHEVM mock environment
if (!fhevm.isMock) {
  console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
  this.skip();
}
```

---

## Initial State

In Solidity, an uninitialized `uint32` is `0`. However, an uninitialized `euint32` (encrypted integer)
is represented by a specific null value.

When we query `getCount()`, we receive an **encrypted handle** (a hash), not the number `0`.
If the variable has never been written to, this handle will be `ethers.ZeroHash`.

```typescript
const encryptedCount = await fheCounterContract.getCount();

// Expect initial count to be bytes32(0)
expect(encryptedCount).to.eq(ethers.ZeroHash);
```

---

## The Encryption Lifecycle

This is the most critical part of FHE development. To increment the counter, Alice cannot simply send `1`.
She must provide an **Encrypted Input** and a **Validity Proof**.

### Step 1: Create Encrypted Input
We use the `fhevm.createEncryptedInput` helper. This generates a ciphertext that only the specific contract
at `contractAddress` can decrypt and process.

```typescript
const clearOne = 1;

// Encrypt constant 1 as a euint32 for the specific contract
const encryptedOne = await fhevm
  .createEncryptedInput(fheCounterContractAddress, signers.alice.address)
  .add32(clearOne)
  .encrypt();
```

### Step 2: Execute Transaction
We pass two things to the contract:
* `handles[0]`: A reference to the encrypted value.
* `inputProof`: A Zero-Knowledge proof verifying that the encryption is well-formed (preventing malleability attacks).

```typescript
const tx = await fheCounterContract
  .connect(signers.alice)
  .increment(encryptedOne.handles[0], encryptedOne.inputProof);
await tx.wait();
```

### Step 3: Decryption
The contract state has changed, but it is still encrypted! To read it, we must **re-encrypt** the result
with a key that Alice controls.

The `userDecryptEuint` function handles this handshake:
1. It fetches the current encrypted state.
2. It authenticates Alice (using her signer).
3. It returns the decrypted plaintext value.

```typescript
const encryptedCountAfterInc = await fheCounterContract.getCount();

const clearCountAfterInc = await fhevm.userDecryptEuint(
  FhevmType.euint32, // The expected type
  encryptedCountAfterInc, // The encrypted handle
  fheCounterContractAddress, // The contract source
  signers.alice, // The user requesting access
);

expect(clearCountAfterInc).to.eq(clearCountBeforeInc + clearOne);
```

---

## Complex Operations

The same pattern applies to all operations. Here we demonstrate decrementing,
confirming that the encrypted arithmetic holds true across multiple transactions.

```typescript
const clearOne = 1;
const encryptedOne = await fhevm
  .createEncryptedInput(fheCounterContractAddress, signers.alice.address)
  .add32(clearOne)
  .encrypt();

// Increment ...
let tx = await fheCounterContract
  .connect(signers.alice)
  .increment(encryptedOne.handles[0], encryptedOne.inputProof);
await tx.wait();

// Then decrement
tx = await fheCounterContract
  .connect(signers.alice)
  .decrement(encryptedOne.handles[0], encryptedOne.inputProof);
await tx.wait();

// Verify result is back to 0
const encryptedCountAfterDec = await fheCounterContract.getCount();
const result = await fhevm.userDecryptEuint(
  FhevmType.euint32,
  encryptedCountAfterDec,
  fheCounterContractAddress,
  signers.alice,
);

expect(result).to.eq(0);
```

{% tabs %}
{% tab title="Counter.sol" %}
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Counter
/// @notice A very basic example contract showing how to work with encrypted data using FHEVM.
contract FHECounter is ZamaEthereumConfig {
    euint32 private _count;

    /// @notice Returns the current count
    /// @return _count The current encrypted count
    function getCount() external view returns (euint32) {
        return _count;
    }

    /// @notice Increments the counter by a specified encrypted value.
    /// @param inputEuint32 the encrypted input value
    /// @param inputProof the input proof
    /// @dev This example omits overflow/underflow checks for simplicity and readability.
    /// In a production contract, proper range checks should be implemented.
    function increment(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        euint32 encryptedEuint32 = FHE.fromExternal(inputEuint32, inputProof);

        _count = FHE.add(_count, encryptedEuint32);

        FHE.allowThis(_count);
        FHE.allow(_count, msg.sender);
    }

    /// @notice Decrements the counter by a specified encrypted value.
    /// @param inputEuint32 the encrypted input value
    /// @param inputProof the input proof
    /// @dev This example omits overflow/underflow checks for simplicity and readability.
    /// In a production contract, proper range checks should be implemented.
    function decrement(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        euint32 encryptedEuint32 = FHE.fromExternal(inputEuint32, inputProof);

        _count = FHE.sub(_count, encryptedEuint32);

        FHE.allowThis(_count);
        FHE.allow(_count, msg.sender);
    }
}
```
{% endtab %}
{% tab title="counter.test.ts" %}
```typescript
import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

import type { FHECounter, FHECounter__factory } from "@/types";


type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory(
    "FHECounter",
  )) as FHECounter__factory;
  const fheCounterContract = (await factory.deploy()) as FHECounter;
  const fheCounterContractAddress = await fheCounterContract.getAddress();

  return { fheCounterContract, fheCounterContractAddress };
}

describe("FHECounter", () => {
  let signers: Signers;
  let fheCounterContract: FHECounter;
  let fheCounterContractAddress: string;

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

    ({ fheCounterContract, fheCounterContractAddress } = await deployFixture());
  });


  it("encrypted count should be uninitialized after deployment", async () => {
    const encryptedCount = await fheCounterContract.getCount();

    expect(encryptedCount).to.eq(ethers.ZeroHash);
  });


  it("increment the counter by 1", async () => {
    const encryptedCountBeforeInc = await fheCounterContract.getCount();
    expect(encryptedCountBeforeInc).to.eq(ethers.ZeroHash);
    const clearCountBeforeInc = 0;

    const clearOne = 1;

    const encryptedOne = await fhevm
      .createEncryptedInput(fheCounterContractAddress, signers.alice.address)
      .add32(clearOne)
      .encrypt();


    const tx = await fheCounterContract
      .connect(signers.alice)
      .increment(encryptedOne.handles[0], encryptedOne.inputProof);
    await tx.wait();


    const encryptedCountAfterInc = await fheCounterContract.getCount();

    const clearCountAfterInc = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedCountAfterInc,
      fheCounterContractAddress,
      signers.alice,
    );

    expect(clearCountAfterInc).to.eq(clearCountBeforeInc + clearOne);
  });


  it("decrement the counter by 1", async () => {
    const clearOne = 1;
    const encryptedOne = await fhevm
      .createEncryptedInput(fheCounterContractAddress, signers.alice.address)
      .add32(clearOne)
      .encrypt();

    let tx = await fheCounterContract
      .connect(signers.alice)
      .increment(encryptedOne.handles[0], encryptedOne.inputProof);
    await tx.wait();

    tx = await fheCounterContract
      .connect(signers.alice)
      .decrement(encryptedOne.handles[0], encryptedOne.inputProof);
    await tx.wait();

    const encryptedCountAfterDec = await fheCounterContract.getCount();
    const result = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedCountAfterDec,
      fheCounterContractAddress,
      signers.alice,
    );

    expect(result).to.eq(0);
  });
});
```
{% endtab %}
{% endtabs %}

---

