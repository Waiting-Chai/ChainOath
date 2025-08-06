// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../src/ChainOath.sol";

contract ChainOathTest is Test {
    ChainOath public chainOath;
    address public creater = address(0x1);
    address[] public supervisors = [address(0x2), address(0x3)];
    address[] public committers = [address(0x4), address(0x5)];
    uint16 public totalReward = 100;
    uint16 public committerStake = 2;
    uint16 public supervisorStake = 1;
    uint8 public supervisorRewardRatio = 10;
    uint8 public committerRewardRatio = 90;
    uint32 public checkInterval = 7 days;
    uint32 public checkWindow = 1 days;
    uint8 public checkThresholdPercent = 60;
    uint16 public maxSupervisorMisses = 3;
    uint16 public maxCommitterFailures = 5;
    uint32 public startTime = uint32(block.timestamp + 1 days);
    uint32 public endTime = uint32(block.timestamp + 31 days);

    function setUp() public {
        vm.deal(creater, 100 ether);
        for (uint i = 0; i < supervisors.length; i++) {
            vm.deal(supervisors[i], 100 ether);
        }
        for (uint i = 0; i < committers.length; i++) {
            vm.deal(committers[i], 100 ether);
        }

        vm.startPrank(creater);
        ChainOath.Oath memory oath_ = ChainOath.Oath({
            title: "Test Oath",
            description: "This is a test oath",
            committers: committers,
            supervisors: supervisors,
            rewardToken: address(0),
            totalReward: totalReward,
            committerStake: committerStake,
            supervisorStake: supervisorStake,
            supervisorRewardRatio: supervisorRewardRatio,
            committerRewardRatio: committerRewardRatio,
            checkInterval: checkInterval,
            checkWindow: checkWindow,
            checkThresholdPercent: checkThresholdPercent,
            maxSupervisorMisses: maxSupervisorMisses,
            maxCommitterFailures: maxCommitterFailures,
            startTime: startTime,
            endTime: endTime,
            checkRoundsCount: 0
        });
        chainOath = new ChainOath(oath_);
        payable(address(chainOath)).transfer(totalReward);
        vm.stopPrank();
    }

    function test_InitialState() public {
        (ChainOath.Oath memory oath, ChainOath.OathStatus status, uint32 round) = chainOath.getOathDetails();
        assertEq(chainOath.creater(), creater, "creater address mismatch");
        assertEq(uint(status), uint(ChainOath.OathStatus.Pending), "status mismatch");
        assertEq(oath.supervisors.length, supervisors.length, "supervisors length mismatch");
        assertEq(oath.committers.length, committers.length, "committers length mismatch");
    }

    function test_SupervisorSign() public {
        vm.startPrank(supervisors[0]);
        chainOath.supervisorSign021{value: supervisorStake}();
        vm.stopPrank();

        vm.startPrank(supervisors[1]);
        chainOath.supervisorSign021{value: supervisorStake}();
        vm.stopPrank();

        // Committers stake
        vm.startPrank(committers[0]);
        chainOath.committerStake{value: committerStake}();
        vm.stopPrank();
        vm.startPrank(committers[1]);
        chainOath.committerStake{value: committerStake}();
        vm.stopPrank();

        assertEq(uint(chainOath.status()), uint(ChainOath.OathStatus.Accepted), "status should be Accepted");
    }

    function test_CommitterStake() public {
        // First, all supervisors and committers complete their actions.
        _fullSetupAndStart();

        // After all staking and signing, and warping to the start time, the oath should start.
        assertEq(chainOath.currentCheckRound(), 1, "currentCheckRound should be 1 after start");
    }

    function test_SupervisorCheck_Success() public {
        // Setup: supervisors sign, committers stake, time moves to start
        _fullSetupAndStart();

        // Round 1: all supervisors vote success
        vm.startPrank(supervisors[0]);
        chainOath.supervisorCheck(true);
        vm.stopPrank();
        vm.startPrank(supervisors[1]);
        chainOath.supervisorCheck(true);
        vm.stopPrank();

        assertEq(chainOath.currentCheckRound(), 2, "currentCheckRound should be 2");
    }

    function test_SupervisorCheck_Failure() public {
        // Setup: supervisors sign, committers stake, time moves to start
        _fullSetupAndStart();

        // Round 1: enough supervisors vote failure to break the oath
        vm.startPrank(supervisors[0]);
        chainOath.supervisorCheck(false);
        vm.stopPrank();

        assertEq(uint(chainOath.status()), uint(ChainOath.OathStatus.Broken), "status should be Broken");
    }

    function _fullSetupAndStart() internal {
        // Supervisors sign
        vm.startPrank(supervisors[0]);
        chainOath.supervisorSign021{value: supervisorStake}();
        vm.stopPrank();
        vm.startPrank(supervisors[1]);
        chainOath.supervisorSign021{value: supervisorStake}();
        vm.stopPrank();

        // Committers stake
        vm.startPrank(committers[0]);
        chainOath.committerStake{value: committerStake}();
        vm.stopPrank();
        vm.startPrank(committers[1]);
        chainOath.committerStake{value: committerStake}();
        vm.stopPrank();

        vm.warp(startTime);
    }

    function test_FinalizeCheckRound() public {
        _fullSetupAndStart();

        // Round 1: only one supervisor votes
        vm.startPrank(supervisors[0]);
        chainOath.supervisorCheck(true);
        vm.stopPrank();

        // Move time past the check window
        vm.warp(startTime + checkWindow + 1);

        // Finalize the round
        chainOath.finalizeCheckRound();

        (uint16 s1f, uint16 s1m) = chainOath.getParticipantStatus(supervisors[0]);
        (uint16 s2f, uint16 s2m) = chainOath.getParticipantStatus(supervisors[1]);

        assertEq(s1m, 0, "supervisor 1 misses should be 0");
        assertEq(s2m, 1, "supervisor 2 misses should be 1");
        assertEq(chainOath.currentCheckRound(), 2, "currentCheckRound should be 2");
    }

    function test_SettleOath_Fulfilled() public {
        _fullSetupAndStart();

        // Simulate all rounds succeeding
        (ChainOath.Oath memory oath, ,) = chainOath.getOathDetails();
        uint16 totalRounds = oath.checkRoundsCount;
        for (uint i = 1; i <= totalRounds; i++) {
            vm.warp(startTime + (i - 1) * checkInterval);
            vm.startPrank(supervisors[0]);
            chainOath.supervisorCheck(true);
            vm.stopPrank();
            vm.startPrank(supervisors[1]);
            chainOath.supervisorCheck(true);
            vm.stopPrank();
        }

        vm.warp(endTime + 1);
        uint256 c0BalanceBefore = committers[0].balance;
        uint256 s0BalanceBefore = supervisors[0].balance;

        chainOath.settleOath();

        uint256 expectedCommitterGain = committerStake;
        uint256 reward = (totalReward * supervisorRewardRatio / 100) / supervisors.length;
        uint256 expectedSupervisorGain = supervisorStake + reward;

        assertEq(committers[0].balance, c0BalanceBefore + expectedCommitterGain, "committer 0 balance mismatch");
        assertEq(supervisors[0].balance, s0BalanceBefore + expectedSupervisorGain, "supervisor 0 balance mismatch");
    }

    function test_SettleOath_Broken() public {
        _fullSetupAndStart();

        // Round 1: failure
        vm.startPrank(supervisors[0]);
        chainOath.supervisorCheck(false);
        vm.stopPrank();

        vm.warp(endTime + 1);

        uint256 s0BalanceBefore = supervisors[0].balance;
        uint256 c0BalanceBefore = committers[0].balance;

        chainOath.settleOath();

        uint expectedSupervisorGain = supervisorStake + (committerStake * committers.length) / supervisors.length;

        assertEq(committers[0].balance, c0BalanceBefore, "committer 0 should have lost stake");
        assertEq(supervisors[0].balance, s0BalanceBefore + expectedSupervisorGain, "supervisor 0 balance mismatch");
    }
}