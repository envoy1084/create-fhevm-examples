import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { ethers, fhevm } from "hardhat";

chai.use(chaiAsPromised);
const { expect } = chai;

import type { ConfidentialERC20 } from "@/types";

/// @chapter: confidential-erc20 "Confidential ERC20"
/// @priority: 9
///
/// A Confidential ERC20 (often implementing ERC-7984 standards) behaves like a standard token but with **encrypted balances**.
///
/// **Key Features:**
/// * **Privacy:** No one can see your balance or transfer amounts on-chain.
/// * **Compliance:** Transfers behave logically (you can't spend what you don't have), but without leaking data.
/// * **Branchless Logic:** The underlying implementation uses `FHE.select` to conditionally update balances without reverting, preventing side-channel leaks.
///
///

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture(deployer: HardhatEthersSigner) {
  const factory = await ethers.getContractFactory("ConfidentialERC20");
  const contract = await factory.deploy(
    deployer.address,
    "ConfidentialERC20", // Name
    "CRC", // Symbol
    "", // Token URI
  );
  const address = await contract.getAddress();

  return { address, contract };
}

describe("Confidential ERC20", () => {
  let signers: Signers;
  let contract: ConfidentialERC20;
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
  /// Standard setup. We verify the Mock environment to ensure FHE operations are simulated correctly.

  beforeEach(async function () {
    // @start: setup
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }
    ({ contract, address } = await deployFixture(signers.deployer));
    // @end: setup
  });

  /// @section: "Helper Functions"
  /// Interacting with confidential contracts often requires repetitive "boilerplate" code,
  /// specifically for **Minting** (converting public amounts to private) and **Decrypting** (verifying balances).
  ///
  /// We encapsulate these into helpers to keep our tests clean and readable.

  // @start: helper-mint
  /**
   * Helper: Mint Tokens
   * The `mint` function in our contract takes a public `uint64`.
   * Internally, the contract converts it to an encrypted `euint64` using `FHE.asEuint64(amount)`.
   */
  const mintTokens = async (to: string, amount: bigint | number) => {
    const tx = await contract.connect(signers.deployer).mint(to, amount);
    await tx.wait();
  };
  // @end: helper-mint

  // @start: helper-balance
  /**
   * Helper: Get Decrypted Balance
   * This demonstrates the standard "User Decryption" flow:
   * 1. Fetch the encrypted balance handle from the contract (`confidentialBalanceOf`).
   * 2. Request re-encryption and decryption via `fhevm.userDecryptEuint`.
   * Note: This requires `signer` to sign the request.
   */
  const getBalance = async (signer: HardhatEthersSigner) => {
    // 1. Get Encrypted Handle
    const encBalance = await contract.confidentialBalanceOf(signer.address);

    // 2. Decrypt (requires user signature)
    const balance = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encBalance,
      address,
      signer,
    );
    return balance;
  };
  // @end: helper-balance

  /// @section: "Minting"
  /// We verify that minting works by checking the recipient's balance.
  /// Even though the balance is encrypted on-chain, Alice (the owner of the balance)
  /// can decrypt it to confirm she received the funds.

  it("should be allowed to mint tokens", async () => {
    const tokensToMint = 10n;

    // @start: test-mint
    await mintTokens(signers.alice.address, tokensToMint);

    const aliceBalanceAfter = await getBalance(signers.alice);
    expect(aliceBalanceAfter).to.eq(tokensToMint);
    // @end: test-mint
  });

  /// @section: "Confidential Transfer"
  /// This is the core functionality. Alice sends tokens to Bob using an encrypted input.
  ///
  /// **The Steps:**
  /// 1. **Alice Mints:** She starts with 10 tokens.
  /// 2. **Alice Encrypts:** She encrypts the amount `5` into a ciphertext intended for the contract.
  /// 3. **Alice Transfers:** She calls `confidentialTransfer`.
  /// 4. **Verification:** Both Alice and Bob decrypt their balances to verify the transfer occurred.
  ///
  /// Note: The contract uses the `ERC7984` standard interface. The function signature is overloaded,
  /// so we access it via bracket notation: `["confidentialTransfer(address,bytes32,bytes)"]`.

  it("should allow alice to transfer tokens", async () => {
    // 1. Setup Initial Balance
    const initialTokens = 10n;
    await mintTokens(signers.alice.address, initialTokens);

    const aliceBalanceBefore = await getBalance(signers.alice);
    expect(aliceBalanceBefore).to.eq(initialTokens);

    // @start: confidential-transfer
    const clear5 = 5n;

    // 2. Create Encrypted Input for Amount
    const encrypted5 = await fhevm
      .createEncryptedInput(address, signers.alice.address)
      .add64(clear5)
      .encrypt();

    // 3. Execute Transfer
    // Calling the specific overload for confidential transfers
    const tx = await contract
      .connect(signers.alice)
      ["confidentialTransfer(address,bytes32,bytes)"](
        signers.bob.address,
        encrypted5.handles[0],
        encrypted5.inputProof,
      );

    await tx.wait();
    // @end: confidential-transfer

    // 4. Verify Final State
    const aliceBalanceAfter = await getBalance(signers.alice);
    const bobBalanceAfter = await getBalance(signers.bob);

    expect(aliceBalanceAfter).to.eq(initialTokens - clear5);
    expect(bobBalanceAfter).to.eq(clear5);
  });
});

/// @include: "ConfidentialERC20.sol" { "group": "confidential-erc20", "tabTitle": "ConfidentialERC20.sol" }
/// @include: "confidential-erc20.test.ts" { "group": "confidential-erc20", "tabTitle": "confidential-erc20.test.ts", "strip": true }
