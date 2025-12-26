---
title: Encrypted Arithmetic
---

## Overview


# Introduction
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

---

