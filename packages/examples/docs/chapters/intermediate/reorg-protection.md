---
title: "Reorg Protection"
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

{% tabs %}
{% tab title="Reorgs.sol" %}
{% code title="Reorgs.sol" %}
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint256, externalEuint256} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract ReorgHandling is ZamaEthereumConfig {
    euint256 public privateKey;
    uint256 public price;

    bool isPrivateKeyInitialized;

    bool isBought;
    address buyer;
    uint256 blockWhenBought;

    error NotEnoughEther();
    error AlreadyBought();
    error NotBoughtYet();
    error NotEnoughTimePassed();
    error PrivateKeyAlreadyInitialized();

    constructor() {}

    function setPrivateKey(externalEuint256 _privateKey, bytes memory inputProof, uint256 _price) external {
        if (isPrivateKeyInitialized) {
            revert PrivateKeyAlreadyInitialized();
        }

        price = _price;
        privateKey = FHE.fromExternal(_privateKey, inputProof);
        FHE.allowThis(privateKey);

        isPrivateKeyInitialized = true;
    }

    function buyPrivateKey() external payable {
        if (msg.value < price) {
            revert NotEnoughEther();
        }

        if (isBought) {
            revert AlreadyBought();
        }

        isBought = true;
        blockWhenBought = block.number;
        buyer = msg.sender;
    }

    function requestACL() external {
        if (!isBought) {
            revert NotBoughtYet();
        }

        if (block.number <= blockWhenBought + 95) {
            revert NotEnoughTimePassed();
        }

        FHE.allow(privateKey, buyer);
    }
}
```
{% endcode %}
{% endtab %}
{% tab title="reorgs.test.ts" %}
{% code title="reorgs.test.ts" %}
```typescript
import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { parseEther, toBigInt } from "ethers";
import { ethers, fhevm, network } from "hardhat";

chai.use(chaiAsPromised);
const { expect } = chai;

import type { ReorgHandling } from "@/types";


type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = await ethers.getContractFactory("ReorgHandling");
  const contract = await factory.deploy();
  const address = await contract.getAddress();

  return { address, contract };
}

describe("Reorg Protection", () => {
  let signers: Signers;
  let contract: ReorgHandling;
  let address: string;
  let privateKey: bigint;

  before(async () => {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      alice: ethSigners[1],
      bob: ethSigners[2],
      deployer: ethSigners[0],
    };
  });

  const initializePrivateKey = async () => {
    const pk = toBigInt(ethers.Wallet.createRandom().privateKey);

    const encPk = await fhevm
      .createEncryptedInput(address, signers.alice.address)
      .add256(pk)
      .encrypt();

    const price = parseEther("0.01");
    const tx = await contract
      .connect(signers.alice)
      .setPrivateKey(encPk.handles[0], encPk.inputProof, price);

    await tx.wait();

    return { privateKey: pk };
  };


  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }
    ({ contract, address } = await deployFixture());
    ({ privateKey } = await initializePrivateKey());
  });


  it("should allow bob to buy private key", async () => {
    const price = parseEther("0.01");
    const bobBalanceBefore = await ethers.provider.getBalance(
      signers.bob.address,
    );

    const tx = await contract
      .connect(signers.bob)
      .buyPrivateKey({ value: price });
    await tx.wait();

    const bobBalanceAfter = await ethers.provider.getBalance(
      signers.bob.address,
    );
    expect(bobBalanceAfter).to.lessThanOrEqual(bobBalanceBefore - price);
  });


  it("should not allow bob to decrypt private key before time", async () => {
    const price = parseEther("0.01");

    const tx = await contract
      .connect(signers.bob)
      .buyPrivateKey({ value: price });
    await tx.wait();

    await expect(contract.connect(signers.bob).requestACL()).to.be.rejected;
  });


  it("should allow bob to decrypt private key after time", async () => {
    const price = parseEther("0.01");

    const tx = await contract
      .connect(signers.bob)
      .buyPrivateKey({ value: price });
    await tx.wait();

    await network.provider.send("hardhat_mine", ["0x64"]);

    await contract.connect(signers.bob).requestACL();

    const encPk = await contract.privateKey();
    const pk = await fhevm.userDecryptEuint(
      FhevmType.euint256,
      encPk,
      address,
      signers.bob,
    );

    expect(pk).to.eq(privateKey);
  });
});
```
{% endcode %}
{% endtab %}
{% endtabs %}

---

