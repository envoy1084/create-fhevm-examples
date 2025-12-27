---
title: Reorg Protection
---

## Overview


Blockchains are not instantaneous state machines; they are eventually consistent.
A transaction included in the latest block can be "reorged out" if a competing chain tip becomes heavier.

## The Attack Vector

Imagine a contract selling a Bitcoin Private Key for 10 ETH:
1. Attacker sends 10 ETH.
2. Contract immediately grants ACL permission.
3. Attacker decrypts the key locally.
4. A reorg occurs (e.g., 2 blocks deep). The 10 ETH transaction is dropped.
5. **Result:** Attacker has the key, but kept their ETH.

## The Solution: Two-Step Timelock

For high-value encrypted data, you must enforce a delay (typically 95 blocks on Ethereum) between
the **Purchase** (Commitment) and the **Access Grant** (Reveal).

---

## Setup

We verify we are on the Mock network and initialize the contract with a "Secret Private Key"
that Bob wants to buy.

```typescript
if (!fhevm.isMock) {
  console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
  this.skip();
}
({ contract, address } = await deployFixture());
({ privateKey } = await initializePrivateKey());
```

---

## Step 1: The Purchase

Bob sends the ETH to buy the key.

**Crucially**, the contract does *not* grant him access yet.
It only records:
1. `isBought = true`
2. `buyer = Bob`
3. `blockWhenBought = block.number`

```typescript
// Bob pays the price
const tx = await contract
  .connect(signers.bob)
  .buyPrivateKey({ value: price });
await tx.wait();
```

---

## Step 2: The Lock Period

If Bob tries to request access immediately after buying, the contract must reject it.
The contract enforces: `block.number > blockWhenBought + 95`.

```typescript
// Bob tries to call requestACL immediately
// This MUST fail to protect against reorgs
await expect(contract.connect(signers.bob).requestACL()).to.be.rejected;
```

---

## Step 3: Finalization

Once enough blocks have passed (simulated here using `hardhat_mine`), the transaction
is considered final. It is now safe to grant Bob access.

The `requestACL` function will finally call `FHE.allow(privateKey, buyer)`.

```typescript
// Advance the chain by 100 blocks (0x64 hex)
// ensuring we are past the 95 block threshold
await network.provider.send("hardhat_mine", ["0x64"]);

// 2. Request Access (Now successful)
await contract.connect(signers.bob).requestACL();
```

---

