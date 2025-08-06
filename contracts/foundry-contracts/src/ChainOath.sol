// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "./Ownerable.sol";

/// @title ChainOath - A decentralized oath/commitment recorder
/// @notice This is a minimal scaffold version of the contract for compilation test

contract ChainOath is Ownerable {

    //  合约创建者
    address public immutable creater;
    uint16 public immutable createTime;

    //  总的配置
    Oath public oath;

    //  当前失约人失约次数
    mapping(address => uint16) public committerFailures;
    //  当前监督者失职次数
    mapping(address => uint16) public supervisorMisses;

    //  当前誓约的检查轮次
    uint16 public currentCheckRound;
    //  当前誓约状态
    OathStatus public status;

    //  轮次 => 监督者地址 => 是否签名
    mapping(uint16 => mapping(address => bool)) public checkSignatures; 
    //  所有检查轮次
    uint16[] public checkRounds; 

    /// @notice Enum representing the current status of an Oath
    enum OathStatus {
        Pending,    // 创建后尚未接受
        Accepted,   // 已被接受
        Fulfilled,  // 誓言已履行
        Broken      // 誓言未履行
    }

    /// @notice Struct representing an Oath between two parties
    struct Oath {
        string title;                     // 誓约标题
        string description;               // 誓约描述
        address[] committers;             // 守约人列表
        address[] supervisors;            // 监督者列表
        address rewardToken;              // 奖励代币地址
        uint16 totalReward;               // Creator 总质押奖励金额
        uint16 committerStake;            // 每位守约人需质押金额
        uint16 supervisorStake;           // 每位监督者需质押金额
        uint8 supervisorRewardRatio;      // 监督者奖励比例（如 10 表示 10%）
        uint8 committerRewardRatio;       // 守约人奖励比例（如 90 表示 90%）
        uint32 checkInterval;             // check 间隔（单位：秒）
        uint32 checkWindow;               // check 后签名时间窗口（单位：秒）
        uint8 checkThresholdPercent;      // 判定守约成功的监督者签名比例
        uint16 maxSupervisorMisses;       // 监督者最大允许失职次数
        uint16 maxCommitterFailures;      // 守约人最大允许失约次数
        uint32 startTime;                 // 誓约开始时间 （秒级时间戳）
        uint32 endTime;                   // 誓约结束时间 （秒级时间戳）
    }

    /// @notice Constructor to initialize the ChainOath contract with an Oath
    constructor(
        string      memory _title,
        string      memory _description,
        address[]   memory _committers,
        address[]   memory _supervisors,
        address            _rewardToken,
        uint16             _totalReward,
        uint16             _committerStake,
        uint16             _supervisorStake,
        uint8              _supervisorRewardRatio,
        uint8              _committerRewardRatio,
        uint32             _checkInterval,
        uint32             _checkWindow,
        uint8              _checkThresholdPercent,
        uint16             _maxSupervisorMisses,
        uint16             _maxCommitterFailures,
        uint32             _startTime,
        uint32             _endTime
    ) {
        //   检查构造合法性
        require(_committers.length > 0, "At least one committer is required");
        require(_supervisors.length > 0, "At least one supervisor is required");
        require(_totalReward > 0, "Total reward must be greater than zero");
        require(_committerStake > 0, "Committer stake must be greater than zero");
        require(_supervisorStake > 0, "Supervisor stake must be greater than zero");
        require(_supervisorRewardRatio + _committerRewardRatio == 100, "Reward ratios must sum to 100");
        require(_checkInterval > 0, "Check interval must be greater than zero");
        require(_checkWindow > 0, "Check window must be greater than zero");
        require(_checkThresholdPercent > 0 && _checkThresholdPercent <= 100, "Check threshold percent must be between 1 and 100");
        require(_maxSupervisorMisses > 0, "Max supervisor misses must be greater than zero");
        require(_maxCommitterFailures > 0, "Max committer failures must be greater than zero");
        require(_startTime < _endTime, "Start time must be before end time");
        require(_startTime >= block.timestamp, "Start time must be in the future");

        creater = msg.sender;
        createTime = uint16(block.timestamp);
        status = OathStatus.Pending;
        currentCheckRound = 0;

        oath = Oath({
            title:                 _title,
            description:           _description,
            committers:            _committers,
            supervisors:           _supervisors,
            rewardToken:           _rewardToken,
            totalReward:           _totalReward,
            committerStake:        _committerStake,
            supervisorStake:       _supervisorStake,
            supervisorRewardRatio: _supervisorRewardRatio,
            committerRewardRatio:  _committerRewardRatio,
            checkInterval:         _checkInterval,
            checkWindow:           _checkWindow,
            checkThresholdPercent: _checkThresholdPercent,
            maxSupervisorMisses:   _maxSupervisorMisses,
            maxCommitterFailures:  _maxCommitterFailures,
            startTime:             _startTime,
            endTime:               _endTime
        });

        //   初始化检查轮次
        uint32 timeSpan = oath.endTime - oath.startTime;
        //   向上取整
        uint32 totalRounds = uint32((timeSpan + oath.checkInterval - 1) / oath.checkInterval);
        for (uint32 i = 0; i <= totalRounds; i++) {
            //   这里会多一轮出来是因为 从 0->1 这一轮算是让监督者签名来同意监督， 并需要质押一定的金额
            //   之后的 1->2 这一轮才是第一个真正的检查点， 如果后面监督发现0->1没签名， 则直接视为无效
            checkRounds.push(uint16(i));
        }
    }

    /// @notice Function to allow a supervisor to sign and agree to the current Oath
    /// @dev This function can be called by a supervisor to indicate their agreement to the Oath
    /// @dev It will update the check signatures for the current round
    /// @dev The function should be called within the check window after the check interval
    /// @dev The function will revert if the caller is not a supervisor or if the check
    function supervisorSign021() external onlySupervisor() {
        //   监督着签署 0->1 round, 并质押合约配置中协定的金额
    }

    /// @notice The contract creator takes away all the remaining value when the contract status ends
    function createrWithdrawRmaining() external onlyOwner() {
        //   合约创建者在合约状态结束后， 如果还有剩余价值， 可以从合约中把剩余的金额领走， 因为誓约可能守约者违约
        require(block.timestamp > oath.startTime, "This Oath is not started yet");
        require(status == OathStatus.Fulfilled || status == OathStatus.Broken, "Oath is still active");
        require(oath.totalReward > 0, "No remaining reward to withdraw");
    }

    /// @notice Modifier to ensure that only the contract owner can call certain functions
    modifier onlySupervisor() {
        bool isSupervisor = false;
        for (uint i = 0; i < oath.supervisors.length; i++) {
            if (oath.supervisors[i] == msg.sender) {
                isSupervisor = true;
                break;
            }
        }
        require(isSupervisor, "Only supervisors can call this function");
        _;
    }

    /// @notice Modifier to ensure that only Participants who have signed for the 0 round can call certain functions
    modifier onlySignd021() {
        require(checkSignatures[0][msg.sender], "Participant has not signed for 0 round");
        _;
    }

}