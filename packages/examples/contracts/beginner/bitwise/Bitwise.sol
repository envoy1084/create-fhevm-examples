// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, euint8, externalEuint32, externalEuint8} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title Bitwise Operations
 * @notice Demonstrates basic bitwise operations using FHEVM
 *
 * @dev
 * This contract stores an encrypted uint and allows
 * bitwise operations without revealing the value.
 */
contract BitwiseOperations is ZamaEthereumConfig {
    euint32 private value;

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
     * @notice Perform bitwise AND on the current value and an encrypted value
     * @param inputEuint32 Encrypted uint32 input
     * @param inputProof Proof that the encrypted value is well-formed
     * @dev This example omits overflow/underflow checks for simplicity and readability.
     * In a production contract, proper range checks should be implemented.
     */
    function and(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        euint32 encryptedValue = FHE.fromExternal(inputEuint32, inputProof);

        value = FHE.and(value, encryptedValue);

        FHE.allowThis(value);
        FHE.allow(value, msg.sender);
    }

    /**
     * @notice Perform bitwise OR on the current value and an encrypted value
     * @param inputEuint32 Encrypted uint32 input
     * @param inputProof Proof that the encrypted value is well-formed
     * @dev This example omits overflow/underflow checks for simplicity and readability.
     * In a production contract, proper range checks should be implemented.
     */
    function or(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        euint32 encryptedValue = FHE.fromExternal(inputEuint32, inputProof);

        value = FHE.or(value, encryptedValue);

        FHE.allowThis(value);
        FHE.allow(value, msg.sender);
    }

    /**
     * @notice Perform bitwise XOR on the current value and an encrypted value
     * @param inputEuint32 Encrypted uint32 input
     * @param inputProof Proof that the encrypted value is well-formed
     * @dev This example omits overflow/underflow checks for simplicity and readability. In a production contract, proper range checks should be implemented.
     */
    function xor(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        euint32 encryptedValue = FHE.fromExternal(inputEuint32, inputProof);

        value = FHE.xor(value, encryptedValue);

        FHE.allowThis(value);
        FHE.allow(value, msg.sender);
    }

    /**
     * @notice Perform bitwise NOT on the current value
     */
    function not() external {
        value = FHE.not(value);

        FHE.allowThis(value);
        FHE.allow(value, msg.sender);
    }

    /**
     * @notice Perform bitwise left shift on the current value and an encrypted value
     * @param inputEuint8 Encrypted uint8 input
     * @param inputProof Proof that the encrypted value is well-formed
     * @dev This example omits overflow/underflow checks for simplicity and readability. In a production contract, proper range checks should be implemented.
     */
    function shl(externalEuint8 inputEuint8, bytes calldata inputProof) external {
        euint8 encryptedValue = FHE.fromExternal(inputEuint8, inputProof);

        value = FHE.shl(value, encryptedValue);

        FHE.allowThis(value);
        FHE.allow(value, msg.sender);
    }

    /**
     * @notice Perform bitwise right shift on the current value and an encrypted value
     * @param inputEuint8 Encrypted uint8 input
     * @param inputProof Proof that the encrypted value is well-formed
     * @dev This example omits overflow/underflow checks for simplicity and readability. In a production contract, proper range checks should be implemented.
     */
    function shr(externalEuint8 inputEuint8, bytes calldata inputProof) external {
        euint8 encryptedValue = FHE.fromExternal(inputEuint8, inputProof);

        value = FHE.shr(value, encryptedValue);

        FHE.allowThis(value);
        FHE.allow(value, msg.sender);
    }

    /**
     * @notice Perform bitwise rotation right on the current value and an encrypted value
     * @param inputEuint8 Encrypted uint8 input
     * @param inputProof Proof that the encrypted value is well-formed
     * @dev This example omits overflow/underflow checks for simplicity and readability. In a production contract, proper range checks should be implemented.
     */
    function rotr(externalEuint8 inputEuint8, bytes calldata inputProof) external {
        euint8 encryptedValue = FHE.fromExternal(inputEuint8, inputProof);

        value = FHE.rotr(value, encryptedValue);

        FHE.allowThis(value);
        FHE.allow(value, msg.sender);
    }

    /**
     * @notice Perform bitwise rotation left on the current value and an encrypted value
     * @param inputEuint8 Encrypted uint8 input
     * @param inputProof Proof that the encrypted value is well-formed
     * @dev This example omits overflow/underflow checks for simplicity and readability. In a production contract, proper range checks should be implemented.
     */
    function rotl(externalEuint8 inputEuint8, bytes calldata inputProof) external {
        euint8 encryptedValue = FHE.fromExternal(inputEuint8, inputProof);

        value = FHE.rotl(value, encryptedValue);

        FHE.allowThis(value);
        FHE.allow(value, msg.sender);
    }
}
