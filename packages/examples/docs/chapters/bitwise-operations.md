---
title: Bitwise Operations
---

## Overview


Beyond simple arithmetic, FHEVM supports low-level bitwise manipulation of encrypted data.
This allows you to implement logic gates, flags, and complex cryptographic primitives (like hashing algorithms)
entirely on-chain without decrypting the data.

Supported operations include:
* **Logic:** AND (`&`), OR (`|`), XOR (`^`), NOT (`~`)
* **Shifts:** Left (`<<`), Right (`>>`)
* **Rotations:** Rotate Left (`rotl`), Rotate Right (`rotr`)

---

## Setup

Standard test setup. We ensure the environment is a valid Mock FHEVM instance.

```typescript
if (!fhevm.isMock) {
  console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
  this.skip();
}
({ contract, address } = await deployFixture());
```

---

## Logical Operators

These operators work exactly as they do in standard programming, but on encrypted bits.

* **AND (`&`):** Used for masking bits (e.g., extracting specific flags).
* **OR (`|`):** Used for setting specific bits.
* **XOR (`^`):** Used for toggling bits or simple encryption (One-Time Pad).

```typescript
const clear3 = 3n; // binary 0011

// Encrypt the operand
const encrypted3 = await fhevm
  .createEncryptedInput(address, signers.alice.address)
  .add32(clear3)
  .encrypt();

// Perform AND: 1010 & 0011 = 0010 (Decimal 2)
const tx = await contract
  .connect(signers.alice)
  .and(encrypted3.handles[0], encrypted3.inputProof);
await tx.wait();

// Verify Result
const encValueAfterAnd = await contract.get();
const clearValueAfterAnd = await fhevm.userDecryptEuint(
  FhevmType.euint32,
  encValueAfterAnd,
  address,
  signers.alice,
);

expect(clearValueAfterAnd).to.eq(clear10 & clear3);
```

```typescript
const clear3 = 3n; // binary 0011

// Encrypt operand
const encrypted3 = await fhevm
  .createEncryptedInput(address, signers.alice.address)
  .add32(clear3)
  .encrypt();

// Perform OR: 1010 | 0011 = 1011 (Decimal 11)
const tx = await contract
  .connect(signers.alice)
  .or(encrypted3.handles[0], encrypted3.inputProof);
await tx.wait();

// Verify Result
const encValueAfterOr = await contract.get();
const clearValueAfterOr = await fhevm.userDecryptEuint(
  FhevmType.euint32,
  encValueAfterOr,
  address,
  signers.alice,
);

expect(clearValueAfterOr).to.eq(clear10 | clear3);
```

```typescript
const clear3 = 3n; // binary 0011

// Encrypt operand
const encrypted3 = await fhevm
  .createEncryptedInput(address, signers.alice.address)
  .add32(clear3)
  .encrypt();

// Perform XOR: 1010 ^ 0011 = 1001 (Decimal 9)
const tx = await contract
  .connect(signers.alice)
  .xor(encrypted3.handles[0], encrypted3.inputProof);
await tx.wait();

// Verify Result
const encValueAfterXor = await contract.get();
const clearValueAfterXor = await fhevm.userDecryptEuint(
  FhevmType.euint32,
  encValueAfterXor,
  address,
  signers.alice,
);

expect(clearValueAfterXor).to.eq(clear10 ^ clear3);
```

---

## Bitwise NOT

The NOT operator inverts all bits.
**Note on Javascript:** JS handles bitwise NOT on signed 32-bit integers.
To get the correct unsigned 32-bit result in the test expectation, we use `>>> 0`.

```typescript
// Invert all bits of the encrypted state
const tx = await contract.connect(signers.alice).not();
await tx.wait();

const encValueAfterNot = await contract.get();
const clearValueAfterNot = await fhevm.userDecryptEuint(
  FhevmType.euint32,
  encValueAfterNot,
  address,
  signers.alice,
);

// Use zero-fill right shift to force unsigned 32-bit interpretation in JS
expect(clearValueAfterNot).to.eq(~clear >>> 0);
```

---

## Shifts (Left/Right)

Shifts move bits to the left or right, filling with zeros.

**Crucial Difference from Solidity:**
In FHEVM, the shift amount (second operand) is always computed **modulo the bit-width**.
* For `euint32`, the effective shift is `shiftAmount % 32`.
* In standard Solidity, `x >> 33` would result in `0`.
* In FHEVM, `x >> 33` is equivalent to `x >> 1`.

Also note that shift amounts are typically passed as `euint8` or `uint8` for efficiency.

```typescript
const clear3 = 3;

// Encrypt the shift amount (usually as euint8 for gas savings)
const encrypted3 = await fhevm
  .createEncryptedInput(address, signers.alice.address)
  .add8(clear3) // Note: add8
  .encrypt();

// Shift Left: 10 << 3 = 80
const tx = await contract
  .connect(signers.alice)
  .shl(encrypted3.handles[0], encrypted3.inputProof);
await tx.wait();

// Verify Result
const encValueAfterShl = await contract.get();
const clearValueAfterShl = await fhevm.userDecryptEuint(
  FhevmType.euint32,
  encValueAfterShl,
  address,
  signers.alice,
);

expect(clearValueAfterShl).to.eq(clear10 << clear3);
```

```typescript
const clear3 = 3;

// Encrypt shift amount
const encrypted3 = await fhevm
  .createEncryptedInput(address, signers.alice.address)
  .add8(clear3)
  .encrypt();

// Shift Right: 10 >> 3 = 1
const tx = await contract
  .connect(signers.alice)
  .shr(encrypted3.handles[0], encrypted3.inputProof);
await tx.wait();

// Verify Result
const encValueAfterShr = await contract.get();
const clearValueAfterShr = await fhevm.userDecryptEuint(
  FhevmType.euint32,
  encValueAfterShr,
  address,
  signers.alice,
);

expect(clearValueAfterShr).to.eq(clear10 >> clear3);
```

---

## Rotations

Rotations (`rotl`, `rotr`) are similar to shifts, but bits that "fall off" one end reappear on the other.
This is critical for many hashing algorithms (like SHA-256) and cryptography.

Like shifts, the rotation amount is taken **modulo the bit-width** (modulo 32 for euint32).

```typescript
const rotateBy = 3;

const encryptedRotateBy = await fhevm
  .createEncryptedInput(address, signers.alice.address)
  .add8(rotateBy)
  .encrypt();

const tx = await contract
  .connect(signers.alice)
  .rotl(encryptedRotateBy.handles[0], encryptedRotateBy.inputProof);

await tx.wait();

// Verify Result
const encryptedResult = await contract.get();
const clearResult = await fhevm.userDecryptEuint(
  FhevmType.euint32,
  encryptedResult,
  address,
  signers.alice,
);

const expected = rotl32(clearValue, rotateBy);
expect(clearResult).to.eq(expected);
```

```typescript
const rotateBy = 3;

const encryptedRotateBy = await fhevm
  .createEncryptedInput(address, signers.alice.address)
  .add8(rotateBy)
  .encrypt();

const tx = await contract
  .connect(signers.alice)
  .rotr(encryptedRotateBy.handles[0], encryptedRotateBy.inputProof);

await tx.wait();

// Verify Result
const encryptedResult = await contract.get();
const clearResult = await fhevm.userDecryptEuint(
  FhevmType.euint32,
  encryptedResult,
  address,
  signers.alice,
);

const expected = rotr32(clearValue, rotateBy);
expect(clearResult).to.eq(expected);
```

---

