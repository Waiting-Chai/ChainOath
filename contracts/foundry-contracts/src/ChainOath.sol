// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "./Ownerable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ChainOath - 去中心化誓约/承诺记录器
/// @notice 这是一个用于编译测试的最小脚手架版本合约

contract ChainOath is Ownerable, ReentrancyGuard {

    /// @notice 监督者检查结果结构体
    struct CheckResult {
        address committer;  // 守约者地址
        bool result;        // 评估结果
    }

    // 事件定义
    event CheckRoundStarted(uint16 indexed roundId, uint32 startTime, uint32 endTime);
    event SupervisorSigned(uint16 indexed roundId, address indexed supervisor, bool result);
    event CommitterFailed(address indexed committer, uint16 failures);
    event SupervisorMissed(address indexed supervisor, uint16 misses);
    event OathStatusChanged(OathStatus previousStatus, OathStatus newStatus); 

    //  合约创建者
    address public immutable creator;
    uint32 public immutable createTime;
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
    mapping(address => uint256) public roleStakes; 

    //  角色映射
    mapping(address => bool) public isSupervisor;
    mapping(address => bool) public isCommitter;

    //  轮次 => 监督者地址 => 是否签名
    mapping(uint16 => mapping(address => bool)) public checkSignatures; 
    //  轮次 => 已签名的监督者数量
    mapping(uint16 => uint16) public roundSignatureCount;
    //  轮次 => 监督者地址 => 守约者地址 => 是否成功
    mapping(uint16 => mapping(address => mapping(address => bool))) public checkResults; 
    
    //  监督者失职次数统计
    mapping(address => uint16) public supervisorMisses;
    //  守约者失约次数统计  
    mapping(address => uint16) public committerFailures;
    //  监督者已获得的奖励次数
    mapping(address => uint16) public supervisorRewardCount;
    //  轮次 => 是否已结算奖励
    mapping(uint16 => bool) public roundRewardSettled; 

    /// @notice 表示誓约当前状态的枚举
    enum OathStatus {
        Pending,    // 创建后尚未接受
        Accepted,   // 已被接受
        Fulfilled,  // 誓言已履行
        Broken,     // 誓言未履行
        Aborted,    // 因为种种原因被废止了
        Cancelled   // 已取消
    }

    /// @notice 表示多方之间誓约的结构体
    struct Oath {
        string title;                     // 誓约标题
        string description;               // 誓约描述
        address[] committers;             // 守约人列表
        address[] supervisors;            // 监督者列表
        address rewardToken;              // 奖励代币地址
        uint256 totalReward;              // Creator 总质押奖励金额
        uint256 committerStake;           // 每位守约人需质押金额
        uint256 supervisorStake;          // 每位监督者需质押金额
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
        require(msg.value == _oath.totalReward, "The creator must pledge the exact amount");

        //   创建者质押奖励
        roleStakes[msg.sender] = _oath.totalReward;

        creator = msg.sender;
        createTime = uint32(block.timestamp);
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

        //   初始化各角色的失职/失约次数为0
        for (uint i = 0; i < _oath.supervisors.length; i++) {
            supervisorMisses[_oath.supervisors[i]] = 0;
            supervisorRewardCount[_oath.supervisors[i]] = 0;
        }
        for (uint i = 0; i < _oath.committers.length; i++) {
            committerFailures[_oath.committers[i]] = 0;
        }
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
        require(block.timestamp < oath.startTime, "The oath has already begun");

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

    /// @notice 守约人质押参与誓约的函数
    function committerStake() external payable onlyCommitter() {
        require(status == OathStatus.Pending, "Oath not in pending state");
        require(roleStakes[msg.sender] == 0, "Committer already staked");
        require(msg.value == oath.committerStake, "Incorrect stake amount");
        require(block.timestamp < oath.startTime, "The oath has already begun");

        roleStakes[msg.sender] = oath.committerStake;

        // 检查是否所有守约人都已质押
        bool allStaked = true;
        for (uint i = 0; i < oath.committers.length; i++) {
            if (roleStakes[oath.committers[i]] < oath.committerStake) {
                allStaked = false;
                break;
            }
        }

        if (allStaked) {
            allCommittersStaked = true;
        }

        // 如果所有监督者都已签名且所有守约人都已质押，则开始誓约
        if (allSupervisorsSigned0 && allCommittersStaked) {
            status = OathStatus.Accepted;
            emit OathStatusChanged(OathStatus.Pending, OathStatus.Accepted);
            checkAndStartOath();
        }
    }

    /// @notice 合约创建者在合约状态结束后提取所有剩余价值
    function createrWithdrawRmaining() external onlyOwner() nonReentrant {
        require(
            status == OathStatus.Fulfilled || status == OathStatus.Broken 
                || status == OathStatus.Pending || status == OathStatus.Aborted,
            "Oath status is not correct for withdrawal"
        );

        if (status == OathStatus.Pending) {
            refundTheMoneyBeforeItStarts();

        } else {
            require(settled, "Oath not settled yet");

            // 创建者可以提取的资金：
            // 1. 如果守约者失约，创建者可以拿走剩余的奖励池
            // 2. 不称职监督者的质押金
            uint256 withdrawAmount = 0;
            
            // 计算不称职监督者的质押金
            for (uint i = 0; i < oath.supervisors.length; i++) {
                address supervisor = oath.supervisors[i];
                if (supervisorMisses[supervisor] > oath.maxSupervisorMisses) {
                    withdrawAmount += oath.supervisorStake;
                }
            }
            
            // 如果是守约失败状态，创建者还可以拿走未分配的奖励池余额
            if (status == OathStatus.Broken) {
                // 计算已分配给监督者的奖励
                uint256 distributedRewards = 0;
                for (uint i = 0; i < oath.supervisors.length; i++) {
                    distributedRewards += supervisorRewardCount[oath.supervisors[i]] * 
                        ((oath.totalReward * oath.supervisorRewardRatio / 100)
                        / oath.checkRoundsCount / get021Supervisors());
                }
                
                // 剩余的奖励池资金
                uint256 remainingRewards = oath.totalReward > distributedRewards ? 
                    oath.totalReward - distributedRewards : 0;
                withdrawAmount += remainingRewards;
            }
            
            require(withdrawAmount > 0, "Nothing to withdraw");
            
            // Effects: 先修改状态
            roleStakes[msg.sender] = 0;
            
            // Interactions: 最后进行外部调用
            (bool success, ) = payable(msg.sender).call{value: withdrawAmount}("");
            require(success, "Creator withdrawal failed");
        }

    }

    /// @notice 监督者在合约状态结束后提取剩余奖励
    function supervisorWithdrawRmaining() external onlySupervisor() nonReentrant {
        require(
            status == OathStatus.Fulfilled || status == OathStatus.Broken 
                || status == OathStatus.Pending || status == OathStatus.Aborted,
            "Oath status is not correct for withdrawal"
        );

        if (status == OathStatus.Pending) {
            refundTheMoneyBeforeItStarts();

        } else {
            require(settled, "Oath not settled yet");

            // 监督者可以提取的资金：
            // 1. 如果监督者称职（未超过最大失职次数），可以拿走质押金
            // 2. 监督者的奖励（基于参与检查的次数）
            uint256 withdrawAmount = 0;
            
            // 如果监督者称职，返还质押金
            if (supervisorMisses[msg.sender] <= oath.maxSupervisorMisses) {
                withdrawAmount += oath.supervisorStake;
            }
            
            // 计算监督者的奖励
            // 首先计算实际参与质押的监督者数量
            uint256 qualifiedSupervisorCount = get021Supervisors();
            
            if (qualifiedSupervisorCount > 0) {
                 // 每个监督者的奖励 = 总监督者奖励池 / 实际参与的监督者数量
                 uint256 totalSupervisorReward = oath.totalReward * oath.supervisorRewardRatio / 100;
                 uint256 supervisorReward = totalSupervisorReward / qualifiedSupervisorCount;
                 withdrawAmount += supervisorReward;
             }
            
            require(withdrawAmount > 0, "Nothing to withdraw");
            
            // Effects: 先修改状态
            roleStakes[msg.sender] = 0;
            
            // Interactions: 最后进行外部调用
            (bool success, ) = payable(msg.sender).call{value: withdrawAmount}("");
            require(success, "Supervisor withdrawal failed");
        }

    }

    /// @notice 守约者在合约状态结束后提取剩余奖励
    function committerWithdrawRemining() external onlyCommitter() nonReentrant {
        require(
            status == OathStatus.Fulfilled || status == OathStatus.Broken 
                || status == OathStatus.Pending || status == OathStatus.Aborted,
            "Oath status is not correct for withdrawal"
        );

        if (status == OathStatus.Pending) {
            refundTheMoneyBeforeItStarts();

        } else {
            require(settled, "Oath not settled yet");

            // 守约者可以提取的资金：
            // 1. 如果守约成功（状态为Fulfilled），可以拿走质押金和奖励
            // 2. 如果守约失败（状态为Broken），质押金被没收，无法提取
            uint256 withdrawAmount = 0;
            
            if (status == OathStatus.Fulfilled) {
                // 守约成功，返还质押金
                withdrawAmount += oath.committerStake;
                
                // 计算守约者的奖励（剩余奖励池的一部分）
                uint256 committerRewardPool = oath.totalReward * (100 - oath.supervisorRewardRatio) / 100;
                uint256 committerReward = committerRewardPool / oath.committers.length;
                withdrawAmount += committerReward;
            }
            
            require(withdrawAmount > 0, "Nothing to withdraw");
            
            // Effects: 先修改状态
            roleStakes[msg.sender] = 0;
            
            // Interactions: 最后进行外部调用
            (bool success, ) = payable(msg.sender).call{value: withdrawAmount}("");
            require(success, "Committer withdrawal failed");
        }

    }
    
    /// @notice 监督者在检查周期内对守约人表现进行评估（对每个守约者分别评估）
    /// @param results 对每个守约者的评估结果结构体数组
    function supervisorCheck(CheckResult[] calldata results) external onlySupervisor() {
        require(status == OathStatus.Accepted, "Oath not in accepted state");
        require(currentCheckRound > 0 && currentCheckRound <= oath.checkRoundsCount, "Not a valid check round");
        require(results.length == oath.committers.length, "Results array length must match committers count");

        uint32 time = uint32(block.timestamp);
        uint32 diffWithStartTime = time - oath.startTime;
        //   算出来的当前时间点所处的检查轮次
        uint16 index = uint16(diffWithStartTime / oath.checkInterval) + 1;
        require(index <= oath.checkRoundsCount, "Check round out of bounds");
        require(!checkSignatures[index][msg.sender], "Supervisor has already signed in this round");

        uint32 timeShouldSignWindow = oath.startTime + (index - 1) * oath.checkInterval + oath.checkWindow;
        require(time <= timeShouldSignWindow, "Check window has passed");

        //   开始评估逻辑
        if (index > currentCheckRound) {
            currentCheckRound = index;
            emit CheckRoundStarted(currentCheckRound, uint32(block.timestamp), uint32(block.timestamp + oath.checkWindow));
        }

        checkSignatures[index][msg.sender] = true;
        roundSignatureCount[index]++;

        // 验证并记录每个守约人的评估结果
        for (uint i = 0; i < results.length; i++) {
            address committer = results[i].committer;
            bool result = results[i].result;
            
            // 验证committer地址是否为有效的守约者
            require(isCommitter[committer], "Invalid committer address");
            
            // 记录评估结果
            checkResults[index][msg.sender][committer] = result;
            
            // 发出事件
            emit SupervisorSigned(index, msg.sender, result);
        }
        
        // 检查是否达到阈值，如果失败比例过高则直接设置为违约状态
        _checkRoundResult(index);
        
        // 检查是否所有监督者都已投票，如果是且结果为成功，则进入下一轮
        if (roundSignatureCount[index] == oath.supervisors.length && status != OathStatus.Broken) {
            // 所有监督者都已投票且没有违约，检查是否完成所有轮次
            if (index >= oath.checkRoundsCount) {
                // 所有轮次完成，设置为履行状态
                status = OathStatus.Fulfilled;
                emit OathStatusChanged(OathStatus.Accepted, OathStatus.Fulfilled);
            } else {
                // 还有下一轮，推进到下一轮
                currentCheckRound = index + 1;
                emit CheckRoundStarted(currentCheckRound, uint32(block.timestamp), uint32(block.timestamp + oath.checkWindow));
            }
        }
    }

    function checkAndStartOath() internal {
        require(status == OathStatus.Accepted, "Oath not accepted");
        require(currentCheckRound == 0, "Check has already started");

        currentCheckRound = 1;
        emit CheckRoundStarted(1, uint32(block.timestamp), uint32(block.timestamp + oath.checkWindow));
    }
    
    /// @notice 检查当前轮次的结果，判断是否需要更新誓约状态
    function _checkRoundResult(uint16 roundId) internal {
        uint16 failureVotes = 0;
        uint16 totalVotes = 0;
        
        // 统计每个监督者的投票情况
        for (uint i = 0; i < oath.supervisors.length; i++) {
            if (checkSignatures[roundId][oath.supervisors[i]]) {
                totalVotes++;
                bool supervisorResult = true;
                // 检查该监督者对所有守约者的评估，如果有任何一个失败则认为该监督者投票失败
                for (uint j = 0; j < oath.committers.length; j++) {
                    if (!checkResults[roundId][oath.supervisors[i]][oath.committers[j]]) {
                        supervisorResult = false;
                        break;
                    }
                }
                if (!supervisorResult) {
                    failureVotes++;
                }
            }
        }
        
        // 如果失败投票比例超过阈值，设置为违约状态
        if (totalVotes > 0 && (failureVotes * 100 / totalVotes) >= (100 - oath.checkThresholdPercent)) {
            status = OathStatus.Broken;
            emit OathStatusChanged(OathStatus.Accepted, OathStatus.Broken);
            
            // 记录每个守约者的失约次数（基于所有监督者的评估）
            for (uint i = 0; i < oath.committers.length; i++) {
                address committer = oath.committers[i];
                uint16 committerFailureVotes = 0;
                uint16 committerTotalVotes = 0;
                
                // 统计对该守约者的失败投票
                for (uint j = 0; j < oath.supervisors.length; j++) {
                    if (checkSignatures[roundId][oath.supervisors[j]]) {
                        committerTotalVotes++;
                        if (!checkResults[roundId][oath.supervisors[j]][committer]) {
                            committerFailureVotes++;
                        }
                    }
                }
                
                // 如果该守约者的失败比例超过阈值，增加其失约次数
                if (committerTotalVotes > 0 && (committerFailureVotes * 100 / committerTotalVotes) >= (100 - oath.checkThresholdPercent)) {
                    committerFailures[committer]++;
                    emit CommitterFailed(committer, committerFailures[committer]);
                }
            }
        }
    }
     
    /// @notice 结算当前检查轮次，处理未签名的监督者
    function finalizeCheckRound() external {
        require(status == OathStatus.Accepted, "Oath not in accepted state");
        require(currentCheckRound > 0 && currentCheckRound <= oath.checkRoundsCount, "Invalid check round");
        
        uint32 currentTime = uint32(block.timestamp);
        uint32 roundEndTime = oath.startTime + (currentCheckRound - 1) * oath.checkInterval + oath.checkWindow;
        require(currentTime > roundEndTime, "Check window has not ended yet");
        require(!roundRewardSettled[currentCheckRound], "Round already finalized");
        
        // 处理未签名的监督者，增加其失职次数
        for (uint i = 0; i < oath.supervisors.length; i++) {
            address supervisor = oath.supervisors[i];
            if (!checkSignatures[currentCheckRound][supervisor]) {
                supervisorMisses[supervisor]++;
                emit SupervisorMissed(supervisor, supervisorMisses[supervisor]);
                
                // 如果失职次数超过限制，该监督者将失去所有质押
                if (supervisorMisses[supervisor] > oath.maxSupervisorMisses) {
                    // 监督者质押将在最终结算时处理
                }
            } else {
                // 记录已签名的监督者（奖励在最终结算时发放）
                supervisorRewardCount[supervisor]++;
            }
        }
        
        roundRewardSettled[currentCheckRound] = true;
        
        // 检查是否完成所有轮次
        if (currentCheckRound >= oath.checkRoundsCount) {
            // 所有轮次完成，设置为履行状态
            status = OathStatus.Fulfilled;
            emit OathStatusChanged(OathStatus.Accepted, OathStatus.Fulfilled);
        } else {
            // 还有下一轮，推进到下一轮
            currentCheckRound++;
            emit CheckRoundStarted(currentCheckRound, uint32(block.timestamp), uint32(block.timestamp + oath.checkWindow));
        }
    }
    
    /// @notice 结算誓约，分配最终奖励和质押
    function settleOath() external {
        require(
            status == OathStatus.Fulfilled || status == OathStatus.Broken,
            "Oath not ready for settlement"
        );
        require(!settled, "Oath already settled");
        require(block.timestamp >= oath.endTime, "Oath period not ended yet");
        
        settled = true;
        
        if (status == OathStatus.Fulfilled) {
            // 守约成功的情况
            // 1. 称职的监督者取回质押和总奖励
            // 首先计算实际参与质押的监督者数量
            uint256 qualifiedSupervisorCount = 0;
            for (uint i = 0; i < oath.supervisors.length; i++) {
                if (roleStakes[oath.supervisors[i]] > 0) {
                    qualifiedSupervisorCount++;
                }
            }
            
            for (uint i = 0; i < oath.supervisors.length; i++) {
                address supervisor = oath.supervisors[i];
                if (supervisorMisses[supervisor] <= oath.maxSupervisorMisses && roleStakes[supervisor] > 0) {
                     uint256 supervisorReward = 0;
                     if (qualifiedSupervisorCount > 0) {
                         // 每个监督者的奖励 = 总监督者奖励池 / 实际参与的监督者数量
                         uint256 totalSupervisorReward = oath.totalReward * oath.supervisorRewardRatio / 100;
                         supervisorReward = totalSupervisorReward / qualifiedSupervisorCount;
                     }
                     uint256 totalReturn = oath.supervisorStake + supervisorReward;
                     // Effects: 先修改状态
                     roleStakes[supervisor] = 0; // 清零质押记录
                     // Interactions: 最后进行外部调用
                     if (totalReturn > 0) {
                         (bool success, ) = payable(supervisor).call{value: totalReturn}("");
                         require(success, "Supervisor return failed");
                     }
                 }
            }
            
            // 2. 守约者取回质押和奖励
            uint256 committerRewardPool = oath.totalReward * (100 - oath.supervisorRewardRatio) / 100;
            uint256 committerReward = committerRewardPool / oath.committers.length;
            
            for (uint i = 0; i < oath.committers.length; i++) {
                address committer = oath.committers[i];
                if (committerFailures[committer] <= oath.maxCommitterFailures) {
                    uint256 totalReturn = oath.committerStake + committerReward;
                    // Effects: 先修改状态
                    roleStakes[committer] = 0; // 清零质押记录
                    // Interactions: 最后进行外部调用
                    if (totalReturn > 0) {
                        (bool success, ) = payable(committer).call{value: totalReturn}("");
                        require(success, "Committer return failed");
                    }
                }
            }
            
        } else if (status == OathStatus.Broken) {
            // 守约失败的情况
            // 1. 称职的监督者获得守约人的质押作为额外奖励
            uint256 totalCommitterStakes = oath.committerStake * oath.committers.length;
            uint16 competentSupervisors = 0;
            
            // 计算称职的监督者数量
            for (uint i = 0; i < oath.supervisors.length; i++) {
                if (supervisorMisses[oath.supervisors[i]] <= oath.maxSupervisorMisses) {
                    competentSupervisors++;
                }
            }
            
            // 分配给称职的监督者
            if (competentSupervisors > 0) {
                uint256 rewardPerSupervisor = totalCommitterStakes / competentSupervisors;
                for (uint i = 0; i < oath.supervisors.length; i++) {
                    address supervisor = oath.supervisors[i];
                    if (supervisorMisses[supervisor] <= oath.maxSupervisorMisses) {
                        uint256 totalReward = oath.supervisorStake + rewardPerSupervisor;
                        // Effects: 先修改状态
                        roleStakes[supervisor] = 0; // 清零质押记录
                        // Interactions: 最后进行外部调用
                        if (totalReward > 0) {
                            (bool success, ) = payable(supervisor).call{value: totalReward}("");
                            require(success, "Supervisor reward transfer failed");
                        }
                    }
                }
            }
            
            // 清零失约守约者的质押记录（质押金已被没收）
            for (uint i = 0; i < oath.committers.length; i++) {
                roleStakes[oath.committers[i]] = 0;
            }
        }
    }
       
    /// @notice 获取誓约详细信息
    function getOathDetails() external view returns (Oath memory, OathStatus, uint16) {
        return (oath, status, currentCheckRound);
    }
    
    /// @notice 获取参与者状态信息
    function getParticipantStatus(address participant) external view returns (uint16, uint16) {
        if (isSupervisor[participant]) {
            return (supervisorRewardCount[participant], supervisorMisses[participant]);
        } else if (isCommitter[participant]) {
            return (0, committerFailures[participant]);
        } else {
            return (0, 0);
        }
    }
   
    /// @notice 如果合约超过了规定开始时间还没有开始， 各个角色可以拿走自己的质押
    function refundTheMoneyBeforeItStarts() internal {
        //   如果合约还没有开始， 则创建者智能拿走本属于他的哪部分质押
        require( block.timestamp > oath.startTime, "The oath has not been invalidated yet" );
        require(status == OathStatus.Pending, "Oath not in pending state");

        uint256 withdrawNums = roleStakes[msg.sender];
         require(withdrawNums > 0, "No stake to withdraw");
         
         // Effects: 先修改状态
         roleStakes[msg.sender] = 0;
         status = OathStatus.Cancelled;
         emit OathStatusChanged(OathStatus.Pending, OathStatus.Cancelled);
         
         // Interactions: 最后进行外部调用
         (bool success, ) = payable(msg.sender).call{value: withdrawNums}("");
         require(success, "Withdrawal failed");
    }

    function get021Supervisors() internal view returns (uint256) {
        uint256 qualifiedSupervisorCount = 0;
        for (uint i = 0; i < oath.supervisors.length; i++) {
            if (roleStakes[oath.supervisors[i]] > 0) {
                qualifiedSupervisorCount++;
            }
        }
        return qualifiedSupervisorCount;
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