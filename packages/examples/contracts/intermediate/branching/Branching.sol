// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, ebool, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract Branching is ZamaEthereumConfig {
    euint32 public value;


    function set(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        euint32 encryptedValue = FHE.fromExternal(inputEuint32, inputProof);

        value = encryptedValue;

        FHE.allowThis(value);
        FHE.allow(value, msg.sender);
    }


    function setValue(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        euint32 encryptedValue = FHE.fromExternal(inputEuint32, inputProof);

        ebool isAbove = FHE.gt(encryptedValue, value);

        value = FHE.select(isAbove, encryptedValue, value);

        FHE.allowThis(value);
        FHE.allow(value, msg.sender);
    }
}
