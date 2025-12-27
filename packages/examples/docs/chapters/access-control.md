---
title: Access Control (ACL)
---

## Overview


In FHEVM, simply "holding" the encrypted data (the hash handle) does not mean you can read it.
To decrypt a value, the user must:
1. Request a **Re-encryption** from the network.
2. Sign the request with their private key.
3. **(Critical)** Have their address listed in the ciphertext's Access Control List (ACL).

If the contract has not called `FHE.allow(value, user)`, the re-encryption will fail,
ensuring total privacy even against the data owner if desired.

---

## Setup

We deploy two contracts here. `AccessControl` is the main contract holding the state,
and `AccessControlB` is a secondary contract used to demonstrate passing encrypted data
between contracts securely.

```typescript
if (!fhevm.isMock) {
  console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
  this.skip();
}
({ contract, address } = await deployFixture());
```

---

## Default Privacy (Deny by Default)

By default, when a contract creates or stores a ciphertext (e.g., using `FHE.allowThis(value)`),
**no external user** has access to it. Not even the user who sent the transaction.

In this test, Alice sets a value of `10`. However, the contract only grants access to *itself*.
When Alice tries to decrypt it, the operation fails (rejects).

```typescript
const encryptedValue = await contract.value();

// Alice attempts to decrypt, but she hasn't been allowed yet.
// This promise should reject.
await expect(
  fhevm.userDecryptEuint(
    FhevmType.euint32,
    encryptedValue,
    address,
    signers.alice,
  ),
).to.be.rejected;
```

---

## Granting Access

To allow a user to view the data, the contract must explicitly call `FHE.allow(value, user)`.
This modifies the on-chain ACL for that specific ciphertext handle.

Once allowed, the user can successfully request a re-encryption.

```typescript
const encryptedValue = await contract.value();

// Contract calls `FHE.allow(value, alice)`
await contract.connect(signers.alice).allowUser(signers.alice.address);

// Now decryption succeeds
const clearValue = await fhevm.userDecryptEuint(
  FhevmType.euint32,
  encryptedValue,
  address,
  signers.alice,
);

expect(clearValue).to.eq(10);
```

---

## Batch Allowances (Method Chaining)

Since FHE operations are gas-intensive, it is efficient to grant permissions to multiple users
in a single transaction. The FHEVM library supports **Method Chaining** for this purpose.

Syntax: `value.allow(user1).allow(user2)`

This allows us to share a secret with Alice and Bob simultaneously.

```typescript
// Grant access to both Alice and Bob in one tx
await contract
  .connect(signers.alice)
  .chainAllow(signers.alice.address, signers.bob.address);

// Alice can decrypt
await expect(
  fhevm.userDecryptEuint(
    FhevmType.euint32,
    encryptedValue,
    address,
    signers.alice,
  ),
).to.eventually.equal(10);

// Bob can also decrypt
const clearValueBob = await fhevm.userDecryptEuint(
  FhevmType.euint32,
  encryptedValue,
  address,
  signers.bob,
);
expect(clearValueBob).to.eq(10);
```

---

## Transient Allowance (Composability)

Sometimes you need to pass encrypted data to another contract just for a calculation,
without giving that contract permanent access to view the data forever.

**`FHE.allowTransient(value, contract)`**
This grants permission **only for the duration of the transaction**.

**The Scenario:**
1. `AccessControl` creates a value.
2. It wants `AccessControlB` to double that value.
3. It grants **Transient Access** to Contract B.
4. Contract B reads the value, doubles it, and returns the result.
5. Once the transaction ends, Contract B loses access to the original input.

```typescript
const clear5 = 5n;
const encrypted5 = await fhevm
  .createEncryptedInput(address, signers.alice.address)
  .add32(clear5)
  .encrypt();

// This function calls `FHE.allowTransient(val, contractB)` internally
const tx = await contract
  .connect(signers.alice)
  .passToAnotherFunction(encrypted5.handles[0], encrypted5.inputProof);

await tx.wait();
```

---

