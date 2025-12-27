import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

import type { ComparisonOperations } from "@/types";

/// @chapter: comparison-operations "Comparison Logic"
/// @priority: 4
///
/// FHEVM allows you to compare two encrypted numbers (or an encrypted number and a clear number).
///
/// **Crucial Concept: Encrypted Booleans (`ebool`)**
/// The result of a comparison is **not** a public `true` or `false`. It is an `ebool` (encrypted boolean).
/// This means the network knows a comparison happened, but it does **not** know the result.
///
/// `ebool` is primarily used with `FHE.select(condition, ifTrue, ifFalse)` to implement encrypted "If/Else" statements.

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = await ethers.getContractFactory("ComparisonOperations");
  const contract = await factory.deploy();
  const address = await contract.getAddress();

  return { address, contract };
}

describe("Comparison Operations", () => {
  let signers: Signers;
  let contract: ComparisonOperations;
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
  /// Standard setup. Comparisons behave identically on Mock and Real networks.

  beforeEach(async function () {
    // @start: setup
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }
    ({ contract, address } = await deployFixture());
    // @end: setup
  });

  const set = async (value: bigint | number) => {
    const encryptedValue = await fhevm
      .createEncryptedInput(address, signers.alice.address)
      .add32(BigInt(value))
      .encrypt();

    await contract
      .connect(signers.alice)
      .set(encryptedValue.handles[0], encryptedValue.inputProof);
  };

  /// @section: "Equality Checks (==, !=)"
  /// These operations determine if two encrypted values are identical or distinct.
  ///
  /// * `eq`: Returns an `ebool` that is effectively `Encrypted(1)` if equal, `Encrypted(0)` if not.
  /// * `neq`: The inverse.
  ///
  /// Note the use of `userDecryptEbool` in the verification step.

  it("should check equality", async () => {
    // Set state to 10
    await set(10);

    // @start: equality
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
    // @end: equality
  });

  it("should check inequality", async () => {
    await set(10);

    // @start: inequality
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
    // @end: inequality
  });

  /// @section: "Greater Than (> / >=)"
  /// Used for checking thresholds (e.g., "Does user have enough balance?").
  ///
  /// * `gt`: Strictly greater than (`>`)
  /// * `gte`: Greater than or equal to (`>=`)

  it("should check greater than", async () => {
    const clear10 = 10;
    await set(10);

    // @start: greater-than
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
    // @end: greater-than
  });

  it("should check greater than or equal to", async () => {
    const clear10 = 10;
    await set(10);

    // @start: greater-than-equal
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
    // @end: greater-than-equal
  });

  /// @section: "Less Than (< / <=)"
  /// Symmetric to Greater Than operations.

  it("should check less than", async () => {
    const clear10 = 10;
    await set(10);

    // @start: less-than
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
    // @end: less-than
  });

  it("should check less than or equal to", async () => {
    const clear10 = 10;
    const clear11 = 11;
    await set(clear10);

    // @start: less-than-equal
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
    // @end: less-than-equal
  });
});

/// @include: "Comparison.sol" { "group": "comparison", "tabTitle": "Comparison.sol" }
/// @include: "comparison.test.ts" { "group": "comparison", "tabTitle": "comparison.test.ts", "strip": true }
