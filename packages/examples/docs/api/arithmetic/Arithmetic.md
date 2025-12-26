# Solidity API

## EncryptedArithmetic

Demonstrates basic encrypted arithmetic using FHEVM

@dev
This contract stores an encrypted uint and allows
arithmetic operations without revealing the value.

### set

```solidity
function set(externalEuint32 inputEuint32, bytes inputProof) external
```

Initialize the encrypted value

_This example omits overflow/underflow checks for simplicity and readability.
In a production contract, proper range checks should be implemented._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| inputEuint32 | externalEuint32 | Encrypted uint32 input |
| inputProof | bytes | Proof that the encrypted value is well-formed |

### add

```solidity
function add(externalEuint32 inputEuint32, bytes inputProof) external
```

Add an encrypted value to the current value

_This example omits overflow/underflow checks for simplicity and readability.
In a production contract, proper range checks should be implemented._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| inputEuint32 | externalEuint32 | Encrypted uint32 input |
| inputProof | bytes | Proof that the encrypted value is well-formed |

### sub

```solidity
function sub(externalEuint32 inputEuint32, bytes inputProof) external
```

Subtract an encrypted value from the current value

_This example omits overflow/underflow checks for simplicity and readability.
In a production contract, proper range checks should be implemented._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| inputEuint32 | externalEuint32 | Encrypted uint32 input |
| inputProof | bytes | Proof that the encrypted value is well-formed |

### mul

```solidity
function mul(externalEuint32 inputEuint32, bytes inputProof) external
```

Multiply the current value by an encrypted value

_This example omits overflow/underflow checks for simplicity and readability.
In a production contract, proper range checks should be implemented._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| inputEuint32 | externalEuint32 | Encrypted uint32 input |
| inputProof | bytes | Proof that the encrypted value is well-formed |

