---
title: Encrypted Counter
---

## Overview


# Introduction
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

---

