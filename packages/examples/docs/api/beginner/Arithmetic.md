# Solidity API

## EncryptedArithmetic

Demonstrates basic encrypted arithmetic using FHEVM

_This contract stores an encrypted uint and allows
arithmetic operations without revealing the value._

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

### div

```solidity
function div(uint32 divisor) external
```

Divide the current value by a divisor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| divisor | uint32 | The divisor |

### rem

```solidity
function rem(uint32 divisor) external
```

Modulo the current value by a divisor

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| divisor | uint32 | The divisor |

### min

```solidity
function min(externalEuint32 inputEuint32, bytes inputProof) external
```

Find the minimum of two encrypted values

_This example omits overflow/underflow checks for simplicity and readability.
In a production contract, proper range checks should be implemented._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| inputEuint32 | externalEuint32 | Encrypted uint32 input |
| inputProof | bytes | Proof that the encrypted value is well-formed |

### max

```solidity
function max(externalEuint32 inputEuint32, bytes inputProof) external
```

Find the maximum of two encrypted values

_This example omits overflow/underflow checks for simplicity and readability.
In a production contract, proper range checks should be implemented._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| inputEuint32 | externalEuint32 | Encrypted uint32 input |
| inputProof | bytes | Proof that the encrypted value is well-formed |

