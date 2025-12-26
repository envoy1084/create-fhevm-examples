// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title EncryptedArithmetic
 * @notice Demonstrates basic encrypted arithmetic using FHEVM
 *
 * @dev This contract stores an encrypted uint and allows
 * arithmetic operations without revealing the value.
 */
contract EncryptedArithmetic is ZamaEthereumConfig {
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
     * @notice Add an encrypted value to the current value
     * @param inputEuint32 Encrypted uint32 input
     * @param inputProof Proof that the encrypted value is well-formed
     * @dev This example omits overflow/underflow checks for simplicity and readability.
     * In a production contract, proper range checks should be implemented.
     */
    function add(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        euint32 encryptedValue = FHE.fromExternal(inputEuint32, inputProof);

        value = FHE.add(value, encryptedValue);

        FHE.allowThis(value);
        FHE.allow(value, msg.sender);
    }

    /**
     * @notice Subtract an encrypted value from the current value
     * @param inputEuint32 Encrypted uint32 input
     * @param inputProof Proof that the encrypted value is well-formed
     * @dev This example omits overflow/underflow checks for simplicity and readability.
     * In a production contract, proper range checks should be implemented.
     */
    function sub(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        euint32 encryptedValue = FHE.fromExternal(inputEuint32, inputProof);

        value = FHE.sub(value, encryptedValue);

        FHE.allowThis(value);
        FHE.allow(value, msg.sender);
    }

    /**
     * @notice Multiply the current value by an encrypted value
     * @param inputEuint32 Encrypted uint32 input
     * @param inputProof Proof that the encrypted value is well-formed
     * @dev This example omits overflow/underflow checks for simplicity and readability.
     * In a production contract, proper range checks should be implemented.
     */
    function mul(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        euint32 encryptedValue = FHE.fromExternal(inputEuint32, inputProof);

        value = FHE.mul(value, encryptedValue);

        FHE.allowThis(value);
        FHE.allow(value, msg.sender);
    }

    /**
     * @notice Divide the current value by a divisor
     * @param divisor The divisor
     */
    function div(uint32 divisor) external {
        value = FHE.div(value, divisor);

        FHE.allowThis(value);
        FHE.allow(value, msg.sender);
    }

    /**
     * @notice Modulo the current value by a divisor
     * @param divisor The divisor
     */
    function rem(uint32 divisor) external {
        value = FHE.rem(value, divisor);

        FHE.allowThis(value);
        FHE.allow(value, msg.sender);
    }

    /**
     * @notice Find the minimum of two encrypted values
     * @param inputEuint32 Encrypted uint32 input
     * @param inputProof Proof that the encrypted value is well-formed
     * @dev This example omits overflow/underflow checks for simplicity and readability.
     * In a production contract, proper range checks should be implemented.
     */
    function min(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        euint32 encryptedEuint32 = FHE.fromExternal(inputEuint32, inputProof);

        value = FHE.min(value, encryptedEuint32);

        FHE.allowThis(value);
        FHE.allow(value, msg.sender);
    }

    /**
     * @notice Find the maximum of two encrypted values
     * @param inputEuint32 Encrypted uint32 input
     * @param inputProof Proof that the encrypted value is well-formed
     * @dev This example omits overflow/underflow checks for simplicity and readability.
     * In a production contract, proper range checks should be implemented.
     */
    function max(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        euint32 encryptedEuint32 = FHE.fromExternal(inputEuint32, inputProof);

        value = FHE.max(value, encryptedEuint32);

        FHE.allowThis(value);
        FHE.allow(value, msg.sender);
    }
}
