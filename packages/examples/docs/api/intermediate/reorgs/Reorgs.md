# Solidity API

## ReorgHandling

### privateKey

```solidity
euint256 privateKey
```

### price

```solidity
uint256 price
```

### isPrivateKeyInitialized

```solidity
bool isPrivateKeyInitialized
```

### isBought

```solidity
bool isBought
```

### buyer

```solidity
address buyer
```

### blockWhenBought

```solidity
uint256 blockWhenBought
```

### NotEnoughEther

```solidity
error NotEnoughEther()
```

### AlreadyBought

```solidity
error AlreadyBought()
```

### NotBoughtYet

```solidity
error NotBoughtYet()
```

### NotEnoughTimePassed

```solidity
error NotEnoughTimePassed()
```

### PrivateKeyAlreadyInitialized

```solidity
error PrivateKeyAlreadyInitialized()
```

### constructor

```solidity
constructor() public
```

### setPrivateKey

```solidity
function setPrivateKey(externalEuint256 _privateKey, bytes inputProof, uint256 _price) external
```

### buyPrivateKey

```solidity
function buyPrivateKey() external payable
```

### requestACL

```solidity
function requestACL() external
```

