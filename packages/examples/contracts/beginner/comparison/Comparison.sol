// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, ebool, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title Comparison Operations
 * @notice Demonstrates basic comparison operations using FHEVM
 */
contract ComparisonOperations is ZamaEthereumConfig {
    euint32 private value;
    ebool public result;

    /**
     * @notice Get the current value
     * @return value The current encrypted value
     */
    function get() external view returns (euint32) {
        return value;
    }

    /**
     * @notice Initialize the encrypted value
     * @param inputEuint32 Encrypted uint32 input
     * @param inputProof Proof that the encrypted value is well-formed
     * @dev This example omits overflow/underflow checks for simplicity and readability.
     * In a production contract, proper range checks should be implemented.
     */
    function set(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        euint32 encryptedValue = FHE.fromExternal(inputEuint32, inputProof);
        value = encryptedValue;

        FHE.allowThis(value);
        FHE.allow(value, msg.sender);
    }

    /**
     * @notice Compares two encrypted values for equality
     * @param inputEuint32 Encrypted uint32 input
     * @param inputProof Proof that the encrypted value is well-formed
     */
    function eq(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        euint32 encryptedValue = FHE.fromExternal(inputEuint32, inputProof);

        result = FHE.eq(value, encryptedValue);

        FHE.allowThis(result);
        FHE.allow(result, msg.sender);
    }

    /**
     * @notice Compares two encrypted values for inequality
     * @param inputEuint32 Encrypted uint32 input
     * @param inputProof Proof that the encrypted value is well-formed
     */
    function neq(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        euint32 encryptedValue = FHE.fromExternal(inputEuint32, inputProof);

        result = FHE.ne(value, encryptedValue);

        FHE.allowThis(result);
        FHE.allow(result, msg.sender);
    }

    /**
     * @notice Compares two encrypted values for greater than
     * @param inputEuint32 Encrypted uint32 input
     * @param inputProof Proof that the encrypted value is well-formed
     */
    function gt(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        euint32 encryptedValue = FHE.fromExternal(inputEuint32, inputProof);

        result = FHE.gt(value, encryptedValue);

        FHE.allowThis(result);
        FHE.allow(result, msg.sender);
    }

    /**
     * @notice Compares two encrypted values for greater than or equal to
     * @param inputEuint32 Encrypted uint32 input
     * @param inputProof Proof that the encrypted value is well-formed
     */
    function gte(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        euint32 encryptedValue = FHE.fromExternal(inputEuint32, inputProof);

        result = FHE.ge(value, encryptedValue);

        FHE.allowThis(result);
        FHE.allow(result, msg.sender);
    }

    /**
     * @notice Compares two encrypted values for less than
     * @param inputEuint32 Encrypted uint32 input
     * @param inputProof Proof that the encrypted value is well-formed
     */
    function lt(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        euint32 encryptedValue = FHE.fromExternal(inputEuint32, inputProof);

        result = FHE.lt(value, encryptedValue);

        FHE.allowThis(result);
        FHE.allow(result, msg.sender);
    }

    /**
     * @notice Compares two encrypted values for less than or equal to
     * @param inputEuint32 Encrypted uint32 input
     * @param inputProof Proof that the encrypted value is well-formed
     */
    function lte(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        euint32 encryptedValue = FHE.fromExternal(inputEuint32, inputProof);

        result = FHE.le(value, encryptedValue);

        FHE.allowThis(result);
        FHE.allow(result, msg.sender);
    }
}
