# Solidity API

## ComparisonOperations

Demonstrates basic comparison operations using FHEVM

### result

```solidity
ebool result
```

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

### eq

```solidity
function eq(externalEuint32 inputEuint32, bytes inputProof) external
```

Compares two encrypted values for equality

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| inputEuint32 | externalEuint32 | Encrypted uint32 input |
| inputProof | bytes | Proof that the encrypted value is well-formed |

### neq

```solidity
function neq(externalEuint32 inputEuint32, bytes inputProof) external
```

Compares two encrypted values for inequality

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| inputEuint32 | externalEuint32 | Encrypted uint32 input |
| inputProof | bytes | Proof that the encrypted value is well-formed |

### gt

```solidity
function gt(externalEuint32 inputEuint32, bytes inputProof) external
```

Compares two encrypted values for greater than

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| inputEuint32 | externalEuint32 | Encrypted uint32 input |
| inputProof | bytes | Proof that the encrypted value is well-formed |

### gte

```solidity
function gte(externalEuint32 inputEuint32, bytes inputProof) external
```

Compares two encrypted values for greater than or equal to

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| inputEuint32 | externalEuint32 | Encrypted uint32 input |
| inputProof | bytes | Proof that the encrypted value is well-formed |

### lt

```solidity
function lt(externalEuint32 inputEuint32, bytes inputProof) external
```

Compares two encrypted values for less than

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| inputEuint32 | externalEuint32 | Encrypted uint32 input |
| inputProof | bytes | Proof that the encrypted value is well-formed |

### lte

```solidity
function lte(externalEuint32 inputEuint32, bytes inputProof) external
```

Compares two encrypted values for less than or equal to

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| inputEuint32 | externalEuint32 | Encrypted uint32 input |
| inputProof | bytes | Proof that the encrypted value is well-formed |

