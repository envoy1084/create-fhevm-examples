import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { ethers, fhevm } from "hardhat";

chai.use(chaiAsPromised);
const { expect } = chai;

import type { AccessControl } from "@/types";

/// @chapter: access-control "Access Control (ACL)"
///
/// In FHEVM, simply "holding" the encrypted data (the hash handle) does not mean you can read it.
/// To decrypt a value, the user must:
/// 1. Request a **Re-encryption** from the network.
/// 2. Sign the request with their private key.
/// 3. **(Critical)** Have their address listed in the ciphertext's Access Control List (ACL).
///
/// If the contract has not called `FHE.allow(value, user)`, the re-encryption will fail,
/// ensuring total privacy even against the data owner if desired.

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory2 = await ethers.getContractFactory("AccessControlB");
  const contract2 = await factory2.deploy();
  const address2 = await contract2.getAddress();

  const factory = await ethers.getContractFactory("AccessControl");
  const contract = await factory.deploy(address2);
  const address = await contract.getAddress();

  return { address, address2, contract, contract2 };
}

describe("Access Control", () => {
  let signers: Signers;
  let contract: AccessControl;
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
  /// We deploy two contracts here. `AccessControl` is the main contract holding the state,
  /// and `AccessControlB` is a secondary contract used to demonstrate passing encrypted data
  /// between contracts securely.

  beforeEach(async function () {
    // @start: setup
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }
    ({ contract, address } = await deployFixture());
    // @end: setup
  });

  const setWithContractACL = async (value: bigint | number) => {
    const encryptedValue = await fhevm
      .createEncryptedInput(address, signers.alice.address)
      .add32(BigInt(value))
      .encrypt();

    const tx = await contract
      .connect(signers.alice)
      .setWithContractACL(encryptedValue.handles[0], encryptedValue.inputProof);

    await tx.wait();
  };

  /// @section: "Default Privacy (Deny by Default)"
  /// By default, when a contract creates or stores a ciphertext (e.g., using `FHE.allowThis(value)`),
  /// **no external user** has access to it. Not even the user who sent the transaction.
  ///
  /// In this test, Alice sets a value of `10`. However, the contract only grants access to *itself*.
  /// When Alice tries to decrypt it, the operation fails (rejects).

  it("should not allow alice to read value", async () => {
    // Alice sets the value to 10
    await setWithContractACL(10);

    // @start: deny-by-default
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
    // @end: deny-by-default
  });

  /// @section: "Granting Access"
  /// To allow a user to view the data, the contract must explicitly call `FHE.allow(value, user)`.
  /// This modifies the on-chain ACL for that specific ciphertext handle.
  ///
  /// Once allowed, the user can successfully request a re-encryption.

  it('should allow alice to read value after "allowUser"', async () => {
    await setWithContractACL(10);

    // @start: allow-user
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
    // @end: allow-user
  });

  /// @section: "Batch Allowances (Method Chaining)"
  /// Since FHE operations are gas-intensive, it is efficient to grant permissions to multiple users
  /// in a single transaction. The FHEVM library supports **Method Chaining** for this purpose.
  ///
  /// Syntax: `value.allow(user1).allow(user2)`
  ///
  /// This allows us to share a secret with Alice and Bob simultaneously.

  it('should allow alice and bob to read value after "chainAllow"', async () => {
    await setWithContractACL(10);
    const encryptedValue = await contract.value();

    // @start: chain-allow
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
    // @end: chain-allow
  });

  /// @section: "Transient Allowance (Composability)"
  /// Sometimes you need to pass encrypted data to another contract just for a calculation,
  /// without giving that contract permanent access to view the data forever.
  ///
  /// **`FHE.allowTransient(value, contract)`**
  /// This grants permission **only for the duration of the transaction**.
  ///
  /// **The Scenario:**
  /// 1. `AccessControl` creates a value.
  /// 2. It wants `AccessControlB` to double that value.
  /// 3. It grants **Transient Access** to Contract B.
  /// 4. Contract B reads the value, doubles it, and returns the result.
  /// 5. Once the transaction ends, Contract B loses access to the original input.

  it("should allow passing to contracts using allowTransient", async () => {
    await setWithContractACL(10);

    // @start: transient-allow
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
    // @end: transient-allow

    // Verify the result was computed correctly
    // The contract logic sets `value = double(input)`
    await contract.connect(signers.alice).allowUser(signers.alice.address);
    const encryptedValue = await contract.value();
    const clearValue = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedValue,
      address,
      signers.alice,
    );

    // 5 + 5 = 10
    expect(clearValue).to.eq(10);
  });
});
