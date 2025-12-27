// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint256, externalEuint256} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract ReorgHandling is ZamaEthereumConfig {
    euint256 public privateKey;
    uint256 public price;

    bool isPrivateKeyInitialized;

    bool isBought;
    address buyer;
    uint256 blockWhenBought;

    error NotEnoughEther();
    error AlreadyBought();
    error NotBoughtYet();
    error NotEnoughTimePassed();
    error PrivateKeyAlreadyInitialized();

    constructor() {}

    function setPrivateKey(externalEuint256 _privateKey, bytes memory inputProof, uint256 _price) external {
        if (isPrivateKeyInitialized) {
            revert PrivateKeyAlreadyInitialized();
        }

        price = _price;
        privateKey = FHE.fromExternal(_privateKey, inputProof);
        FHE.allowThis(privateKey);

        isPrivateKeyInitialized = true;
    }

    function buyPrivateKey() external payable {
        if (msg.value < price) {
            revert NotEnoughEther();
        }

        if (isBought) {
            revert AlreadyBought();
        }

        isBought = true;
        blockWhenBought = block.number;
        buyer = msg.sender;
    }

    function requestACL() external {
        if (!isBought) {
            revert NotBoughtYet();
        }

        if (block.number <= blockWhenBought + 95) {
            revert NotEnoughTimePassed();
        }

        FHE.allow(privateKey, buyer);
    }
}
