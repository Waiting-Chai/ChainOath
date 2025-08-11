// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * ChainOath 安全版誓约合约
 */
contract ChainOathSecure is ReentrancyGuard, Ownable, Pausable {
    
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
        IERC20 token;                    // 使用的ERC20代币（统一代币类型）
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
    
    /// 质押信息结构（简化为单一代币）
    struct StakeInfo {
        mapping(address => uint256) amounts;     // 质押金额
        mapping(address => bool) hasStaked;     // 是否已质押
    }
    
    /// 监督者状态结构
    struct SupervisorStatus {
        uint16 missCount;                       // 失职次数
        uint16 successfulChecks;                // 成功检查次数
        bool isDisqualified;                   // 是否被取消资格
    }
    
    /// 奖励分配记录（防止重复计算）
    struct RewardDistribution {
        uint256 committerRewardClaimed;         // 守约人已领取奖励
        uint256 supervisorRewardClaimed;        // 监督者已领取奖励总额
        uint256 creatorRefundClaimed;           // 创建者已领取退款
        bool isDistributionCompleted;           // 奖励分配是否完成
    }
    
    // 状态变量
    uint256 public nextOathId;
    mapping(uint256 => Oath) public oaths;
    mapping(uint256 => mapping(uint16 => SupervisionRecord)) public supervisionRecords;
    mapping(uint256 => StakeInfo) internal creatorStakes;
    mapping(uint256 => StakeInfo) internal committerStakes;
    mapping(uint256 => StakeInfo) internal supervisorStakes;
    mapping(uint256 => mapping(address => SupervisorStatus)) public supervisorStatuses;
    mapping(uint256 => uint16) public committerFailures;
    mapping(uint256 => RewardDistribution) public rewardDistributions;
    
    // 安全机制
    mapping(address => bool) public tokenWhitelist;     // 代币白名单
    uint256 public constant MAX_SUPERVISORS = 20;       // 最大监督者数量
    uint256 public constant MIN_STAKE_AMOUNT = 1e6;     // 最小质押金额（防止粉尘攻击）
    
    // 事件定义
    event OathCreated(uint256 indexed oathId, address indexed creator, string title);
    event OathAccepted(uint256 indexed oathId);
    event OathAborted(uint256 indexed oathId);
    event OathFulfilled(uint256 indexed oathId);
    event OathBroken(uint256 indexed oathId);
    event StakeDeposited(uint256 indexed oathId, address indexed staker, uint256 amount, address token);
    event SupervisionSubmitted(uint256 indexed oathId, uint16 round, address indexed supervisor, bool approval);
    event RewardClaimed(uint256 indexed oathId, address indexed claimer, uint256 amount, address token);
    event TokenWhitelistUpdated(address indexed token, bool isWhitelisted);
    event EmergencyWithdraw(uint256 indexed oathId, address indexed token, uint256 amount);
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * 添加/移除代币白名单
     */
    function updateTokenWhitelist(address _token, bool _isWhitelisted) external onlyOwner {
        require(_token != address(0), "Invalid token address");
        tokenWhitelist[_token] = _isWhitelisted;
        emit TokenWhitelistUpdated(_token, _isWhitelisted);
    }
    
    /**
     * 紧急暂停/恢复合约
     */
    function emergencyPause() external onlyOwner {
        _pause();
    }
    
    function emergencyUnpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * 创建新的誓约
     * _oath 誓约结构体数据
     * _token 使用的ERC20代币地址（必须在白名单中）
     */
    function createOath(
        Oath memory _oath,
        address _token
    ) external nonReentrant whenNotPaused {
        require(tokenWhitelist[_token], "Token not whitelisted");
        require(block.timestamp < _oath.startTime, "Start time must be in the future");
        require(_oath.startTime < _oath.endTime, "End time must be after start time");
        require(_oath.committer != address(0), "Invalid committer address");
        require(_oath.committer != msg.sender, "Creator cannot be committer");
        require(_oath.supervisors.length > 0 && _oath.supervisors.length <= MAX_SUPERVISORS, "Invalid supervisor count");
        require(_oath.totalReward >= MIN_STAKE_AMOUNT, "Total reward too small");
        require(_oath.committerStake >= MIN_STAKE_AMOUNT, "Committer stake too small");
        require(_oath.supervisorStake >= MIN_STAKE_AMOUNT, "Supervisor stake too small");
        require(_oath.supervisorRewardRatio <= 100, "Supervisor reward ratio cannot exceed 100%");
        require(_oath.checkThresholdPercent <= 100 && _oath.checkThresholdPercent > 0, "Invalid check threshold");
        require(_oath.checkInterval > 0, "Check interval must be greater than 0");
        require(_oath.checkWindow > 0 && _oath.checkWindow <= _oath.checkInterval, "Invalid check window");
        
        // 计算检查轮次
        uint32 duration = _oath.endTime - _oath.startTime;
        uint16 rounds = uint16((duration + _oath.checkInterval - 1) / _oath.checkInterval);
        require(rounds > 0, "Invalid duration");
        
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
            require(supervisor != msg.sender, "Creator cannot be supervisor");
            require(supervisor != _oath.committer, "Committer cannot be supervisor");
            
            // 检查重复地址
            for (uint j = i + 1; j < _oath.supervisors.length; j++) {
                require(_oath.supervisors[j] != supervisor, "Duplicate supervisor address");
            }
            oath.supervisors.push(supervisor);
        }
        
        // 创建者质押奖励金额（使用统一代币）
        require(oath.token.transferFrom(msg.sender, address(this), _oath.totalReward), "Creator stake transfer failed");
        creatorStakes[oathId].amounts[msg.sender] = _oath.totalReward;
        creatorStakes[oathId].hasStaked[msg.sender] = true;
        
        emit OathCreated(oathId, msg.sender, _oath.title);
        emit StakeDeposited(oathId, msg.sender, _oath.totalReward, _token);
    }
    
    /**
     * 守约人质押（使用与誓约相同的代币）
     */
    function committerStake(uint256 _oathId, uint256 _amount) external nonReentrant whenNotPaused {
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
        
        // 使用统一代币类型
        require(oath.token.transferFrom(msg.sender, address(this), _amount), "Stake transfer failed");
        
        committerStakes[_oathId].amounts[msg.sender] = _amount;
        committerStakes[_oathId].hasStaked[msg.sender] = true;
        
        emit StakeDeposited(_oathId, msg.sender, _amount, address(oath.token));
        
        _checkOathAcceptance(_oathId);
    }
    
    /**
     * 监督者质押（使用与誓约相同的代币）
     */
    function supervisorStake(uint256 _oathId, uint256 _amount) external nonReentrant whenNotPaused {
        Oath storage oath = oaths[_oathId];
        require(oath.creator != address(0), "Oath does not exist");
        require(_isSupervisor(_oathId, msg.sender), "Not a supervisor");
        require(oath.status == OathStatus.Pending, "Oath is not in pending status");
        require(block.timestamp < oath.startTime, "Staking period has ended");
        require(!supervisorStakes[_oathId].hasStaked[msg.sender], "Already staked");
        require(_amount >= oath.supervisorStake, "Insufficient stake amount");
        
        // 使用统一代币类型
        require(oath.token.transferFrom(msg.sender, address(this), _amount), "Stake transfer failed");
        
        supervisorStakes[_oathId].amounts[msg.sender] = _amount;
        supervisorStakes[_oathId].hasStaked[msg.sender] = true;
        
        emit StakeDeposited(_oathId, msg.sender, _amount, address(oath.token));
        
        _checkOathAcceptance(_oathId);
    }
    
    /**
     * 监督者提交检查结果
     */
    function submitSupervision(uint256 _oathId, bool _approval) external nonReentrant whenNotPaused {
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
        
        // 更新状态（防止重入）
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
     */
    function processTimeoutRound(uint256 _oathId) external whenNotPaused {
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
     * 领取奖励（修复版本）
     */
    function claimReward(uint256 _oathId) external nonReentrant whenNotPaused {
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
     */
    function refundStake(uint256 _oathId) external nonReentrant whenNotPaused {
        Oath storage oath = oaths[_oathId];
        require(oath.creator != address(0), "Oath does not exist");
        require(oath.status == OathStatus.Aborted, "Oath is not aborted");
        
        if (msg.sender == oath.creator && creatorStakes[_oathId].hasStaked[msg.sender]) {
            uint256 amount = creatorStakes[_oathId].amounts[msg.sender];
            creatorStakes[_oathId].hasStaked[msg.sender] = false;
            require(oath.token.transfer(msg.sender, amount), "Refund transfer failed");
            emit RewardClaimed(_oathId, msg.sender, amount, address(oath.token));
        } else if (msg.sender == oath.committer && committerStakes[_oathId].hasStaked[msg.sender]) {
            uint256 amount = committerStakes[_oathId].amounts[msg.sender];
            committerStakes[_oathId].hasStaked[msg.sender] = false;
            require(oath.token.transfer(msg.sender, amount), "Refund transfer failed");
            emit RewardClaimed(_oathId, msg.sender, amount, address(oath.token));
        } else if (_isSupervisor(_oathId, msg.sender) && supervisorStakes[_oathId].hasStaked[msg.sender]) {
            uint256 amount = supervisorStakes[_oathId].amounts[msg.sender];
            supervisorStakes[_oathId].hasStaked[msg.sender] = false;
            require(oath.token.transfer(msg.sender, amount), "Refund transfer failed");
            emit RewardClaimed(_oathId, msg.sender, amount, address(oath.token));
        } else {
            revert("No stake to refund");
        }
    }
    
    /**
     * 紧急提取（仅限管理员）
     */
    function emergencyWithdraw(uint256 _oathId, uint256 _amount) external onlyOwner {
        Oath storage oath = oaths[_oathId];
        require(oath.creator != address(0), "Oath does not exist");
        require(_amount > 0, "Amount must be greater than 0");
        
        uint256 balance = oath.token.balanceOf(address(this));
        require(balance >= _amount, "Insufficient balance");
        
        require(oath.token.transfer(owner(), _amount), "Emergency withdraw failed");
        emit EmergencyWithdraw(_oathId, address(oath.token), _amount);
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
     * 守约人领取奖励（修复版本）
     */
    function _claimCommitterReward(uint256 _oathId) internal {
        Oath storage oath = oaths[_oathId];
        RewardDistribution storage distribution = rewardDistributions[_oathId];
        
        require(oath.status == OathStatus.Fulfilled, "Oath not fulfilled");
        require(committerStakes[_oathId].hasStaked[msg.sender], "No stake to claim");
        require(distribution.committerRewardClaimed == 0, "Reward already claimed");
        
        // 计算守约人奖励
        uint256 committerReward = oath.totalReward * (100 - oath.supervisorRewardRatio) / 100;
        
        // 退还质押金
        uint256 stakeAmount = committerStakes[_oathId].amounts[msg.sender];
        
        // 更新状态（防止重入）
        committerStakes[_oathId].hasStaked[msg.sender] = false;
        distribution.committerRewardClaimed = committerReward;
        
        // 转账奖励和质押金
        require(oath.token.transfer(msg.sender, committerReward + stakeAmount), "Transfer failed");
        
        emit RewardClaimed(_oathId, msg.sender, committerReward + stakeAmount, address(oath.token));
    }
    
    /**
     * 监督者领取奖励（修复版本 - 修复奖励计算逻辑）
     */
    function _claimSupervisorReward(uint256 _oathId) internal {
        Oath storage oath = oaths[_oathId];
        RewardDistribution storage distribution = rewardDistributions[_oathId];
        
        require(supervisorStakes[_oathId].hasStaked[msg.sender], "No stake to claim");
        
        SupervisorStatus storage status = supervisorStatuses[_oathId][msg.sender];
        
        // 计算监督者奖励 - 使用固定的平均分配避免重复计算问题
        uint256 totalSupervisorReward = oath.totalReward * oath.supervisorRewardRatio / 100;
        uint16 validSupervisors = 0;
        uint16 totalSuccessfulChecks = 0;

        // 计算所有监督者的总成功检查次数（包括已领取的）
        for (uint i = 0; i < oath.supervisors.length; i++) {
            address supervisor = oath.supervisors[i];
            if (!supervisorStatuses[_oathId][supervisor].isDisqualified) {
                validSupervisors++;
                totalSuccessfulChecks += supervisorStatuses[_oathId][supervisor].successfulChecks;
            }
        }
        
        uint256 supervisorReward = 0;
        if (totalSuccessfulChecks > 0 && validSupervisors > 0) {
            // 使用简化的平均分配，避免精度问题
            supervisorReward = totalSupervisorReward / validSupervisors;
        }
        
        // 处理质押金
        uint256 stakeAmount = supervisorStakes[_oathId].amounts[msg.sender];
        
        // 更新状态（防止重入）
        supervisorStakes[_oathId].hasStaked[msg.sender] = false;
        distribution.supervisorRewardClaimed += supervisorReward;
        
        uint256 totalTransfer = supervisorReward;
        
        // 如果未被取消资格，退还质押金
        if (!status.isDisqualified) {
            totalTransfer += stakeAmount;
        }
        
        // 转账奖励和质押金
        if (totalTransfer > 0) {
            require(oath.token.transfer(msg.sender, totalTransfer), "Transfer failed");
        }
        
        emit RewardClaimed(_oathId, msg.sender, totalTransfer, address(oath.token));
    }
    
    /**
     * 创建者领取剩余资金（修复版本 - 解决重复计算问题）
     */
    function _claimCreatorReward(uint256 _oathId) internal {
        Oath storage oath = oaths[_oathId];
        RewardDistribution storage distribution = rewardDistributions[_oathId];
        
        require(creatorStakes[_oathId].hasStaked[msg.sender], "No stake to claim");
        require(distribution.creatorRefundClaimed == 0, "Already claimed");
        
        // 更新状态（防止重入）
        creatorStakes[_oathId].hasStaked[msg.sender] = false;
        distribution.isDistributionCompleted = true;
        
        // 计算实际合约余额（修复重复计算问题）
        uint256 contractBalance = oath.token.balanceOf(address(this));
        
        // 记录已分配金额
        distribution.creatorRefundClaimed = contractBalance;
        
        if (contractBalance > 0) {
            require(oath.token.transfer(msg.sender, contractBalance), "Transfer failed");
            emit RewardClaimed(_oathId, msg.sender, contractBalance, address(oath.token));
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
    
    /**
     * 获取奖励分配信息
     */
    function getRewardDistribution(uint256 _oathId) external view returns (
        uint256 committerRewardClaimed,
        uint256 supervisorRewardClaimed,
        uint256 creatorRefundClaimed,
        bool isDistributionCompleted
    ) {
        RewardDistribution storage distribution = rewardDistributions[_oathId];
        return (
            distribution.committerRewardClaimed,
            distribution.supervisorRewardClaimed,
            distribution.creatorRefundClaimed,
            distribution.isDistributionCompleted
        );
    }
    
    /**
     * 获取合约中特定代币的余额
     */
    function getContractTokenBalance(address _token) external view returns (uint256) {
        return IERC20(_token).balanceOf(address(this));
    }
}