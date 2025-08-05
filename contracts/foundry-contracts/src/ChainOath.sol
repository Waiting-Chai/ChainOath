// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

/// @title ChainOath - A decentralized oath/commitment recorder
/// @notice This is a minimal scaffold version of the contract for compilation test

contract ChainOath {

    //  合约创建者
    address public immutable creater;
    //  总的配置
    Oath public oath;
    //  当前失约人失约次数
    mapping(address => uint256) public committerFailures;
    //  当前监督者失职次数
    mapping(address => uint256) public supervisorMisses;

    //  当前誓约状态
    OathStatus public status = OathStatus.Pending;

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
        uint256 totalReward;              // Creator 总质押奖励金额
        uint256 committerStake;           // 每位守约人需质押金额
        uint256 supervisorStake;          // 每位监督者需质押金额
        uint256 supervisorRewardRatio;    // 监督者奖励比例（如 10 表示 10%）
        uint256 committerRewardRatio;     // 守约人奖励比例（如 90 表示 90%）
        uint256 checkInterval;            // check 间隔（单位：秒）
        uint256 checkWindow;              // check 后签名时间窗口（单位：秒）
        uint256 checkThresholdPercent;    // 判定守约成功的监督者签名比例
        uint256 maxSupervisorMisses;      // 监督者最大允许失职次数
        uint256 maxCommitterFailures;     // 守约人最大允许失约次数
        uint256 startTime;                // 誓约开始时间
        uint256 endTime;                  // 誓约结束时间
    }

    /// @notice Constructor to initialize the ChainOath contract with an Oath
    constructor(
        string      memory _title,
        string      memory _description,
        address[]   memory _committers,
        address[]   memory _supervisors,
        address            _rewardToken,
        uint256            _totalReward,
        uint256            _committerStake,
        uint256            _supervisorStake,
        uint256            _supervisorRewardRatio,
        uint256            _committerRewardRatio,
        uint256            _checkInterval,
        uint256            _checkWindow,
        uint256            _checkThresholdPercent,
        uint256            _maxSupervisorMisses,
        uint256            _maxCommitterFailures,
        uint256            _startTime,
        uint256            _endTime
    ) {
        creater = msg.sender;

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
    }




}