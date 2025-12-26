---
title: Comparison Logic
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

---

