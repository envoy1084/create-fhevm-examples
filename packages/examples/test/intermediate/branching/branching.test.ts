import { FhevmType } from "@fhevm/hardhat-plugin";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { ethers, fhevm } from "hardhat";

chai.use(chaiAsPromised);
const { expect } = chai;

import type { Branching } from "@/types";

/// @chapter: branching "Branching (If/Else)"
/// @priority: 7
///
/// A common question is: *"How do I write an `if` statement with encrypted variables?"*
///
/// **The Challenge:**
/// In standard Solidity, `if (x > y)` requires the EVM to see the result of the comparison to jump to the correct bytecode branch.
/// In FHEVM, comparisons return an `ebool` (Encrypted Boolean). The EVM sees an opaque handle, not `true` or `false`.
///
/// **The Solution: `FHE.select`**
/// Instead of branching code execution, we branch **data selection**. This is equivalent to the ternary operator in standard languages:
/// ```solidity
/// // Standard
/// uint32 result = (x > y) ? x : y;
///
/// // FHEVM
/// ebool condition = FHE.gt(x, y);
/// euint32 result = FHE.select(condition, x, y);
/// ```
///
/// In this example, we implement a "High Water Mark" contract: it only updates the stored value if the new input is **greater** than the current value.

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = await ethers.getContractFactory("Branching");
  const contract = await factory.deploy();
  const address = await contract.getAddress();

  return { address, contract };
}

describe("Branching Logic", () => {
  let signers: Signers;
  let contract: Branching;
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

  const set = async (value: bigint | number) => {
    const encryptedValue = await fhevm
      .createEncryptedInput(address, signers.alice.address)
      .add32(BigInt(value))
      .encrypt();

    const tx = await contract
      .connect(signers.alice)
      .set(encryptedValue.handles[0], encryptedValue.inputProof);

    await tx.wait();
  };

  /// @section: "Conditional Update"
  /// The test demonstrates the `setValue` function logic:
  /// 1. Start with `5`.
  /// 2. Try to update with `10`.
  /// 3. The contract computes `isAbove = 10 > 5` (which is Encrypted True).
  /// 4. It executes `FHE.select(isAbove, 10, 5)`.
  /// 5. The stored value becomes `10`.
  ///
  ///

  it("should replace value if greater", async () => {
    // 1. Initialize State to 5
    await set(5);

    // @start: verify-initial
    const encValueBefore = await contract.value();
    const clearValueBefore = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encValueBefore,
      address,
      signers.alice,
    );
    // @end: verify-initial

    // @start: conditional-update
    const clear10 = 10n;

    // Encrypt the new candidate value (10)
    const encryptedValue = await fhevm
      .createEncryptedInput(address, signers.alice.address)
      .add32(clear10)
      .encrypt();

    // Call the contract function that uses FHE.select()
    const tx = await contract
      .connect(signers.alice)
      .setValue(encryptedValue.handles[0], encryptedValue.inputProof);

    await tx.wait();
    // @end: conditional-update

    // @start: verify-result
    // Verify the value updated (because 10 > 5)
    const encValueAfter = await contract.value();
    const clearValueAfter = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encValueAfter,
      address,
      signers.alice,
    );

    expect(clearValueAfter).to.gt(clearValueBefore);
    expect(clearValueAfter).to.eq(10);
    // @end: verify-result
  });
});

/// @include: "Branching.sol" { "group": "branching", "tabTitle": "Branching.sol" }
/// @include: "branching.test.ts" { "group": "branching-test", "tabTitle": "branching.test.ts", "strip": true }
