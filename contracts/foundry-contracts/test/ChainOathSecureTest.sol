// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/ChainOathSecure.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// 测试用的ERC20代币
contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 1000000 * 10**18); // 铸造100万代币
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/**
 * ChainOathSecure 安全测试
 * 重点测试修复的安全漏洞
 */
contract ChainOathSecureTest is Test {
    ChainOathSecure public chainOath;
    MockERC20 public token;
    
    address public creator = address(0x1);
    address public committer = address(0x2);
    address public supervisor1 = address(0x3);
    address public supervisor2 = address(0x4);
    address public owner = address(0x5);
    
    uint256 public constant TOTAL_REWARD = 1000 * 10**18;
    uint256 public constant COMMITTER_STAKE = 500 * 10**18;
    uint256 public constant SUPERVISOR_STAKE = 200 * 10**18;
    
    function setUp() public {
        // 部署合约
        vm.prank(owner);
        chainOath = new ChainOathSecure();
        
        // 部署测试代币
        token = new MockERC20("Test Token", "TEST");
        
        // 将代币添加到白名单
        vm.prank(owner);
        chainOath.updateTokenWhitelist(address(token), true);
        
        // 为测试地址分配代币
        token.mint(creator, 10000 * 10**18);
        token.mint(committer, 10000 * 10**18);
        token.mint(supervisor1, 10000 * 10**18);
        token.mint(supervisor2, 10000 * 10**18);
    }
    
    /**
     * 创建测试誓约
     */
    function createTestOath() internal returns (uint256) {
        address[] memory supervisors = new address[](2);
        supervisors[0] = supervisor1;
        supervisors[1] = supervisor2;
        
        ChainOathSecure.Oath memory oath = ChainOathSecure.Oath({
            title: "Test Oath",
            description: "Test Description",
            committer: committer,
            supervisors: supervisors,
            totalReward: TOTAL_REWARD,
            committerStake: COMMITTER_STAKE,
            supervisorStake: SUPERVISOR_STAKE,
            supervisorRewardRatio: 20, // 20%
            checkThresholdPercent: 60, // 60%
            maxSupervisorMisses: 2,
            maxCommitterFailures: 1,
            createTime: 0, // 将被自动设置
            creator: address(0), // 将被自动设置
            token: IERC20(address(0)), // 将被自动设置
            status: ChainOathSecure.OathStatus.Pending,
            checkpoints: new ChainOathSecure.Checkpoint[](0),
            likesCount: 0,
            comments: new ChainOathSecure.Comment[](0)
        });
        
        // 创建者授权并创建誓约
        string[] memory checkpointDescriptions = new string[](3);
        checkpointDescriptions[0] = "Checkpoint 1";
        checkpointDescriptions[1] = "Checkpoint 2";
        checkpointDescriptions[2] = "Checkpoint 3";
        
        vm.startPrank(creator);
        token.approve(address(chainOath), TOTAL_REWARD);
        chainOath.createOath(oath, address(token), checkpointDescriptions);
        vm.stopPrank();
        
        return 0; // 第一个誓约ID
    }
    
    /**
     * 完成所有质押
     */
    function completeAllStakes(uint256 oathId) internal {
        // 守约人质押
        vm.startPrank(committer);
        token.approve(address(chainOath), COMMITTER_STAKE);
        chainOath.committerStake(oathId, COMMITTER_STAKE);
        vm.stopPrank();
        
        // 监督者1质押
        vm.startPrank(supervisor1);
        token.approve(address(chainOath), SUPERVISOR_STAKE);
        chainOath.supervisorStake(oathId, SUPERVISOR_STAKE);
        vm.stopPrank();
        
        // 监督者2质押
        vm.startPrank(supervisor2);
        token.approve(address(chainOath), SUPERVISOR_STAKE);
        chainOath.supervisorStake(oathId, SUPERVISOR_STAKE);
        vm.stopPrank();
    }
    
    /**
     * 测试1：代币白名单机制
     */
    function testTokenWhitelist() public {
        // 部署新的未授权代币
        MockERC20 unauthorizedToken = new MockERC20("Unauthorized", "UNAUTH");
        
        address[] memory supervisors = new address[](1);
        supervisors[0] = supervisor1;
        
        ChainOathSecure.Oath memory oath = ChainOathSecure.Oath({
            title: "Test Oath",
            description: "Test Description",
            committer: committer,
            supervisors: supervisors,
            totalReward: TOTAL_REWARD,
            committerStake: COMMITTER_STAKE,
            supervisorStake: SUPERVISOR_STAKE,
            supervisorRewardRatio: 20,
            checkThresholdPercent: 60,
            maxSupervisorMisses: 2,
            maxCommitterFailures: 1,
            createTime: 0,
            creator: address(0),
            token: IERC20(address(0)),
            status: ChainOathSecure.OathStatus.Pending,
            checkpoints: new ChainOathSecure.Checkpoint[](0),
            likesCount: 0,
            comments: new ChainOathSecure.Comment[](0)
        });
        
        // 尝试使用未授权代币创建誓约应该失败
        string[] memory checkpointDescriptions = new string[](1);
        checkpointDescriptions[0] = "Test Checkpoint";
        
        vm.startPrank(creator);
        unauthorizedToken.mint(creator, TOTAL_REWARD);
        unauthorizedToken.approve(address(chainOath), TOTAL_REWARD);
        
        vm.expectRevert("Token not whitelisted");
        chainOath.createOath(oath, address(unauthorizedToken), checkpointDescriptions);
        vm.stopPrank();
    }
    
    /**
     * 测试2：统一代币类型（修复多代币混合风险）
     */
    function testUnifiedTokenType() public {
        uint256 oathId = createTestOath();
        
        // 所有质押都必须使用相同的代币类型
        // 守约人质押
        vm.startPrank(committer);
        token.approve(address(chainOath), COMMITTER_STAKE);
        chainOath.committerStake(oathId, COMMITTER_STAKE);
        vm.stopPrank();
        
        // 监督者质押
        vm.startPrank(supervisor1);
        token.approve(address(chainOath), SUPERVISOR_STAKE);
        chainOath.supervisorStake(oathId, SUPERVISOR_STAKE);
        vm.stopPrank();
        
        // 验证所有质押都使用了相同的代币
        ChainOathSecure.Oath memory oathData = chainOath.getOath(oathId);
        assertEq(address(oathData.token), address(token));
    }
    
    /**
     * 测试3：修复创建者资金计算逻辑
     */
    function testCreatorRewardCalculationFix() public {
        uint256 oathId = createTestOath();
        completeAllStakes(oathId);
        
        // 跳转到誓约开始时间
        vm.warp(block.timestamp + 3600);
        
        // 模拟誓约完成（所有检查点都成功）
        uint16 totalCheckpoints = uint16(chainOath.getOath(oathId).checkpoints.length);
        
        for (uint16 checkpointIndex = 0; checkpointIndex < totalCheckpoints; checkpointIndex++) {
            // 跳转到当前轮次
            vm.warp(block.timestamp + 86400);
            
            // 检查誓约状态，如果已完成则停止
             ChainOathSecure.OathStatus status = chainOath.getOath(oathId).status;
             if (status == ChainOathSecure.OathStatus.Fulfilled || status == ChainOathSecure.OathStatus.Broken) {
                 break;
             }
            
            // 监督者提交批准
            vm.prank(committer);
            chainOath.completeCheckpoint(oathId);
        }
        
        // 记录合约初始余额（移除未使用的变量）
        
        // 守约人领取奖励
        vm.prank(committer);
        chainOath.claimReward(oathId);
        
        // 监督者领取奖励
        vm.prank(supervisor1);
        chainOath.claimReward(oathId);
        
        vm.prank(supervisor2);
        chainOath.claimReward(oathId);
        
        // 记录创建者领取前的余额
        uint256 balanceBeforeCreator = token.balanceOf(address(chainOath));
        uint256 creatorBalanceBefore = token.balanceOf(creator);
        
        // 创建者领取剩余资金
        vm.prank(creator);
        chainOath.claimReward(oathId);
        
        // 验证创建者获得的金额等于合约剩余余额（修复重复计算问题）
        uint256 creatorReceived = token.balanceOf(creator) - creatorBalanceBefore;
        assertEq(creatorReceived, balanceBeforeCreator);
        
        // 验证合约余额为0
        assertEq(token.balanceOf(address(chainOath)), 0);
    }
    
    /**
     * 测试4：防止重复领取奖励
     */
    function testPreventDoubleRewardClaim() public {
        uint256 oathId = createTestOath();
        completeAllStakes(oathId);
        
        // 跳转到誓约开始时间并完成誓约
        vm.warp(block.timestamp + 3600);
        
        // 模拟誓约完成
        uint16 totalCheckpoints = uint16(chainOath.getOath(oathId).checkpoints.length);
        for (uint16 checkpointIndex = 0; checkpointIndex < totalCheckpoints; checkpointIndex++) {
            vm.warp(block.timestamp + 86400);
            
            // 检查誓约状态
             ChainOathSecure.OathStatus status = chainOath.getOath(oathId).status;
             if (status == ChainOathSecure.OathStatus.Fulfilled || status == ChainOathSecure.OathStatus.Broken) {
                 break;
             }
            
            vm.prank(committer);
            chainOath.completeCheckpoint(oathId);
        }
        
        // 守约人第一次领取奖励
        vm.prank(committer);
        chainOath.claimReward(oathId);
        
        // 尝试第二次领取应该失败
        vm.prank(committer);
        vm.expectRevert("No stake to claim");
        chainOath.claimReward(oathId);
    }
    
    /**
     * 测试5：紧急暂停功能
     */
    function testEmergencyPause() public {
        uint256 oathId = createTestOath();
        
        // 管理员暂停合约
        vm.prank(owner);
        chainOath.emergencyPause();
        
        // 暂停期间不能进行质押
        vm.startPrank(committer);
        token.approve(address(chainOath), COMMITTER_STAKE);
        vm.expectRevert(); // OpenZeppelin v5使用EnforcedPause()错误
        chainOath.committerStake(oathId, COMMITTER_STAKE);
        vm.stopPrank();
        
        // 恢复合约
        vm.prank(owner);
        chainOath.emergencyUnpause();
        
        // 恢复后可以正常质押
        vm.startPrank(committer);
        chainOath.committerStake(oathId, COMMITTER_STAKE);
        vm.stopPrank();
    }
    
    /**
     * 测试6：最小质押金额限制（防止粉尘攻击）
     */
    function testMinimumStakeAmount() public {
        address[] memory supervisors = new address[](1);
        supervisors[0] = supervisor1;
        
        ChainOathSecure.Oath memory oath = ChainOathSecure.Oath({
            title: "Test Oath",
            description: "Test Description",
            committer: committer,
            supervisors: supervisors,
            totalReward: 1000, // 小于最小金额
            committerStake: 500,
            supervisorStake: 200,
            supervisorRewardRatio: 20,
            checkThresholdPercent: 60,
            maxSupervisorMisses: 2,
            maxCommitterFailures: 1,
            createTime: 0,
            creator: address(0),
            token: IERC20(address(0)),
            status: ChainOathSecure.OathStatus.Pending,
            checkpoints: new ChainOathSecure.Checkpoint[](0),
            likesCount: 0,
            comments: new ChainOathSecure.Comment[](0)
        });
        
        // 尝试创建金额过小的誓约应该失败
        string[] memory checkpointDescriptions = new string[](1);
        checkpointDescriptions[0] = "Test Checkpoint";
        
        vm.startPrank(creator);
        token.approve(address(chainOath), 1000);
        vm.expectRevert("Total reward too small");
        chainOath.createOath(oath, address(token), checkpointDescriptions);
        vm.stopPrank();
    }
    
    /**
     * 测试7：角色分离（创建者不能是守约人或监督者）
     */
    function testRoleSeparation() public {
        address[] memory supervisors = new address[](1);
        supervisors[0] = creator; // 创建者试图成为监督者
        
        ChainOathSecure.Oath memory oath = ChainOathSecure.Oath({
            title: "Test Oath",
            description: "Test Description",
            committer: committer,
            supervisors: supervisors,
            totalReward: TOTAL_REWARD,
            committerStake: COMMITTER_STAKE,
            supervisorStake: SUPERVISOR_STAKE,
            supervisorRewardRatio: 20,
            checkThresholdPercent: 60,
            maxSupervisorMisses: 2,
            maxCommitterFailures: 1,
            createTime: 0,
            creator: address(0),
            token: IERC20(address(0)),
            status: ChainOathSecure.OathStatus.Pending,
            checkpoints: new ChainOathSecure.Checkpoint[](0),
            likesCount: 0,
            comments: new ChainOathSecure.Comment[](0)
        });
        
        string[] memory checkpointDescriptions = new string[](1);
        checkpointDescriptions[0] = "Test Checkpoint";
        
        vm.startPrank(creator);
        token.approve(address(chainOath), TOTAL_REWARD);
        vm.expectRevert("Creator cannot be supervisor");
        chainOath.createOath(oath, address(token), checkpointDescriptions);
        vm.stopPrank();
    }
    
    /**
     * 测试8：奖励分配记录查询
     */
    function testRewardDistributionTracking() public {
        uint256 oathId = createTestOath();
        completeAllStakes(oathId);
        
        // 检查初始分配记录
        (uint256 committerClaimed, uint256 supervisorClaimed, uint256 creatorClaimed, bool completed) = 
            chainOath.getRewardDistribution(oathId);
        
        assertEq(committerClaimed, 0);
        assertEq(supervisorClaimed, 0);
        assertEq(creatorClaimed, 0);
        assertFalse(completed);
        
        // 完成誓约并领取奖励后检查记录
        vm.warp(block.timestamp + 3600);
        uint16 totalCheckpoints = uint16(chainOath.getOath(oathId).checkpoints.length);
        for (uint16 checkpointIndex = 0; checkpointIndex < totalCheckpoints; checkpointIndex++) {
            vm.warp(block.timestamp + 86400);
            
            // 检查誓约状态
             ChainOathSecure.OathStatus status = chainOath.getOath(oathId).status;
             if (status == ChainOathSecure.OathStatus.Fulfilled || status == ChainOathSecure.OathStatus.Broken) {
                 break;
             }
             
             vm.prank(committer);
             chainOath.completeCheckpoint(oathId);
        }
        
        vm.prank(committer);
        chainOath.claimReward(oathId);
        
        // 检查守约人奖励记录
        (committerClaimed, supervisorClaimed, creatorClaimed, completed) = 
            chainOath.getRewardDistribution(oathId);
        
        uint256 expectedCommitterReward = TOTAL_REWARD * 80 / 100; // 80%
        assertEq(committerClaimed, expectedCommitterReward);
    }
}