// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "./Ownerable.sol";

/// @title ChainOath - 去中心化誓约/承诺记录器
/// @notice 这是一个用于编译测试的最小脚手架版本合约

contract ChainOath is Ownerable {

    // 事件定义
    event CheckRoundStarted(uint16 indexed roundId, uint32 startTime, uint32 endTime);
    event SupervisorSigned(uint16 indexed roundId, address indexed supervisor, bool result);
    event CommitterFailed(address indexed committer, uint16 failures);
    event SupervisorMissed(address indexed supervisor, uint16 misses);
    event OathStatusChanged(OathStatus previousStatus, OathStatus newStatus); 

    //  合约创建者
    address public immutable creater;
    uint16 public immutable createTime;
    //  誓约是否已结算
    bool public settled;
    //  总的配置
    Oath public oath;

    //  当前誓约的检查轮次
    uint16 public currentCheckRound;
    //  当前誓约状态
    OathStatus public status;
    //  监督者是否在第0轮签名并质押
    bool public allSupervisorsSigned0;
    //  所有守约者是否已质押
    bool public allCommittersStaked;

    //  每个角色质押的资产
    mapping(address => uint16) public roleStakes; 

    //  角色映射
    mapping(address => bool) public isSupervisor;
    mapping(address => bool) public isCommitter;

    //  轮次 => 监督者地址 => 是否签名
    mapping(uint16 => mapping(address => bool)) public checkSignatures; 
    //  轮次 => 已签名的监督者数量
    mapping(uint16 => uint16) public roundSignatureCount;

    //  轮次 => 监督者地址 => 守约者地址 => 是否成功
    mapping(uint16 => mapping(address => mapping(address => bool))) public checkResults; 


    /// @notice 表示誓约当前状态的枚举
    enum OathStatus {
        Pending,    // 创建后尚未接受
        Accepted,   // 已被接受
        Fulfilled,  // 誓言已履行
        Broken,     // 誓言未履行
        Aborted     // 因为种种原因被废止了
    }

    /// @notice 表示多方之间誓约的结构体
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
        uint16 checkRoundsCount;          // 总检查轮数
    }

    /// @notice 使用誓约信息初始化ChainOath合约的构造函数
    constructor(Oath memory _oath) payable {
        //   检查构造合法性
        require(_oath.committers.length > 0, "At least one committer is required");
        require(_oath.supervisors.length > 0, "At least one supervisor is required");
        require(_oath.totalReward > 0, "Total reward must be greater than zero");
        require(_oath.committerStake > 0, "Committer stake must be greater than zero");
        require(_oath.supervisorStake > 0, "Supervisor stake must be greater than zero");
        require(_oath.supervisorRewardRatio + _oath.committerRewardRatio == 100, "Reward ratios must sum to 100");
        require(_oath.checkInterval > 0, "Check interval must be greater than zero");
        require(_oath.checkWindow > 0, "Check window must be greater than zero");
        require(_oath.checkThresholdPercent > 0 && _oath.checkThresholdPercent <= 100, "Check threshold percent must be between 1 and 100");
        require(_oath.maxSupervisorMisses > 0, "Max supervisor misses must be greater than zero");
        require(_oath.maxCommitterFailures > 0, "Max committer failures must be greater than zero");
        require(_oath.startTime < _oath.endTime, "Start time must be before end time");
        require(_oath.startTime >= block.timestamp, "Start time must be in the future");
        require(msg.value >= _oath.totalReward, "The creator must pledge the stipulated amount");

        //   创建者质押奖励
        roleStakes[msg.sender] = _oath.totalReward;

        creater = msg.sender;
        createTime = uint16(block.timestamp);
        status = OathStatus.Pending;
        currentCheckRound = 0;

        oath = _oath;

        for (uint i = 0; i < _oath.supervisors.length; i++) {
            isSupervisor[_oath.supervisors[i]] = true;
        }
        for (uint i = 0; i < _oath.committers.length; i++) {
            isCommitter[_oath.committers[i]] = true;
        }

        //   初始化检查轮次
        uint32 timeSpan = oath.endTime - oath.startTime;
        uint32 totalRounds = (timeSpan + oath.checkInterval - 1) / oath.checkInterval;
        oath.checkRoundsCount = uint16(totalRounds);


        //   todo  初始化资金分赃比例 


    }

    /// @notice 允许监督者签署并同意当前誓约的函数
    /// @dev 监督者可以调用此函数表示同意监督该誓约
    /// @dev 函数将更新当前轮次的签名状态
    /// @dev 函数应在检查间隔后的检查窗口内调用
    /// @dev 如果调用者不是监督者或检查条件不满足，函数将回退
    function supervisorSign021() external payable onlySupervisor() {
        require(status == OathStatus.Pending, "Oath not in pending state");
        require(!checkSignatures[0][msg.sender], "Supervisor already signed");
        require(msg.value == oath.supervisorStake, "Incorrect stake amount");
        require(block.timestamp > oath.startTime, "The oath has already begun");

        checkSignatures[0][msg.sender] = true;
        roundSignatureCount[0]++;
        roleStakes[msg.sender] += oath.supervisorStake;

        if (roundSignatureCount[0] == oath.supervisors.length) {
            allSupervisorsSigned0 = true;
        }

        if (allSupervisorsSigned0 && allCommittersStaked) {
            status = OathStatus.Accepted;
            emit OathStatusChanged(OathStatus.Pending, OathStatus.Accepted);
            checkAndStartOath();
        }
    }

    /// @notice 守约人签署并质押参与誓约的函数
    function committerSign021() external payable onlyCommitter() {
        require(status == OathStatus.Pending, "Oath not in pending state");
        require(roleStakes[msg.sender] >= oath.committerStake, "Committer already signed");
        require(msg.value == oath.committerStake, "Incorrect stake amount");
        require(block.timestamp > oath.startTime, "The oath has already begun");

        checkSignatures[0][msg.sender] = true;
        roleStakes[msg.sender] += oath.committerStake;

        bool allStaked = true;
        for (uint i = 0; i < oath.committers.length; i++) {
            if ( roleStakes[oath.committers[i]] < oath.committerStake ) {
                allStaked = false;
                break;
            }
        }

        if ( allStaked ) {
            allCommittersStaked = true;
        }

        if (allSupervisorsSigned0 && allCommittersStaked) {
            status = OathStatus.Accepted;
            emit OathStatusChanged(OathStatus.Pending, OathStatus.Accepted);
            checkAndStartOath();
        }
    }

    /// @notice 合约创建者在合约状态结束后提取所有剩余价值
    function createrWithdrawRmaining() external onlyOwner() {
        require(
            status == OathStatus.Fulfilled || status == OathStatus.Broken 
                || status == OathStatus.Pending || status == OathStatus.Aborted,
            "Oath status is not correct for withdrawal"
        );

        if (status == OathStatus.Pending) {
            refundTheMoneyBeforeItStarts();

        } else {
            require(settled, "Oath not settled yet");

            //   todo
            //   如果合约已经结算了， 如果是守约者失约， 那么创建者可以拿走因为违约产生的所有奖励， 包括 守约者质押， 不称职的监督者质押
            //   如果守约者成功守约， 创建者能拿走不称职的监督者的质押




        }

    }

    /// @notice 监督者在合约状态结束后提取剩余奖励
    function supervisorWithdrawRmaining() external onlySupervisor() {
        require(
            status == OathStatus.Fulfilled || status == OathStatus.Broken 
                || status == OathStatus.Pending || status == OathStatus.Aborted,
            "Oath status is not correct for withdrawal"
        );

        if (status == OathStatus.Pending) {
            refundTheMoneyBeforeItStarts();

        } else {
            require(settled, "Oath not settled yet");

            //   todo
            //   如果合约已经结算了， 校验监督者在这个阶段里面是否称职 （不称职次数 > oath.maxSupervisorMisses 为不称职）
            //   称职的监督者可以拿回自己的质押 （这里不算奖励， 奖励会在每次监督者验证签名之后直接发放）


        }

    }

    /// @notice 守约者在合约状态结束后提取剩余奖励
    function committerWithdrawRemining() external onlyCommitter() {
        require(
            status == OathStatus.Fulfilled || status == OathStatus.Broken 
                || status == OathStatus.Pending || status == OathStatus.Aborted,
            "Oath status is not correct for withdrawal"
        );

        if (status == OathStatus.Pending) {
            refundTheMoneyBeforeItStarts();

        } else {
            require(settled, "Oath not settled yet");

            //   todo
            //   如果合约已经结算了， 校验守约者在这个阶段里面是否称职 （不称职次数 < oath.maxCommitterFailures 为称职）
            //   称职的守约者可以拿回自己的质押 （这里不算奖励， 奖励会在每次监督者验证签名之后直接发放）


        }

    }


    
    ///  @notice 监督者在检查周期内对守约人表现进行评估
    function supervisorCheck(address[] calldata addresses, bool[] calldata results) external onlySupervisor() {
        require(status == OathStatus.Accepted, "Oath not in accepted state");
        require(addresses.length == results.length, "Mismatched input lengths");
        require(currentCheckRound > 0 && currentCheckRound <= oath.checkRoundsCount, "Not a valid check round");

        uint32 time = block.timestamp;
        uint32 diffWithStartTime = time - oath.startTime;
        //   算出来的当前时间点所处的检查轮次
        uint16 index = diffWithStartTime / oath.checkInterval;
        require(index <= oath.checkRoundsCount, "Check round out of bounds");
        require(!checkSignatures[index][msg.sender], "Supervisor has already signed in this round");

        uint32 timeShouldSignWindow = oath.startTime + index * oath.checkInterval + oath.checkWindow;
        require(time <= timeShouldSignWindow, "Check window has passed");

        //   开始评估逻辑
        if (index >= currentCheckRound) {
            currentCheckRound = index;
            emit CheckRoundStarted(currentCheckRound, uint32(block.timestamp), uint32(block.timestamp + oath.checkWindow));
        }

        checkSignatures[index][msg.sender] = true;
        roundSignatureCount[index] ++;

        for (uint i = 0; i < addresses.length; i ++) {
            require(isCommitter[addresses[i]], "Address is not a committer");

            
        }

    }

    




    function checkAndStartOath() internal {
        require(status == OathStatus.Accepted, "Oath not accepted");
        require(currentCheckRound == 0, "Check has already started");

        currentCheckRound = 1;
        emit CheckRoundStarted(1, uint32(block.timestamp), uint32(block.timestamp + oath.checkWindow));
    }

    /// @notice 如果合约超过了规定开始时间还没有开始， 各个角色可以拿走自己的质押
    function refundTheMoneyBeforeItStarts() internal {
        //   如果合约还没有开始， 则创建者智能拿走本属于他的哪部分质押
        require( block.timestamp > oath.startTime, "The oath has not been invalidated yet" );
        require(status == OathStatus.Pending, "Oath not in pending state");

        uint16 withdrawNums = roleStakes[msg.sender];
        require(withdrawNums > 0, "No stake to withdraw");
        roleStakes[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: withdrawNums}("");
        require(success, "Withdrawal failed");
        status = OathStatus.Aborted;
        emit OathStatusChanged(status, OathStatus.Aborted); 
    }

    /// @notice 确保只有监督者可以调用特定函数的修饰器
    modifier onlySupervisor() {
        require(isSupervisor[msg.sender], "Only supervisors can call this function");
        _;
    }

    /// @notice 确保只有已签署0轮次的参与者可以调用特定函数的修饰器
    modifier onlySignd021() {
        require(checkSignatures[0][msg.sender], "Participant has not signed the initial round");
        _;
    }
    
    /// @notice 确保只有守约人可以调用特定函数的修饰器
    modifier onlyCommitter() {
        require(isCommitter[msg.sender], "Only committers can call this function");
        _;
    }

}