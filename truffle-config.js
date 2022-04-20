require('dotenv').config();
const path = require("path");
const HDWalletProvider = require("@truffle/hdwallet-provider");

module.exports = {
    contracts_build_directory: path.join(__dirname, "client/src/contracts"),
    compilers: {
        solc: {
            version: "0.8.13"
        }
    },
    networks: {
        develop: {
            host: "127.0.0.1",
            port: 7545,
            network_id: "5777",
        },
        ropsten: {
            provider: function () {
                return new HDWalletProvider(process.env.PRIVATE_KEY, process.env.INFURA_ROPSTEN);
            },
            network_id: '3',
        },
        kovan: {
            provider: function () {
                return new HDWalletProvider(process.env.PRIVATE_KEY, process.env.INFURA_KOVAN);
            },
            network_id: '42',
        }
    }
};
