// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "forge-std/Script.sol";
import "../src/ChainOathSecure.sol";

/**
 * @title WhitelistToken Script
 * @dev Script to add tokens to ChainOathSecure contract whitelist
 * Usage:
 * forge script script/WhitelistToken.s.sol --fork-url $SEPOLIA_RPC_URL --broadcast --verify
 */
contract WhitelistTokenScript is Script {
    // Sepolia testnet configuration
    address constant CHAINOATH_CONTRACT = 0x5fA4C99f599E246757e6b5b6Fb9cD3B894D1331b;
    address constant WETH_ADDRESS = 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14;
    
    function run() external {
        // Read private key from environment variable
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);
        
        // Create contract instance
        ChainOathSecure chainOath = ChainOathSecure(CHAINOATH_CONTRACT);
        
        // Check current whitelist status
        bool isCurrentlyWhitelisted = chainOath.tokenWhitelist(WETH_ADDRESS);
        console.log("WETH current whitelist status:", isCurrentlyWhitelisted);
        
        if (!isCurrentlyWhitelisted) {
            // Add WETH to whitelist
            console.log("Adding WETH to whitelist...");
            chainOath.updateTokenWhitelist(WETH_ADDRESS, true);
            console.log("WETH successfully added to whitelist!");
        } else {
            console.log("WETH is already whitelisted, no need to add");
        }
        
        // Verify updated status
        bool newStatus = chainOath.tokenWhitelist(WETH_ADDRESS);
        console.log("WETH new whitelist status:", newStatus);
        
        vm.stopBroadcast();
        
        console.log("\n=== Whitelist Update Complete ===");
        console.log("Contract Address:", CHAINOATH_CONTRACT);
        console.log("WETH Address:", WETH_ADDRESS);
        console.log("Whitelist Status:", newStatus);
    }
}