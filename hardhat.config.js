require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("dotenv").config();
const INFURA_API_KEY = process.env.INFURA_API_KEY;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const PRIVATE_KEY = process.env.PRIVATE_KEY; 

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      forking: {
        url: `https://mainnet.infura.io/v3/${INFURA_API_KEY}`,
        blockNumber: 20353402
      }
    },
    sepolia: {
      url: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [PRIVATE_KEY]
    }
  },
  etherscan: {
    apiKey: {
      sepolia: ETHERSCAN_API_KEY,
    },
  },
  sourcify: {
    // Disabled by default
    // Doesn't need an API key
    enabled: true
  },
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  }
};
