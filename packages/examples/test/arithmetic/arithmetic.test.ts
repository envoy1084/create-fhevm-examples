import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

import type { EncryptedArithmetic } from "@/types";

/// @chapter: encrypted-arithmetic "Encrypted Arithmetic"
/// @priority: 2
///
/// # Introduction
/// The power of FHE lies in its ability to perform math on data while it remains encrypted.
/// This guide covers the four basic arithmetic operations: Addition, Subtraction, Multiplication, and Division.
///
/// We will verify that:
/// * $Enc(a) + Enc(b) = Enc(a + b)$
/// * $Enc(a) - Enc(b) = Enc(a - b)$
/// * $Enc(a) * Enc(b) = Enc(a * b)$
/// * $Enc(a) / b = Enc(a / b)$ (Scalar Division)

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = await ethers.getContractFactory("EncryptedArithmetic");
  const contract = await factory.deploy();
  const address = await contract.getAddress();

  return { address, contract };
}

describe("EncryptedArithmetic", () => {
  let signers: Signers;
  let contract: EncryptedArithmetic;
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
  /// Standard setup to deploy the arithmetic contract and verify we are running on the Mock FHEVM.

  beforeEach(async function () {
    // @start: setup
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }
    ({ contract, address } = await deployFixture());
    // @end: setup
  });

  // Helper to initialize the encrypted counter
  const set = async (value: bigint) => {
    const encryptedValue = await fhevm
      .createEncryptedInput(address, signers.alice.address)
      .add32(value)
      .encrypt();

    await contract
      .connect(signers.alice)
      .set(encryptedValue.handles[0], encryptedValue.inputProof);
  };

  it("encrypted value should be uninitialized after deployment", async () => {
    const encValue = await contract.get();
    expect(encValue).to.eq(ethers.ZeroHash);
  });

  /// @section: "Addition"
  /// Addition is the most fundamental operation. Here we create an encrypted input for `10`
  /// and add it to the contract's state.
  ///
  /// **Key Concept:** Both the contract state and the input are encrypted. The EVM cannot see `10`,
  /// but it successfully computes the new encrypted sum.

  it("should add to the encrypted value", async () => {
    // @ignore
    const encValueBeforeAdd = await contract.get();
    // @ignore
    expect(encValueBeforeAdd).to.eq(ethers.ZeroHash);

    // @start: addition
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
    // @end: addition
  });

  /// @section: "Subtraction"
  /// Subtraction works similarly to addition. FHEVM handles underflows according to modular arithmetic rules,
  /// but for simple cases, it behaves exactly as expected.

  it("should subtract from the encrypted value", async () => {
    const clear10 = 10n;

    // Set Value to 10 Initially
    await set(clear10);

    // @start: subtraction
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

    // @ignore
    const encValueAfterSub = await contract.get();
    // @ignore
    const clearValueAfterSub = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encValueAfterSub,
      address,
      signers.alice,
    );

    expect(clearValueAfterSub).to.eq(clear10 - clear5);
    // @end: subtraction
  });

  /// @section: "Multiplication"
  /// We can multiply two encrypted numbers together. This is a more computationally expensive operation
  /// than addition but is fully supported.

  it("should multiply the encrypted value", async () => {
    const clear2 = 2n;
    await set(clear2);

    // @start: multiplication
    const clear3 = 3n;
    const encrypted3 = await fhevm
      .createEncryptedInput(address, signers.alice.address)
      .add32(clear3)
      .encrypt();

    const tx = await contract
      .connect(signers.alice)
      .mul(encrypted3.handles[0], encrypted3.inputProof);
    await tx.wait();
    // @end: multiplication

    // @ignore
    const encValueAfterMul = await contract.get();
    // @ignore
    const clearValueAfterMul = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encValueAfterMul,
      address,
      signers.alice,
    );

    expect(clearValueAfterMul).to.eq(clear2 * clear3);
  });

  /// @section: "Division (Scalar)"
  /// Division is unique. In FHE, dividing an encrypted number by another encrypted number is extremely
  /// expensive and complex. However, dividing an **Encrypted Number** by a **Public (Clear) Number** is fast.
  ///
  /// This is known as **Scalar Division**.
  ///
  /// **Why do we do this?**
  /// In many real-world protocols (like AMMs or DAOs), you often need to divide by a known constant or
  /// a public variable (e.g., "calculate 5% fee" or "average over 10 users").
  ///
  /// Notice below that we pass `clear2` directly to the contract. We do **not** use `createEncryptedInput`
  /// because the divisor is public.

  it("should divide the encrypted value", async () => {
    // Initialize state to 10
    const clear10 = 10n;
    await set(clear10);

    // @start: division
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
    // @end: division
  });
});
