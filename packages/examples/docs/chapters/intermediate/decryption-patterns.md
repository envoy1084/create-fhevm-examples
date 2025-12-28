---
title: "Decryption Patterns"
---

## Overview


FHE is "Encryption in Use," meaning the contract computes on data it cannot see.
Eventually, however, someone needs to see the result.

There are two main ways to decrypt data in FHEVM:

1. **User Decryption (Re-encryption):**
   The data remains encrypted on-chain. To view it, a user requests a "re-encryption" to their own public key.
   This is secure and private. Only `allowed` users can do this.

2. **Public Decryption:**
   The contract explicitly decides to reveal the secret. The validators decrypt the value, and it becomes
   visible to everyone (and can be used in standard Solidity logic).

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

## User Decryption (Private)

This is the standard pattern for private state (e.g., wallet balances, private votes).

**Mechanism:**
1. Contract calls `FHE.allow(value, user)`.
2. User calls `fhevm.userDecrypt` (off-chain).
3. The node re-encrypts the ciphertext using the user's public key.
4. The user decrypts the result locally.

**Key Security Property:** The data is NEVER revealed on-chain. It stays encrypted.

```typescript
const clearValue = 10;

// 1. Create Input
const encryptedValue = await fhevm
  .createEncryptedInput(address, signers.alice.address)
  .add32(clearValue)
  .encrypt();

// 2. Send to Contract (which calls FHE.allow(value, msg.sender))
const tx = await contract
  .connect(signers.alice)
  .userDecrypt(encryptedValue.handles[0], encryptedValue.inputProof);
await tx.wait();

// 3. User Decrypts (Success)
const encValueAfter = await contract.value();
const clearValueAfter = await fhevm.userDecryptEuint(
  FhevmType.euint32,
  encValueAfter,
  address,
  signers.alice,
);

expect(clearValueAfter).to.eq(clearValue);
```

---

## Access Control Check

We verify that even if Bob holds the ciphertext handle (which is public on the blockchain),
he cannot decrypt it because the contract never called `FHE.allow(value, bob)`.

```typescript
const encValueAfter = await contract.value();

// Bob attempts to decrypt Alice's value -> REJECTED
await expect(
  fhevm.userDecryptEuint(
    FhevmType.euint32,
    encValueAfter,
    address,
    signers.bob,
  ),
).to.be.rejected;
```

---

## Public Decryption (Global Reveal)

Sometimes a contract needs to make a secret public (e.g., announcing the winner of a lottery).

**Mechanism:**
1. Contract calls `FHE.makePubliclyDecryptable(value)`.
2. Anyone can now query the value.

**Note:** This does *not* automatically turn the `euint32` into a `uint32` on-chain.
It simply flags the ciphertext as "safe to decrypt by anyone off-chain".

```typescript
// Contract calls FHE.makePubliclyDecryptable()
const tx = await contract
  .connect(signers.alice)
  .publicDecrypt(encryptedValue.handles[0], encryptedValue.inputProof);
await tx.wait();

// Now anyone (even without a signature) can decrypt it
const encValueAfter = await contract.value();
const clearValueAfter = await fhevm.publicDecryptEuint(
  FhevmType.euint32,
  encValueAfter,
);

expect(clearValueAfter).to.eq(clearValue);
```

---

## On-Chain Verification

To convert an encrypted value into a standard Solidity integer (`uint32`) that other contracts can use,
we need to prove that the network actually decrypted it.

**The Flow:**
1. **Request:** We get the ciphertext handle.
2. **Decrypt (Off-chain):** We ask the node/KMS to decrypt it and sign the result.
3. **Verify (On-chain):** We send the result + signature back to the contract.
4. **Check:** The contract calls `FHE.checkSignatures`. If valid, it trusts the plain `uint32`.

```typescript
const envValueAfter = await contract.value();

// 1. Get the Decryption Proof from the Node
// (In production, this comes from the Gateway or Oracle)
const publicDecryptResults = await fhevm.publicDecrypt([envValueAfter]);

const result = publicDecryptResults.abiEncodedClearValues;
const proof = publicDecryptResults.decryptionProof;

// 2. Submit Proof to Contract
// The contract calls FHE.checkSignatures(cts, result, proof)
const tx2 = await contract
  .connect(signers.alice)
  .verifyPublicDecryption(result, proof);
await tx2.wait();

// 3. Verify state change
// The contract has successfully updated its public `uint32` state
const publicValue = await contract.publicValue();
expect(publicValue).to.eq(clearValue);
```

