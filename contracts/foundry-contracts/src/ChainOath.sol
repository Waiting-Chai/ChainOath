// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * ChainOath 誓约合约
 * 实现基于区块链的誓约系统，支持多角色参与和ERC20代币质押
 * 包含创建者、守约人、监督者角色的完整誓约生命周期管理
 */
contract ChainOath is ReentrancyGuard, Ownable {
    
    /// 表示誓约当前状态的枚举
    enum OathStatus {
        Pending,    // 创建后尚未接受
        Accepted,   // 已被接受（所有角色成功在startTime之前完成了质押确认）
        Fulfilled,  // 誓言已履行（完成最后一轮监督者监督，并受约人满足守约条件）
        Broken,     // 誓言未履行（受约人誓约次数 > maxCommitterFailures）
        Aborted     // 因为种种原因被废止了
    }
    
    /// 誓约主体结构
    struct Oath {
        string title;                    // 誓约标题
        string description;              // 誓约描述
        address committer;               // 守约人，唯一
        address[] supervisors;           // 监督者列表，可以有多个
        uint256 totalReward;             // Creator 总质押奖励金额
        uint256 committerStake;          // 守约人需质押金额
        uint256 supervisorStake;         // 每位监督者需质押金额
        uint16 supervisorRewardRatio;    // 监督者奖励比例（如 10 表示 10%）
        uint32 checkInterval;            // check 间隔（单位：秒）
        uint32 checkWindow;              // check 后签名时间窗口（单位：秒）
        uint16 checkThresholdPercent;    // 判定守约成功的监督者签名比例
        uint16 maxSupervisorMisses;      // 监督者最大允许失职次数
        uint16 maxCommitterFailures;     // 守约人最大允许失约次数
        uint16 checkRoundsCount;         // 总检查轮次
        uint32 startTime;                // 誓约开始时间（时间戳，单位为s）
        uint32 endTime;                  // 誓约结束时间（时间戳，单位为s）
        uint32 createTime;               // 创建时间（时间戳，单位为s）
        address creator;                 // 创建者地址
        IERC20 token;                    // 使用的ERC20代币
        OathStatus status;               // 当前状态
    }
    
    /// 监督记录结构
    struct SupervisionRecord {
        mapping(address => bool) hasChecked;     // 监督者是否已检查
        mapping(address => bool) approvals;     // 监督者的批准状态
        uint16 totalChecked;                    // 总检查人数
        uint16 totalApproved;                   // 总批准人数
        bool isCompleted;                       // 本轮是否完成
        bool isSuccess;                         // 本轮是否成功
    }
    
    /// 质押信息结构
    struct StakeInfo {
        mapping(address => uint256) amounts;     // 质押金额
        mapping(address => IERC20) tokens;      // 质押代币类型
        mapping(address => bool) hasStaked;     // 是否已质押
    }
    
    /// 监督者状态结构
    struct SupervisorStatus {
        uint16 missCount;                       // 失职次数
        uint16 successfulChecks;                // 成功检查次数
        bool isDisqualified;                   // 是否被取消资格
    }
    
    // 状态变量
    uint256 public nextOathId;
    mapping(uint256 => Oath) public oaths;
    mapping(uint256 => mapping(uint16 => SupervisionRecord)) public supervisionRecords;
    mapping(uint256 => StakeInfo) internal creatorStakes;
    mapping(uint256 => StakeInfo) internal committerStakes;
    mapping(uint256 => StakeInfo) internal supervisorStakes;
    mapping(uint256 => mapping(address => SupervisorStatus)) public supervisorStatuses;
    mapping(uint256 => uint16) public currentRounds;
    mapping(uint256 => uint16) public committerFailures;
    
    // 事件定义
    event OathCreated(uint256 indexed oathId, address indexed creator, string title);
    event OathAccepted(uint256 indexed oathId);
    event OathAborted(uint256 indexed oathId);
    event OathFulfilled(uint256 indexed oathId);
    event OathBroken(uint256 indexed oathId);
    event StakeDeposited(uint256 indexed oathId, address indexed staker, uint256 amount, address token);
    event SupervisionSubmitted(uint256 indexed oathId, uint16 round, address indexed supervisor, bool approval);
    event RewardClaimed(uint256 indexed oathId, address indexed claimer, uint256 amount, address token);
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * 创建新的誓约
     * _oath 誓约结构体数据
     * _token 使用的ERC20代币地址
     */
    function createOath(
        Oath memory _oath,
        address _token
    ) external nonReentrant {
        require(block.timestamp < _oath.startTime, "Start time must be in the future");
        require(_oath.startTime < _oath.endTime, "End time must be after start time");
        require(_oath.committer != address(0), "Invalid committer address");
        require(_oath.supervisors.length > 0, "At least one supervisor required");
        require(_oath.totalReward > 0, "Total reward must be greater than 0");
        require(_oath.supervisorRewardRatio <= 100, "Supervisor reward ratio cannot exceed 100%");
        require(_oath.checkThresholdPercent <= 100, "Check threshold cannot exceed 100%");
        require(_oath.checkInterval > 0, "Check interval must be greater than 0");
        require(_oath.checkWindow > 0, "Check window must be greater than 0");
        
        // 计算检查轮次
        uint32 duration = _oath.endTime - _oath.startTime;
        uint16 rounds = uint16((duration + _oath.checkInterval - 1) / _oath.checkInterval);
        
        uint256 oathId = nextOathId++;
        
        // 初始化誓约
        Oath storage oath = oaths[oathId];
        oath.title = _oath.title;
        oath.description = _oath.description;
        oath.committer = _oath.committer;
        oath.totalReward = _oath.totalReward;
        oath.committerStake = _oath.committerStake;
        oath.supervisorStake = _oath.supervisorStake;
        oath.supervisorRewardRatio = _oath.supervisorRewardRatio;
        oath.checkInterval = _oath.checkInterval;
        oath.checkWindow = _oath.checkWindow;
        oath.checkThresholdPercent = _oath.checkThresholdPercent;
        oath.maxSupervisorMisses = _oath.maxSupervisorMisses;
        oath.maxCommitterFailures = _oath.maxCommitterFailures;
        oath.checkRoundsCount = rounds;
        oath.startTime = _oath.startTime;
        oath.endTime = _oath.endTime;
        oath.createTime = uint32(block.timestamp);
        oath.creator = msg.sender;
        oath.token = IERC20(_token);
        oath.status = OathStatus.Pending;
        
        // 复制并检查监督者数组
        for (uint i = 0; i < _oath.supervisors.length; i++) {
            address supervisor = _oath.supervisors[i];
            require(supervisor != address(0), "Invalid supervisor address");
            // 检查重复地址
            for (uint j = i + 1; j < _oath.supervisors.length; j++) {
                require(_oath.supervisors[j] != supervisor, "Duplicate supervisor address");
            }
            oath.supervisors.push(supervisor);
        }
        
        // 创建者质押奖励金额
        require(oath.token.transferFrom(msg.sender, address(this), _oath.totalReward), "Creator stake transfer failed");
        creatorStakes[oathId].amounts[msg.sender] = _oath.totalReward;
        creatorStakes[oathId].tokens[msg.sender] = oath.token;
        creatorStakes[oathId].hasStaked[msg.sender] = true;
        
        emit OathCreated(oathId, msg.sender, _oath.title);
        emit StakeDeposited(oathId, msg.sender, _oath.totalReward, _token);
    }
    
    /**
     * 守约人质押
     * _oathId 誓约ID
     * _token 质押代币地址
     * _amount 质押金额
     */
    function committerStake(uint256 _oathId, address _token, uint256 _amount) external nonReentrant {
        Oath storage oath = oaths[_oathId];
        require(oath.creator != address(0), "Oath does not exist");
        require(msg.sender == oath.committer, "Only committer can stake");
        require(oath.status == OathStatus.Pending, "Oath is not in pending status");
        
        // 先检查状态，如果时间已过则设为Aborted
        if (block.timestamp >= oath.startTime) {
            oath.status = OathStatus.Aborted;
            emit OathAborted(_oathId);
            revert("Staking period has ended");
        }
        
        require(!committerStakes[_oathId].hasStaked[msg.sender], "Already staked");
        require(_amount >= oath.committerStake, "Insufficient stake amount");
        
        IERC20 token = IERC20(_token);
        require(token.transferFrom(msg.sender, address(this), _amount), "Stake transfer failed");
        
        committerStakes[_oathId].amounts[msg.sender] = _amount;
        committerStakes[_oathId].tokens[msg.sender] = token;
        committerStakes[_oathId].hasStaked[msg.sender] = true;
        
        emit StakeDeposited(_oathId, msg.sender, _amount, _token);
        
        _checkOathAcceptance(_oathId);
    }
    
    /**
     * 监督者质押
     * _oathId 誓约ID
     * _token 质押代币地址
     * _amount 质押金额
     */
    function supervisorStake(uint256 _oathId, address _token, uint256 _amount) external nonReentrant {
        Oath storage oath = oaths[_oathId];
        require(oath.creator != address(0), "Oath does not exist");
        require(_isSupervisor(_oathId, msg.sender), "Not a supervisor");
        require(oath.status == OathStatus.Pending, "Oath is not in pending status");
        require(block.timestamp < oath.startTime, "Staking period has ended");
        require(!supervisorStakes[_oathId].hasStaked[msg.sender], "Already staked");
        require(_amount >= oath.supervisorStake, "Insufficient stake amount");
        
        IERC20 token = IERC20(_token);
        require(token.transferFrom(msg.sender, address(this), _amount), "Stake transfer failed");
        
        supervisorStakes[_oathId].amounts[msg.sender] = _amount;
        supervisorStakes[_oathId].tokens[msg.sender] = token;
        supervisorStakes[_oathId].hasStaked[msg.sender] = true;
        
        emit StakeDeposited(_oathId, msg.sender, _amount, _token);
        
        _checkOathAcceptance(_oathId);
    }
    
    /**
     * 监督者提交检查结果
     * _oathId 誓约ID
     * _approval 是否批准（true为守约，false为失约）
     */
    function submitSupervision(uint256 _oathId, bool _approval) external nonReentrant {
        Oath storage oath = oaths[_oathId];
        require(oath.creator != address(0), "Oath does not exist");
        require(_isSupervisor(_oathId, msg.sender), "Not a supervisor");
        require(supervisorStakes[_oathId].hasStaked[msg.sender], "Supervisor not staked");
        require(oath.status == OathStatus.Accepted, "Oath is not active");
        require(!supervisorStatuses[_oathId][msg.sender].isDisqualified, "Supervisor is disqualified");
        
        uint16 currentRound = _getCurrentRound(_oathId);
        require(currentRound > 0 && currentRound <= oath.checkRoundsCount, "Invalid round");
        
        uint32 roundStartTime = oath.startTime + (currentRound - 1) * oath.checkInterval;
        require(block.timestamp >= roundStartTime, "Round not started yet");
        require(block.timestamp <= roundStartTime + oath.checkWindow, "Check window has passed");
        
        SupervisionRecord storage record = supervisionRecords[_oathId][currentRound];
        require(!record.hasChecked[msg.sender], "Already submitted for this round");
        
        record.hasChecked[msg.sender] = true;
        record.approvals[msg.sender] = _approval;
        record.totalChecked++;
        
        if (_approval) {
            record.totalApproved++;
            supervisorStatuses[_oathId][msg.sender].successfulChecks++;
        }
        
        emit SupervisionSubmitted(_oathId, currentRound, msg.sender, _approval);
        
        _processRoundCompletion(_oathId, currentRound);
    }
    
    /**
     * 处理超时的监督轮次
     * _oathId 誓约ID
     */
    function processTimeoutRound(uint256 _oathId) external {
        Oath storage oath = oaths[_oathId];
        require(oath.creator != address(0), "Oath does not exist");
        require(oath.status == OathStatus.Accepted, "Oath is not active");
        
        uint16 currentRound = _getCurrentRound(_oathId);
        require(currentRound > 0 && currentRound <= oath.checkRoundsCount, "Invalid round");
        
        uint32 roundStartTime = oath.startTime + (currentRound - 1) * oath.checkInterval;
        require(block.timestamp > roundStartTime + oath.checkWindow, "Check window not passed yet");
        
        SupervisionRecord storage record = supervisionRecords[_oathId][currentRound];
        require(!record.isCompleted, "Round already completed");
        
        // 处理未提交的监督者
        for (uint i = 0; i < oath.supervisors.length; i++) {
            address supervisor = oath.supervisors[i];
            if (supervisorStakes[_oathId].hasStaked[supervisor] && 
                !supervisorStatuses[_oathId][supervisor].isDisqualified &&
                !record.hasChecked[supervisor]) {
                
                supervisorStatuses[_oathId][supervisor].missCount++;
                
                if (supervisorStatuses[_oathId][supervisor].missCount > oath.maxSupervisorMisses) {
                    supervisorStatuses[_oathId][supervisor].isDisqualified = true;
                }
            }
        }
        
        _processRoundCompletion(_oathId, currentRound);
    }
    
    /**
     * 领取奖励
     * _oathId 誓约ID
     */
    function claimReward(uint256 _oathId) external nonReentrant {
        Oath storage oath = oaths[_oathId];
        require(oath.creator != address(0), "Oath does not exist");
        require(oath.status == OathStatus.Fulfilled || oath.status == OathStatus.Broken, "Oath not completed");
        
        if (msg.sender == oath.committer) {
            _claimCommitterReward(_oathId);
        } else if (_isSupervisor(_oathId, msg.sender)) {
            _claimSupervisorReward(_oathId);
        } else if (msg.sender == oath.creator) {
            _claimCreatorReward(_oathId);
        } else {
            revert("Not authorized to claim");
        }
    }
    
    /**
     * 检查并更新誓约状态
     * _oathId 誓约ID
     */
    function checkOathStatus(uint256 _oathId) external {
        Oath storage oath = oaths[_oathId];
        require(oath.creator != address(0), "Oath does not exist");
        
        if (oath.status == OathStatus.Pending && block.timestamp >= oath.startTime) {
            oath.status = OathStatus.Aborted;
            emit OathAborted(_oathId);
        }
    }
    
    /**
     * 退回质押金（仅在誓约被废止时）
     * _oathId 誓约ID
     */
    function refundStake(uint256 _oathId) external nonReentrant {
        Oath storage oath = oaths[_oathId];
        require(oath.creator != address(0), "Oath does not exist");
        require(oath.status == OathStatus.Aborted, "Oath is not aborted");
        
        if (msg.sender == oath.creator && creatorStakes[_oathId].hasStaked[msg.sender]) {
            uint256 amount = creatorStakes[_oathId].amounts[msg.sender];
            IERC20 token = creatorStakes[_oathId].tokens[msg.sender];
            creatorStakes[_oathId].hasStaked[msg.sender] = false;
            require(token.transfer(msg.sender, amount), "Refund transfer failed");
            emit RewardClaimed(_oathId, msg.sender, amount, address(token));
        } else if (msg.sender == oath.committer && committerStakes[_oathId].hasStaked[msg.sender]) {
            uint256 amount = committerStakes[_oathId].amounts[msg.sender];
            IERC20 token = committerStakes[_oathId].tokens[msg.sender];
            committerStakes[_oathId].hasStaked[msg.sender] = false;
            require(token.transfer(msg.sender, amount), "Refund transfer failed");
            emit RewardClaimed(_oathId, msg.sender, amount, address(token));
        } else if (_isSupervisor(_oathId, msg.sender) && supervisorStakes[_oathId].hasStaked[msg.sender]) {
            uint256 amount = supervisorStakes[_oathId].amounts[msg.sender];
            IERC20 token = supervisorStakes[_oathId].tokens[msg.sender];
            supervisorStakes[_oathId].hasStaked[msg.sender] = false;
            require(token.transfer(msg.sender, amount), "Refund transfer failed");
            emit RewardClaimed(_oathId, msg.sender, amount, address(token));
        } else {
            revert("No stake to refund");
        }
    }
    
    // 内部函数
    
    /**
     * 检查是否为监督者
     */
    function _isSupervisor(uint256 _oathId, address _addr) internal view returns (bool) {
        Oath storage oath = oaths[_oathId];
        for (uint i = 0; i < oath.supervisors.length; i++) {
            if (oath.supervisors[i] == _addr) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * 检查誓约是否可以被接受
     */
    function _checkOathAcceptance(uint256 _oathId) internal {
        Oath storage oath = oaths[_oathId];
        
        if (block.timestamp >= oath.startTime) {
            oath.status = OathStatus.Aborted;
            emit OathAborted(_oathId);
            return;
        }
        
        // 检查守约人是否已质押
        if (!committerStakes[_oathId].hasStaked[oath.committer]) {
            return;
        }
        
        // 检查所有监督者是否已质押
        for (uint i = 0; i < oath.supervisors.length; i++) {
            if (!supervisorStakes[_oathId].hasStaked[oath.supervisors[i]]) {
                return;
            }
        }
        
        // 所有人都已质押，誓约被接受
        oath.status = OathStatus.Accepted;
        emit OathAccepted(_oathId);
    }
    
    /**
     * 获取当前轮次
     */
    function _getCurrentRound(uint256 _oathId) internal view returns (uint16) {
        Oath storage oath = oaths[_oathId];
        if (block.timestamp < oath.startTime) {
            return 0;
        }
        if (block.timestamp >= oath.endTime) {
            return oath.checkRoundsCount;
        }
        
        uint32 elapsed = uint32(block.timestamp) - oath.startTime;
        return uint16(elapsed / oath.checkInterval) + 1;
    }
    
    /**
     * 处理轮次完成
     */
    function _processRoundCompletion(uint256 _oathId, uint16 _round) internal {
        Oath storage oath = oaths[_oathId];
        SupervisionRecord storage record = supervisionRecords[_oathId][_round];
        
        if (record.isCompleted) {
            return;
        }
        
        // 计算有效监督者数量
        uint16 validSupervisors = 0;
        for (uint i = 0; i < oath.supervisors.length; i++) {
            address supervisor = oath.supervisors[i];
            if (supervisorStakes[_oathId].hasStaked[supervisor] && 
                !supervisorStatuses[_oathId][supervisor].isDisqualified) {
                validSupervisors++;
            }
        }
        
        // 检查是否所有有效监督者都已提交或超时
        bool allSubmitted = (record.totalChecked >= validSupervisors);
        uint32 roundStartTime = oath.startTime + (_round - 1) * oath.checkInterval;
        bool timeoutPassed = (block.timestamp > roundStartTime + oath.checkWindow);
        
        if (!allSubmitted && !timeoutPassed) {
            return;
        }
        
        record.isCompleted = true;
        
        // 判断本轮是否成功
        if (validSupervisors > 0) {
            uint16 approvalPercent = (record.totalApproved * 100) / validSupervisors;
            record.isSuccess = (approvalPercent >= oath.checkThresholdPercent);
        } else {
            record.isSuccess = false;
        }
        
        if (!record.isSuccess) {
            committerFailures[_oathId]++;
            if (committerFailures[_oathId] > oath.maxCommitterFailures) {
                oath.status = OathStatus.Broken;
                emit OathBroken(_oathId);
                return;
            }
        }
        
        // 检查是否完成所有轮次
        if (_round >= oath.checkRoundsCount) {
            oath.status = OathStatus.Fulfilled;
            emit OathFulfilled(_oathId);
        }
    }
    
    /**
     * 守约人领取奖励
     */
    function _claimCommitterReward(uint256 _oathId) internal {
        Oath storage oath = oaths[_oathId];
        require(oath.status == OathStatus.Fulfilled, "Oath not fulfilled");
        require(committerStakes[_oathId].hasStaked[msg.sender], "No stake to claim");
        
        // 计算守约人奖励
        uint256 committerReward = oath.totalReward * (100 - oath.supervisorRewardRatio) / 100;
        
        // 退还质押金
        uint256 stakeAmount = committerStakes[_oathId].amounts[msg.sender];
        IERC20 stakeToken = committerStakes[_oathId].tokens[msg.sender];
        committerStakes[_oathId].hasStaked[msg.sender] = false;
        
        // 转账奖励和质押金
        require(oath.token.transfer(msg.sender, committerReward), "Reward transfer failed");
        require(stakeToken.transfer(msg.sender, stakeAmount), "Stake refund failed");
        
        emit RewardClaimed(_oathId, msg.sender, committerReward + stakeAmount, address(oath.token));
    }
    
    /**
     * 监督者领取奖励
     */
    mapping(uint256 => uint256) private claimedSupervisorRewards;

    function _claimSupervisorReward(uint256 _oathId) internal {
        Oath storage oath = oaths[_oathId];
        require(supervisorStakes[_oathId].hasStaked[msg.sender], "No stake to claim");
        
        SupervisorStatus storage status = supervisorStatuses[_oathId][msg.sender];
        
        // 计算监督者奖励
        uint256 totalSupervisorReward = oath.totalReward * oath.supervisorRewardRatio / 100;
        uint16 validSupervisors = 0;
        uint16 totalSuccessfulChecks = 0;

        for (uint i = 0; i < oath.supervisors.length; i++) {
            address supervisor = oath.supervisors[i];
            if (supervisorStakes[_oathId].hasStaked[supervisor] && !supervisorStatuses[_oathId][supervisor].isDisqualified) {
                validSupervisors++;
                totalSuccessfulChecks += supervisorStatuses[_oathId][supervisor].successfulChecks;
            }
        }
        
        uint256 supervisorReward = 0;
        if (totalSuccessfulChecks > 0) {
            supervisorReward = (totalSupervisorReward * status.successfulChecks) / totalSuccessfulChecks;
        }

        claimedSupervisorRewards[_oathId] += supervisorReward;
        
        // 处理质押金
        uint256 stakeAmount = supervisorStakes[_oathId].amounts[msg.sender];
        IERC20 stakeToken = supervisorStakes[_oathId].tokens[msg.sender];
        supervisorStakes[_oathId].hasStaked[msg.sender] = false;
        
        // 如果未被取消资格，退还质押金
        if (!status.isDisqualified) {
            require(stakeToken.transfer(msg.sender, stakeAmount), "Stake refund failed");
        }
        
        // 转账奖励
        if (supervisorReward > 0) {
            require(oath.token.transfer(msg.sender, supervisorReward), "Reward transfer failed");
        }
        
        emit RewardClaimed(_oathId, msg.sender, supervisorReward + (status.isDisqualified ? 0 : stakeAmount), address(oath.token));
    }
    
    /**
     * 创建者领取剩余资金
     */
    function _claimCreatorReward(uint256 _oathId) internal {
        Oath storage oath = oaths[_oathId];
        require(creatorStakes[_oathId].hasStaked[msg.sender], "No stake to claim");
        
        creatorStakes[_oathId].hasStaked[msg.sender] = false;
        
        // 计算剩余金额（包括没收的质押金和未分配的奖励）
        uint256 totalSupervisorReward = oath.totalReward * oath.supervisorRewardRatio / 100;
        uint256 remainingBalance = oath.token.balanceOf(address(this));
        uint256 undistributedSupervisorReward = totalSupervisorReward - claimedSupervisorRewards[_oathId];
        remainingBalance += undistributedSupervisorReward;
        
        if (remainingBalance > 0) {
            require(oath.token.transfer(msg.sender, remainingBalance), "Remaining transfer failed");
            emit RewardClaimed(_oathId, msg.sender, remainingBalance, address(oath.token));
        }
    }
    
    // 查询函数
    
    /**
     * 获取誓约信息
     */
    function getOath(uint256 _oathId) external view returns (Oath memory) {
        return oaths[_oathId];
    }
    
    /**
     * 获取监督记录
     */
    function getSupervisionRecord(uint256 _oathId, uint16 _round) external view returns (
        uint16 totalChecked,
        uint16 totalApproved,
        bool isCompleted,
        bool isSuccess
    ) {
        SupervisionRecord storage record = supervisionRecords[_oathId][_round];
        return (record.totalChecked, record.totalApproved, record.isCompleted, record.isSuccess);
    }
    
    /**
     * 获取监督者状态
     */
    function getSupervisorStatus(uint256 _oathId, address _supervisor) external view returns (
        uint16 missCount,
        uint16 successfulChecks,
        bool isDisqualified
    ) {
        SupervisorStatus storage status = supervisorStatuses[_oathId][_supervisor];
        return (status.missCount, status.successfulChecks, status.isDisqualified);
    }
    
    /**
     * 获取当前轮次
     */
    function getCurrentRound(uint256 _oathId) external view returns (uint16) {
        return _getCurrentRound(_oathId);
    }
    
    /**
     * 检查地址是否已质押
     */
    function hasStaked(uint256 _oathId, address _addr) external view returns (bool) {
        Oath storage oath = oaths[_oathId];
        if (_addr == oath.creator) {
            return creatorStakes[_oathId].hasStaked[_addr];
        } else if (_addr == oath.committer) {
            return committerStakes[_oathId].hasStaked[_addr];
        } else if (_isSupervisor(_oathId, _addr)) {
            return supervisorStakes[_oathId].hasStaked[_addr];
        }
        return false;
    }
}