# Solidity API

## BitwiseOperations

Demonstrates basic bitwise operations using FHEVM

@dev
This contract stores an encrypted uint and allows
bitwise operations without revealing the value.

### get

```solidity
function get() external view returns (euint32)
```

Get the current value

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | euint32 | value The current encrypted value |

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

### and

```solidity
function and(externalEuint32 inputEuint32, bytes inputProof) external
```

Perform bitwise AND on the current value and an encrypted value

_This example omits overflow/underflow checks for simplicity and readability.
In a production contract, proper range checks should be implemented._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| inputEuint32 | externalEuint32 | Encrypted uint32 input |
| inputProof | bytes | Proof that the encrypted value is well-formed |

### or

```solidity
function or(externalEuint32 inputEuint32, bytes inputProof) external
```

Perform bitwise OR on the current value and an encrypted value

_This example omits overflow/underflow checks for simplicity and readability.
In a production contract, proper range checks should be implemented._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| inputEuint32 | externalEuint32 | Encrypted uint32 input |
| inputProof | bytes | Proof that the encrypted value is well-formed |

### xor

```solidity
function xor(externalEuint32 inputEuint32, bytes inputProof) external
```

Perform bitwise XOR on the current value and an encrypted value

_This example omits overflow/underflow checks for simplicity and readability. In a production contract, proper range checks should be implemented._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| inputEuint32 | externalEuint32 | Encrypted uint32 input |
| inputProof | bytes | Proof that the encrypted value is well-formed |

### not

```solidity
function not() external
```

Perform bitwise NOT on the current value

### shl

```solidity
function shl(externalEuint8 inputEuint8, bytes inputProof) external
```

Perform bitwise left shift on the current value and an encrypted value

_This example omits overflow/underflow checks for simplicity and readability. In a production contract, proper range checks should be implemented._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| inputEuint8 | externalEuint8 | Encrypted uint8 input |
| inputProof | bytes | Proof that the encrypted value is well-formed |

### shr

```solidity
function shr(externalEuint8 inputEuint8, bytes inputProof) external
```

Perform bitwise right shift on the current value and an encrypted value

_This example omits overflow/underflow checks for simplicity and readability. In a production contract, proper range checks should be implemented._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| inputEuint8 | externalEuint8 | Encrypted uint8 input |
| inputProof | bytes | Proof that the encrypted value is well-formed |

### rotr

```solidity
function rotr(externalEuint8 inputEuint8, bytes inputProof) external
```

Perform bitwise rotation right on the current value and an encrypted value

_This example omits overflow/underflow checks for simplicity and readability. In a production contract, proper range checks should be implemented._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| inputEuint8 | externalEuint8 | Encrypted uint8 input |
| inputProof | bytes | Proof that the encrypted value is well-formed |

### rotl

```solidity
function rotl(externalEuint8 inputEuint8, bytes inputProof) external
```

Perform bitwise rotation left on the current value and an encrypted value

_This example omits overflow/underflow checks for simplicity and readability. In a production contract, proper range checks should be implemented._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| inputEuint8 | externalEuint8 | Encrypted uint8 input |
| inputProof | bytes | Proof that the encrypted value is well-formed |

