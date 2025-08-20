// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/ChainOathSecure.sol";
import "../src/ChainOathNFT.sol";

/**
 * ChainOath完整系统部署脚本
 * 部署ChainOathSecure主合约和ChainOathNFT成就合约
 * 使用方法:
 * forge script script/DeployAll.s.sol --rpc-url https://sepolia.infura.io/v3/YOUR_API_KEY --broadcast --verify
 */
contract DeployAll is Script {
    function run() external {
        // 使用指定的私钥
        uint256 deployerPrivateKey = 0xf6dfe4824a2dd594a3aead5f65a5a922fa210ebaa6789b5305e48391848f15c1;
        address deployerAddress = 0xA0C7D67A861f2dD7a2EB4Acf114d568F76131447;
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("=== Starting ChainOath System Deployment ===");
        console.log("Deployer Address:", deployerAddress);
        console.log("Network: Sepolia Testnet");
        console.log("");
        
        // 1. 部署ChainOathSecure主合约
        console.log("Deploying ChainOathSecure contract...");
        ChainOathSecure chainOathSecure = new ChainOathSecure();
        console.log("[SUCCESS] ChainOathSecure deployed at:", address(chainOathSecure));
        console.log("  Block Explorer: https://sepolia.etherscan.io/address/%s", address(chainOathSecure));
        console.log("");
        
        // 2. 部署ChainOathNFT成就合约
        console.log("Deploying ChainOathNFT contract...");
        ChainOathNFT chainOathNFT = new ChainOathNFT(
            address(chainOathSecure),
            "ChainOath Achievement NFT",
            "COANFT"
        );
        console.log("[SUCCESS] ChainOathNFT deployed at:", address(chainOathNFT));
        console.log("  Block Explorer: https://sepolia.etherscan.io/address/%s", address(chainOathNFT));
        console.log("");
        
        // 3. 输出部署摘要
        console.log("=== Deployment Summary ===");
        console.log("ChainOathSecure Address:", address(chainOathSecure));
        console.log("ChainOathNFT Address:", address(chainOathNFT));
        console.log("Deployer Address:", deployerAddress);
        console.log("Network: Sepolia Testnet");
        console.log("Gas Used: Check transaction receipts for details");
        console.log("");
        console.log("=== Next Steps ===");
        console.log("1. Verify contracts on Etherscan");
        console.log("2. Update frontend configuration with contract addresses");
        console.log("3. Test contract interactions on Sepolia testnet");
        
        vm.stopBroadcast();
    }
}