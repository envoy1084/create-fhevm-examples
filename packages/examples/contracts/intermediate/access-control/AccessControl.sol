// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract AccessControl is ZamaEthereumConfig {
    using FHE for euint32;

    AccessControlB public contractB;
    euint32 public value;

    constructor(address _contractB) {
        contractB = AccessControlB(_contractB);
    }

    function setWithContractACL(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        euint32 encryptedValue = FHE.fromExternal(inputEuint32, inputProof);
        value = encryptedValue;

        FHE.allowThis(value);
    }

    function allowUser(address user) external {
        FHE.allow(value, user);
    }

    function chainAllow(address user1, address user2) external {
        value.allow(user1).allow(user2);
    }

    function passToAnotherFunction(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        euint32 encryptedValue = FHE.fromExternal(inputEuint32, inputProof);
        FHE.allowTransient(encryptedValue, address(contractB));

        value = contractB.double(encryptedValue);
    }
}

contract AccessControlB is ZamaEthereumConfig {
    function double(euint32 encryptedValue) public returns (euint32) {
        euint32 val = FHE.add(encryptedValue, encryptedValue);
        FHE.allow(val, msg.sender);
        return val;
    }
}
