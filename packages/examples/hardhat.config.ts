import "@fhevm/hardhat-plugin";

import * as dotenv from "dotenv";
import "@nomicfoundation/hardhat-toolbox";
import "solidity-docgen";

import type { HardhatUserConfig } from "hardhat/config";

dotenv.config();

const MNEMONIC: string =
  process.env.MNEMONIC ??
  "test test test test test test test test test test test junk";

const accounts = process.env.MNEMONIC
  ? {
      count: 10,
      mnemonic: process.env.MNEMONIC,
      path: "m/44'/60'/0'/0/",
    }
  : process.env.DEPLOYER_PRIVATE_KEY
    ? [process.env.DEPLOYER_PRIVATE_KEY]
    : [];

const config = {
  defaultNetwork: "hardhat",
  docgen: {
    outputDir: "docs/api",
    pages: "files",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY ?? "",
  },
  gasReporter: {
    currency: "USD",
    enabled: process.env.REPORT_GAS === "true",
    excludeContracts: [],
  },
  networks: {
    anvil: {
      accounts: {
        count: 10,
        mnemonic: MNEMONIC,
        path: "m/44'/60'/0'/0/",
      },
      chainId: 31337,
      url: "http://localhost:8545",
    },
    hardhat: {
      accounts: {
        mnemonic: MNEMONIC,
      },
      // allowUnlimitedContractSize: true,
      chainId: 31337,
    },
    sepolia: {
      accounts: accounts,
      chainId: 11155111,
      url: process.env.SEPOLIA_RPC_URL ?? "",
    },
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
  solidity: {
    settings: {
      evmVersion: "cancun",
      metadata: {
        // Not including the metadata hash
        // https://github.com/paulrberg/hardhat-template/issues/31
        bytecodeHash: "none",
      },
      // Disable the optimizer when debugging
      // https://hardhat.org/hardhat-network/#solidity-optimizer-support
      optimizer: {
        enabled: true,
        runs: 800,
      },
    },
    version: "0.8.27",
  },
  typechain: {
    outDir: "types",
    target: "ethers-v6",
  },
} satisfies HardhatUserConfig;

export default config;
