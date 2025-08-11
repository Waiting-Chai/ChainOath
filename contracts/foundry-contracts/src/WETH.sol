// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title WETH (Wrapped Ether)
 * @dev ERC20 代币化的以太坊，支持ETH和WETH之间的转换
 * 用于ChainOath系统中的ETH质押和奖励发放
 */
contract WETH is ERC20, ReentrancyGuard {
    
    event Deposit(address indexed account, uint256 amount);
    event Withdrawal(address indexed account, uint256 amount);
    
    constructor() ERC20("Wrapped Ether", "WETH") {}
    
    /**
     * @dev 存入ETH并铸造等量的WETH
     */
    function deposit() external payable nonReentrant {
        require(msg.value > 0, "Amount must be greater than 0");
        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value);
    }
    
    /**
     * @dev 销毁WETH并提取等量的ETH
     * @param amount 要提取的WETH数量
     */
    function withdraw(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient WETH balance");
        
        _burn(msg.sender, amount);
        
        // 安全地发送ETH
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "ETH transfer failed");
        
        emit Withdrawal(msg.sender, amount);
    }
    
    /**
     * @dev 销毁WETH并提取所有ETH
     */
    function withdrawAll() external nonReentrant {
        uint256 balance = balanceOf(msg.sender);
        require(balance > 0, "No WETH to withdraw");
        
        _burn(msg.sender, balance);
        
        // 安全地发送ETH
        (bool success, ) = payable(msg.sender).call{value: balance}("");
        require(success, "ETH transfer failed");
        
        emit Withdrawal(msg.sender, balance);
    }
    
    /**
     * @dev 接收ETH并自动转换为WETH
     */
    receive() external payable {
        if (msg.value > 0) {
            _mint(msg.sender, msg.value);
            emit Deposit(msg.sender, msg.value);
        }
    }
    
    /**
     * @dev 获取合约ETH余额
     */
    function getETHBalance() external view returns (uint256) {
        return address(this).balance;
    }
}