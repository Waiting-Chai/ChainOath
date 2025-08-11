// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/ChainOathSecure.sol";

/**
 * ChainOath主合约部署脚本
 * 使用方法:
 * forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast --verify
 */
contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        
        // 部署ChainOath主合约
        ChainOathSecure chainOath = new ChainOathSecure();
        
        console.log("=== ChainOath Contract Deployed Successfully ===");
        console.log("Contract Address:", address(chainOath));
        console.log("Deployer Address:", vm.addr(deployerPrivateKey));
        console.log("Network: Sepolia Testnet");
        console.log("Block Explorer: https://sepolia.etherscan.io/address/%s", address(chainOath));
        
        vm.stopBroadcast();
    }
}