{% tabs %}
{% tab title="Decryption.sol" %}
{% code title="Decryption.sol" %}
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract Decryption is ZamaEthereumConfig {
    euint32 public value;
    uint32 public publicValue;

    function userDecrypt(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        euint32 encryptedValue = FHE.fromExternal(inputEuint32, inputProof);

        value = encryptedValue;

        FHE.allowThis(value);
        FHE.allow(value, msg.sender);
    }

    function publicDecrypt(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        euint32 encryptedValue = FHE.fromExternal(inputEuint32, inputProof);

        value = encryptedValue;

        FHE.makePubliclyDecryptable(value);
    }

    function verifyPublicDecryption(bytes memory result, bytes memory proof) external {
        bytes32[] memory cts = new bytes32[](1);
        cts[0] = FHE.toBytes32(value);

        FHE.checkSignatures(cts, result, proof);

        uint32 decodedResult = abi.decode(result, (uint32));

        publicValue = decodedResult;
    }
}
```
{% endcode %}
{% endtab %}
{% tab title="decryption.test.ts" %}
{% code title="decryption.test.ts" %}
```typescript
import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { ethers, fhevm } from "hardhat";

chai.use(chaiAsPromised);
const { expect } = chai;

import type { Decryption } from "@/types";


type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = await ethers.getContractFactory("Decryption");
  const contract = await factory.deploy();
  const address = await contract.getAddress();

  return { address, contract };
}

describe("Decryption Patterns", () => {
  let signers: Signers;
  let contract: Decryption;
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


  it("should allow user decryption for value setter", async () => {
    const clearValue = 10;

    const encryptedValue = await fhevm
      .createEncryptedInput(address, signers.alice.address)
      .add32(clearValue)
      .encrypt();

    const tx = await contract
      .connect(signers.alice)
      .userDecrypt(encryptedValue.handles[0], encryptedValue.inputProof);
    await tx.wait();

    const encValueAfter = await contract.value();
    const clearValueAfter = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encValueAfter,
      address,
      signers.alice,
    );

    expect(clearValueAfter).to.eq(clearValue);
  });


  it("should not allow user decryption for other users", async () => {
    const clearValue = 10;
    const encryptedValue = await fhevm
      .createEncryptedInput(address, signers.alice.address)
      .add32(clearValue)
      .encrypt();

    const tx = await contract
      .connect(signers.alice)
      .userDecrypt(encryptedValue.handles[0], encryptedValue.inputProof);
    await tx.wait();

    const encValueAfter = await contract.value();

    await expect(
      fhevm.userDecryptEuint(
        FhevmType.euint32,
        encValueAfter,
        address,
        signers.bob,
      ),
    ).to.be.rejected;
  });


  it("should allow anyone to publicly decrypt value", async () => {
    const clearValue = 10;
    const encryptedValue = await fhevm
      .createEncryptedInput(address, signers.alice.address)
      .add32(clearValue)
      .encrypt();

    const tx = await contract
      .connect(signers.alice)
      .publicDecrypt(encryptedValue.handles[0], encryptedValue.inputProof);
    await tx.wait();

    const encValueAfter = await contract.value();
    const clearValueAfter = await fhevm.publicDecryptEuint(
      FhevmType.euint32,
      encValueAfter,
    );

    expect(clearValueAfter).to.eq(clearValue);
  });


  it("should verify public decryption", async () => {
    const clearValue = 10;
    const encryptedValue = await fhevm
      .createEncryptedInput(address, signers.alice.address)
      .add32(clearValue)
      .encrypt();

    const tx = await contract
      .connect(signers.alice)
      .publicDecrypt(encryptedValue.handles[0], encryptedValue.inputProof);
    await tx.wait();

    const envValueAfter = await contract.value();

    const publicDecryptResults = await fhevm.publicDecrypt([envValueAfter]);

    const result = publicDecryptResults.abiEncodedClearValues;
    const proof = publicDecryptResults.decryptionProof;

    const tx2 = await contract
      .connect(signers.alice)
      .verifyPublicDecryption(result, proof);
    await tx2.wait();

    const publicValue = await contract.publicValue();
    expect(publicValue).to.eq(clearValue);
  });
});
```
{% endcode %}
{% endtab %}
{% endtabs %}

---

