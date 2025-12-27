import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { ethers, fhevm } from "hardhat";

chai.use(chaiAsPromised);
const { expect } = chai;

import type { Decryption } from "@/types";

/// @chapter: decryption-patterns "Decryption Patterns"
/// @priority: 8
///
/// FHE is "Encryption in Use," meaning the contract computes on data it cannot see.
/// Eventually, however, someone needs to see the result.
///
/// There are two main ways to decrypt data in FHEVM:
///
/// 1. **User Decryption (Re-encryption):**
///    The data remains encrypted on-chain. To view it, a user requests a "re-encryption" to their own public key.
///    This is secure and private. Only `allowed` users can do this.
///
/// 2. **Public Decryption:**
///    The contract explicitly decides to reveal the secret. The validators decrypt the value, and it becomes
///    visible to everyone (and can be used in standard Solidity logic).

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

  /// @section: "Setup"
  /// Standard setup.

  beforeEach(async function () {
    // @start: setup
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }
    ({ contract, address } = await deployFixture());
    // @end: setup
  });

  /// @section: "User Decryption (Private)"
  /// This is the standard pattern for private state (e.g., wallet balances, private votes).
  ///
  /// **Mechanism:**
  /// 1. Contract calls `FHE.allow(value, user)`.
  /// 2. User calls `fhevm.userDecrypt` (off-chain).
  /// 3. The node re-encrypts the ciphertext using the user's public key.
  /// 4. The user decrypts the result locally.
  ///
  /// **Key Security Property:** The data is NEVER revealed on-chain. It stays encrypted.

  it("should allow user decryption for value setter", async () => {
    // @start: user-decrypt
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
    // @end: user-decrypt
  });

  /// @section: "Access Control Check"
  /// We verify that even if Bob holds the ciphertext handle (which is public on the blockchain),
  /// he cannot decrypt it because the contract never called `FHE.allow(value, bob)`.

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

    // @start: verify-denial
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
    // @end: verify-denial
  });

  /// @section: "Public Decryption (Global Reveal)"
  /// Sometimes a contract needs to make a secret public (e.g., announcing the winner of a lottery).
  ///
  /// **Mechanism:**
  /// 1. Contract calls `FHE.makePubliclyDecryptable(value)`.
  /// 2. Anyone can now query the value.
  ///
  /// **Note:** This does *not* automatically turn the `euint32` into a `uint32` on-chain.
  /// It simply flags the ciphertext as "safe to decrypt by anyone off-chain".

  it("should allow anyone to publicly decrypt value", async () => {
    const clearValue = 10;
    const encryptedValue = await fhevm
      .createEncryptedInput(address, signers.alice.address)
      .add32(clearValue)
      .encrypt();

    // @start: public-decrypt-flag
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
    // @end: public-decrypt-flag
  });

  /// @section: "On-Chain Verification"
  /// To convert an encrypted value into a standard Solidity integer (`uint32`) that other contracts can use,
  /// we need to prove that the network actually decrypted it.
  ///
  /// **The Flow:**
  /// 1. **Request:** We get the ciphertext handle.
  /// 2. **Decrypt (Off-chain):** We ask the node/KMS to decrypt it and sign the result.
  /// 3. **Verify (On-chain):** We send the result + signature back to the contract.
  /// 4. **Check:** The contract calls `FHE.checkSignatures`. If valid, it trusts the plain `uint32`.

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

    // @start: verification-flow
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
    // @end: verification-flow
  });
});

/// @include: "Decryption.sol" { "group": "decryption", "tabTitle": "Decryption.sol" }
/// @include: "decryption.test.ts" { "group": "decryption", "tabTitle": "decryption.test.ts", "strip": true }
