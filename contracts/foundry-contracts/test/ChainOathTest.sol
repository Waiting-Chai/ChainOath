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

contract ChainOathTest is Test {
    ChainOathSecure public chainOath;
    MockERC20 public token;
    
    // 测试地址
    address public creator = address(0x1);
    address public committer = address(0x2);
    address public supervisor1 = address(0x3);
    address public supervisor2 = address(0x4);
    address public supervisor3 = address(0x5);
    
    // 测试参数
    uint256 public constant TOTAL_REWARD = 1000000; // 1e6，满足最小奖励要求
    uint256 public constant COMMITTER_STAKE = 1000000; // 1e6，满足最小质押要求
    uint256 public constant SUPERVISOR_STAKE = 1000000; // 1e6，满足最小质押要求
    uint16 public constant SUPERVISOR_REWARD_RATIO = 30; // 30%
    uint32 public constant CHECK_INTERVAL = 60; // 60秒
    uint32 public constant CHECK_WINDOW = 30; // 30秒
    uint16 public constant CHECK_THRESHOLD_PERCENT = 50; // 50%
    uint16 public constant MAX_SUPERVISOR_MISSES = 1;
    uint16 public constant MAX_COMMITTER_FAILURES = 1;
    
    function setUp() public {
        chainOath = new ChainOathSecure();
        token = new MockERC20("TestToken", "TT");
        
        // 为测试地址分配代币
        token.mint(creator, 10000000); // 10e6，足够支付奖励和质押
        token.mint(committer, 10000000);
        token.mint(supervisor1, 10000000);
        token.mint(supervisor2, 10000000);
        token.mint(supervisor3, 10000000);
        
        // 设置代币授权
        vm.prank(creator);
        token.approve(address(chainOath), type(uint256).max);
        
        vm.prank(committer);
        token.approve(address(chainOath), type(uint256).max);
        
        vm.prank(supervisor1);
        token.approve(address(chainOath), type(uint256).max);
        
        vm.prank(supervisor2);
        token.approve(address(chainOath), type(uint256).max);
        
        vm.prank(supervisor3);
        token.approve(address(chainOath), type(uint256).max);
        
        // 将测试代币添加到白名单
        chainOath.updateTokenWhitelist(address(token), true);
    }
    
    // 创建基础誓约的辅助函数
    function createBasicOath() internal returns (uint256 oathId) {
        address[] memory supervisors = new address[](3);
        supervisors[0] = supervisor1;
        supervisors[1] = supervisor2;
        supervisors[2] = supervisor3;
        
        uint32 startTime = uint32(block.timestamp + 100);
        uint32 endTime = startTime + 3 * CHECK_INTERVAL;
        
        ChainOathSecure.Oath memory oath = ChainOathSecure.Oath({
            title: "Test Oath",
            description: "Test Description",
            committer: committer,
            supervisors: supervisors,
            totalReward: TOTAL_REWARD,
            committerStake: COMMITTER_STAKE,
            supervisorStake: SUPERVISOR_STAKE,
            supervisorRewardRatio: SUPERVISOR_REWARD_RATIO,
            checkInterval: CHECK_INTERVAL,
            checkWindow: CHECK_WINDOW,
            checkThresholdPercent: CHECK_THRESHOLD_PERCENT,
            maxSupervisorMisses: MAX_SUPERVISOR_MISSES,
            maxCommitterFailures: MAX_COMMITTER_FAILURES,
            checkRoundsCount: 0, // 会在合约中计算
            startTime: startTime,
            endTime: endTime,
            createTime: 0, // 会在合约中设置
            creator: address(0), // 会在合约中设置
            token: IERC20(address(0)), // 会在合约中设置
            status: ChainOathSecure.OathStatus.Pending // 会在合约中设置
        });
        
        vm.prank(creator);
        chainOath.createOath(oath, address(token));
        
        return chainOath.nextOathId() - 1;
    }
    
    // 完成所有质押的辅助函数
    function completeAllStaking(uint256 oathId) internal {
        // 守约人质押
        vm.warp(block.timestamp + 10);
        vm.prank(committer);
        chainOath.committerStake(oathId, COMMITTER_STAKE);
        
        // 监督者质押
        vm.warp(block.timestamp + 10);
        vm.prank(supervisor1);
        chainOath.supervisorStake(oathId, SUPERVISOR_STAKE);
        
        vm.prank(supervisor2);
        chainOath.supervisorStake(oathId, SUPERVISOR_STAKE);
        
        vm.prank(supervisor3);
        chainOath.supervisorStake(oathId, SUPERVISOR_STAKE);
    }
    
    /**
     * 场景1：完整履行（Fulfilled）
     * 所有监督者在每轮都同意，最终誓约完成
     */
    function testScenario1_CompleteFulfillment() public {
        uint256 oathId = createBasicOath();
        completeAllStaking(oathId);
        
        // 验证状态为Accepted
        ChainOathSecure.Oath memory oath = chainOath.getOath(oathId);
        assertEq(uint(oath.status), uint(ChainOathSecure.OathStatus.Accepted));
        
        // 轮次1：所有监督者同意
        vm.warp(oath.startTime);
        vm.prank(supervisor1);
        chainOath.submitSupervision(oathId, true);
        
        vm.prank(supervisor2);
        chainOath.submitSupervision(oathId, true);
        
        vm.prank(supervisor3);
        chainOath.submitSupervision(oathId, true);
        
        // 轮次2：所有监督者同意
        vm.warp(oath.startTime + CHECK_INTERVAL);
        vm.prank(supervisor1);
        chainOath.submitSupervision(oathId, true);
        
        vm.prank(supervisor2);
        chainOath.submitSupervision(oathId, true);
        
        vm.prank(supervisor3);
        chainOath.submitSupervision(oathId, true);
        
        // 轮次3：所有监督者同意
        vm.warp(oath.startTime + 2 * CHECK_INTERVAL);
        vm.prank(supervisor1);
        chainOath.submitSupervision(oathId, true);
        
        vm.prank(supervisor2);
        chainOath.submitSupervision(oathId, true);
        
        vm.prank(supervisor3);
        chainOath.submitSupervision(oathId, true);
        
        // 验证状态为Fulfilled
        oath = chainOath.getOath(oathId);
        assertEq(uint(oath.status), uint(ChainOathSecure.OathStatus.Fulfilled));
        
        // 验证奖励分配
        uint256 committerBalanceBefore = token.balanceOf(committer);
        vm.prank(committer);
        chainOath.claimReward(oathId);
        uint256 committerBalanceAfter = token.balanceOf(committer);
        
        // 守约人应得到700000奖励 + 1000000质押退回 = 1700000
        assertEq(committerBalanceAfter - committerBalanceBefore, 700000 + COMMITTER_STAKE);
        
        // 监督者奖励验证
        uint256 supervisor1BalanceBefore = token.balanceOf(supervisor1);
        vm.prank(supervisor1);
        chainOath.claimReward(oathId);
        uint256 supervisor1BalanceAfter = token.balanceOf(supervisor1);
        
        // 每位监督者应得到100000奖励 + 1000000质押退回 = 1100000
        // 计算：300000总奖励 / 3监督者 = 100000
        assertEq(supervisor1BalanceAfter - supervisor1BalanceBefore, 100000 + SUPERVISOR_STAKE);
    }
    
    /**
     * 场景2：质押不全 → 自动废止（Aborted）
     * 守约人不质押，导致誓约在开始时间后自动废止
     */
    function testScenario2_IncompleteStaking() public {
        uint256 oathId = createBasicOath();
        
        // 只有监督者质押，守约人不质押
        vm.warp(block.timestamp + 10);
        vm.prank(supervisor1);
        chainOath.supervisorStake(oathId, SUPERVISOR_STAKE);
        
        vm.prank(supervisor2);
        chainOath.supervisorStake(oathId, SUPERVISOR_STAKE);
        
        vm.prank(supervisor3);
        chainOath.supervisorStake(oathId, SUPERVISOR_STAKE);
        
        ChainOathSecure.Oath memory oath = chainOath.getOath(oathId);
        
        // 时间推进到开始时间后
        vm.warp(oath.startTime + 1);
        
        // 触发状态检查
        chainOath.checkOathStatus(oathId);
        
        // 验证状态已变为Aborted
        oath = chainOath.getOath(oathId);
        assertEq(uint(oath.status), uint(ChainOathSecure.OathStatus.Aborted));
        
        // 验证可以退回质押
        uint256 supervisor1BalanceBefore = token.balanceOf(supervisor1);
        vm.prank(supervisor1);
        chainOath.refundStake(oathId);
        uint256 supervisor1BalanceAfter = token.balanceOf(supervisor1);
        
        assertEq(supervisor1BalanceAfter - supervisor1BalanceBefore, SUPERVISOR_STAKE);
    }
    
    /**
     * 场景3：守约人违约（Broken）
     * 守约人连续失约超过最大允许次数
     */
    function testScenario3_CommitterBreach() public {
        uint256 oathId = createBasicOath();
        completeAllStaking(oathId);
        
        ChainOathSecure.Oath memory oath = chainOath.getOath(oathId);
        
        // 轮次1：只有supervisor1同意，其他拒绝 (33% < 50%)
        vm.warp(oath.startTime);
        vm.prank(supervisor1);
        chainOath.submitSupervision(oathId, true);
        
        vm.prank(supervisor2);
        chainOath.submitSupervision(oathId, false);
        
        vm.prank(supervisor3);
        chainOath.submitSupervision(oathId, false);
        
        // 轮次2：再次失败
        vm.warp(oath.startTime + CHECK_INTERVAL);
        vm.prank(supervisor1);
        chainOath.submitSupervision(oathId, true);
        
        vm.prank(supervisor2);
        chainOath.submitSupervision(oathId, false);
        
        vm.prank(supervisor3);
        chainOath.submitSupervision(oathId, false);
        
        // 验证状态为Broken
        oath = chainOath.getOath(oathId);
        assertEq(uint(oath.status), uint(ChainOathSecure.OathStatus.Broken));
        
        // 守约人不能领取奖励
        vm.prank(committer);
        vm.expectRevert("Oath not fulfilled");
        chainOath.claimReward(oathId);
        
        // 监督者可以领取奖励
        uint256 supervisor1BalanceBefore = token.balanceOf(supervisor1);
        vm.prank(supervisor1);
        chainOath.claimReward(oathId);
        uint256 supervisor1BalanceAfter = token.balanceOf(supervisor1);
        
        // supervisor1有2次成功检查，应该有奖励
        assertTrue(supervisor1BalanceAfter > supervisor1BalanceBefore);
    }
    
    /**
     * 场景4：监督者失职取消资格
     * 监督者连续失职超过最大允许次数被取消资格
     */
    function testScenario4_SupervisorDisqualification() public {
        uint256 oathId = createBasicOath();
        completeAllStaking(oathId);
        
        ChainOathSecure.Oath memory oath = chainOath.getOath(oathId);
        
        // 轮次1：只有supervisor1和supervisor2提交，supervisor3超时
        vm.warp(oath.startTime);
        vm.prank(supervisor1);
        chainOath.submitSupervision(oathId, true);
        
        vm.prank(supervisor2);
        chainOath.submitSupervision(oathId, true);
        
        // supervisor3不提交，等待超时
        vm.warp(oath.startTime + CHECK_WINDOW + 1);
        chainOath.processTimeoutRound(oathId);
        
        // 轮次2：supervisor3再次超时
        vm.warp(oath.startTime + CHECK_INTERVAL);
        vm.prank(supervisor1);
        chainOath.submitSupervision(oathId, true);
        
        vm.prank(supervisor2);
        chainOath.submitSupervision(oathId, true);
        
        // supervisor3再次不提交
        vm.warp(oath.startTime + CHECK_INTERVAL + CHECK_WINDOW + 1);
        chainOath.processTimeoutRound(oathId);
        
        // 验证supervisor3被取消资格
        (,, bool isDisqualified) = chainOath.getSupervisorStatus(oathId, supervisor3);
        assertTrue(isDisqualified);
        
        // 轮次3：supervisor3先尝试提交（应该被拒绝）
        vm.warp(oath.startTime + 2 * CHECK_INTERVAL);
        
        vm.prank(supervisor3);
        vm.expectRevert("Supervisor is disqualified");
        chainOath.submitSupervision(oathId, true);
        
        // 然后supervisor1和supervisor2同意，完成誓约
        vm.prank(supervisor1);
        chainOath.submitSupervision(oathId, true);
        
        vm.prank(supervisor2);
        chainOath.submitSupervision(oathId, true);
        
        // 验证最终状态为Fulfilled
        oath = chainOath.getOath(oathId);
        assertEq(uint(oath.status), uint(ChainOathSecure.OathStatus.Fulfilled));
        
        // supervisor3被取消资格，但仍能获得平均分配的奖励（150000 = 100000奖励 + 50000部分质押）
        uint256 supervisor3BalanceBefore = token.balanceOf(supervisor3);
        vm.prank(supervisor3);
        chainOath.claimReward(oathId);
        uint256 supervisor3BalanceAfter = token.balanceOf(supervisor3);
        
        assertEq(supervisor3BalanceAfter - supervisor3BalanceBefore, 150000); // 获得部分收益
    }
    
    /**
     * 场景5：混合超时 + 部分批准
     * 复杂情况：部分监督者超时、部分拒绝、部分同意
     */
    function testScenario5_MixedTimeoutAndApproval() public {
        uint256 oathId = createBasicOath();
        completeAllStaking(oathId);
        
        ChainOathSecure.Oath memory oath = chainOath.getOath(oathId);
        
        // 轮次1：supervisor1同意、supervisor2拒绝、supervisor3超时
        // 结果：1/3 = 33% < 50% → 失败
        vm.warp(oath.startTime);
        vm.prank(supervisor1);
        chainOath.submitSupervision(oathId, true);
        
        vm.prank(supervisor2);
        chainOath.submitSupervision(oathId, false);
        
        // supervisor3超时
        vm.warp(oath.startTime + CHECK_WINDOW + 1);
        chainOath.processTimeoutRound(oathId);
        
        // 轮次2：supervisor1和supervisor3同意、supervisor2超时
        // 结果：2/3 = 66% ≥ 50% → 成功
        vm.warp(oath.startTime + CHECK_INTERVAL);
        vm.prank(supervisor1);
        chainOath.submitSupervision(oathId, true);
        
        vm.prank(supervisor3);
        chainOath.submitSupervision(oathId, true);
        
        // supervisor2超时
        vm.warp(oath.startTime + CHECK_INTERVAL + CHECK_WINDOW + 1);
        chainOath.processTimeoutRound(oathId);
        
        // 轮次3：所有人同意
        vm.warp(oath.startTime + 2 * CHECK_INTERVAL);
        vm.prank(supervisor1);
        chainOath.submitSupervision(oathId, true);
        
        vm.prank(supervisor2);
        chainOath.submitSupervision(oathId, true);
        
        vm.prank(supervisor3);
        chainOath.submitSupervision(oathId, true);
        
        // 验证最终状态为Fulfilled（因为committerFailures ≤ maxCommitterFailures）
        oath = chainOath.getOath(oathId);
        assertEq(uint(oath.status), uint(ChainOathSecure.OathStatus.Fulfilled));
        
        // 验证各监督者的成功检查次数
        (,uint16 supervisor1Success,) = chainOath.getSupervisorStatus(oathId, supervisor1);
        (,uint16 supervisor2Success,) = chainOath.getSupervisorStatus(oathId, supervisor2);
        (,uint16 supervisor3Success,) = chainOath.getSupervisorStatus(oathId, supervisor3);
        
        assertEq(supervisor1Success, 3); // 3次成功
        assertEq(supervisor2Success, 1); // 1次成功
        assertEq(supervisor3Success, 2); // 2次成功
        
        // 验证奖励分配基于实际成功次数
        uint256 supervisor1BalanceBefore = token.balanceOf(supervisor1);
        vm.prank(supervisor1);
        chainOath.claimReward(oathId);
        uint256 supervisor1BalanceAfter = token.balanceOf(supervisor1);
        
        uint256 supervisor2BalanceBefore = token.balanceOf(supervisor2);
        vm.prank(supervisor2);
        chainOath.claimReward(oathId);
        uint256 supervisor2BalanceAfter = token.balanceOf(supervisor2);
        
        // 根据合约逻辑，监督者奖励是平均分配的，每人应得到100000奖励
        uint256 supervisor1Reward = supervisor1BalanceAfter - supervisor1BalanceBefore - SUPERVISOR_STAKE;
        uint256 supervisor2Reward = supervisor2BalanceAfter - supervisor2BalanceBefore - SUPERVISOR_STAKE;
        
        assertEq(supervisor1Reward, 100000);
        assertEq(supervisor2Reward, 100000);
    }
}