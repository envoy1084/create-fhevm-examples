// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract Decryption is ZamaEthereumConfig {
    euint32 public value;
    uint32 public publicValue;

    function userDecrypt(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        euint32 encryptedValue = FHE.fromExternal(inputEuint32, inputProof);

        value = encryptedValue;

        FHE.allowThis(value);
        FHE.allow(value, msg.sender);
    }

    function publicDecrypt(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        euint32 encryptedValue = FHE.fromExternal(inputEuint32, inputProof);

        value = encryptedValue;

        FHE.makePubliclyDecryptable(value);
    }

    function verifyPublicDecryption(bytes memory result, bytes memory proof) external {
        bytes32[] memory cts = new bytes32[](1);
        cts[0] = FHE.toBytes32(value);

        FHE.checkSignatures(cts, result, proof);

        uint32 decodedResult = abi.decode(result, (uint32));

        publicValue = decodedResult;
    }
}
