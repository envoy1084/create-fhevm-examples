# Solidity API

## AccessControl

### contractB

```solidity
contract AccessControlB contractB
```

### value

```solidity
euint32 value
```

### constructor

```solidity
constructor(address _contractB) public
```

### setWithContractACL

```solidity
function setWithContractACL(externalEuint32 inputEuint32, bytes inputProof) external
```

### allowUser

```solidity
function allowUser(address user) external
```

### chainAllow

```solidity
function chainAllow(address user1, address user2) external
```

### passToAnotherFunction

```solidity
function passToAnotherFunction(externalEuint32 inputEuint32, bytes inputProof) external
```

## AccessControlB

### double

```solidity
function double(euint32 encryptedValue) public returns (euint32)
```

