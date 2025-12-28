# Solidity API

## FHECounter

A very basic example contract showing how to work with encrypted data using FHEVM.

### getCount

```solidity
function getCount() external view returns (euint32)
```

Returns the current count

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | euint32 | _count The current encrypted count |

### increment

```solidity
function increment(externalEuint32 inputEuint32, bytes inputProof) external
```

Increments the counter by a specified encrypted value.

_This example omits overflow/underflow checks for simplicity and readability.
In a production contract, proper range checks should be implemented._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| inputEuint32 | externalEuint32 | the encrypted input value |
| inputProof | bytes | the input proof |

### decrement

```solidity
function decrement(externalEuint32 inputEuint32, bytes inputProof) external
```

Decrements the counter by a specified encrypted value.

_This example omits overflow/underflow checks for simplicity and readability.
In a production contract, proper range checks should be implemented._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| inputEuint32 | externalEuint32 | the encrypted input value |
| inputProof | bytes | the input proof |

