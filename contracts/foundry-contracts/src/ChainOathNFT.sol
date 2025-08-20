// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./ChainOathSecure.sol";

/**
 * @title ChainOathNFT
 * @dev NFT合约，用于铸造成就NFT
 */
contract ChainOathNFT is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard, Pausable {
    // 成就类型枚举
    enum AchievementType {
        OATH_CREATOR,      // 誓约创建者
        OATH_KEEPER,       // 守约达人
        SUPERVISOR,        // 监督专家
        COMMUNITY_STAR,    // 社区之星
        CHECKPOINT_MASTER, // 检查点大师
        ENGAGEMENT_KING    // 互动之王
    }
    
    // 成就NFT结构体
    struct Achievement {
        AchievementType achievementType;
        uint256 oathId;
        address recipient;
        uint32 timestamp;
        string metadata;
    }
    
    // 状态变量
    ChainOathSecure public immutable oathContract;
    uint256 private _tokenIdCounter;
    uint256 public constant MINT_PRICE = 0.001 ether;
    
    /**
     * 获取下一个token ID
     */
    function nextTokenId() external view returns (uint256) {
        return _tokenIdCounter;
    }
    
    /**
     * 公共函数：检查用户是否符合成就条件（用于测试）
     */
    function checkAchievementEligibility(
        address _user,
        AchievementType _achievementType
    ) external view returns (bool) {
        return _checkAchievementEligibility(_user, _achievementType, 0);
    }
    
    // 映射
    mapping(uint256 => Achievement) public achievements;
    mapping(address => mapping(AchievementType => bool)) public hasAchievement;
    mapping(address => uint256[]) public userAchievements;
    
    // 成就要求配置
    mapping(AchievementType => uint256) public achievementRequirements;
    
    // 事件
    event AchievementMinted(uint256 indexed tokenId, address indexed recipient, AchievementType achievementType, uint256 oathId);
    event AchievementRequirementUpdated(AchievementType achievementType, uint256 newRequirement);
    
    constructor(
        address _oathContract,
        string memory _name,
        string memory _symbol
    ) ERC721(_name, _symbol) Ownable(msg.sender) {
        oathContract = ChainOathSecure(_oathContract);
        _tokenIdCounter = 1; // 从1开始计数
        
        // 设置默认成就要求（测试友好的低要求）
        achievementRequirements[AchievementType.OATH_CREATOR] = 1;      // 创建1个誓约
        achievementRequirements[AchievementType.OATH_KEEPER] = 1;       // 完成1个誓约
        achievementRequirements[AchievementType.SUPERVISOR] = 1;        // 监督1次
        achievementRequirements[AchievementType.COMMUNITY_STAR] = 1;    // 获得1个点赞
        achievementRequirements[AchievementType.CHECKPOINT_MASTER] = 1;  // 完成1个检查点
        achievementRequirements[AchievementType.ENGAGEMENT_KING] = 1;   // 1次互动（点赞+评论）
    }
    
    /**
     * 用户主动铸造成就NFT
     */
    function mintAchievement(
        AchievementType _achievementType,
        uint256 _oathId,
        string memory _tokenURI
    ) external payable nonReentrant whenNotPaused {
        require(msg.value >= MINT_PRICE, "Insufficient payment");
        require(!hasAchievement[msg.sender][_achievementType], "Achievement already minted");
        require(_checkAchievementEligibility(msg.sender, _achievementType, _oathId), "Not eligible for this achievement");
        
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        // 铸造NFT
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, _tokenURI);
        
        // 记录成就信息
        achievements[tokenId] = Achievement({
            achievementType: _achievementType,
            oathId: _oathId,
            recipient: msg.sender,
            timestamp: uint32(block.timestamp),
            metadata: _tokenURI
        });
        
        hasAchievement[msg.sender][_achievementType] = true;
        userAchievements[msg.sender].push(tokenId);
        
        emit AchievementMinted(tokenId, msg.sender, _achievementType, _oathId);
    }
    
    /**
     * 检查用户是否符合成就条件
     */
    function _checkAchievementEligibility(
        address _user,
        AchievementType _achievementType,
        uint256 _oathId
    ) internal view returns (bool) {
        if (_achievementType == AchievementType.OATH_CREATOR) {
            return _checkOathCreatorEligibility(_user);
        } else if (_achievementType == AchievementType.OATH_KEEPER) {
            return _checkOathKeeperEligibility(_user);
        } else if (_achievementType == AchievementType.SUPERVISOR) {
            return _checkSupervisorEligibility(_user);
        } else if (_achievementType == AchievementType.COMMUNITY_STAR) {
            return _checkCommunityStarEligibility(_user, _oathId);
        } else if (_achievementType == AchievementType.CHECKPOINT_MASTER) {
            return _checkCheckpointMasterEligibility(_user);
        } else if (_achievementType == AchievementType.ENGAGEMENT_KING) {
            return _checkEngagementKingEligibility(_user);
        }
        return false;
    }
    
    /**
     * 检查誓约创建者成就
     */
    function _checkOathCreatorEligibility(address _user) internal view returns (bool) {
        uint256 createdCount = 0;
        uint256 totalOaths = oathContract.oathCounter();
        
        for (uint256 i = 0; i < totalOaths; i++) {
            try oathContract.getOath(i) returns (ChainOathSecure.Oath memory oath) {
                if (oath.creator == _user) {
                    createdCount++;
                    if (createdCount >= achievementRequirements[AchievementType.OATH_CREATOR]) {
                        return true;
                    }
                }
            } catch {
                continue;
            }
        }
        return false;
    }
    
    /**
     * 检查守约达人成就
     */
    function _checkOathKeeperEligibility(address _user) internal view returns (bool) {
        uint256 fulfilledCount = 0;
        uint256 totalOaths = oathContract.oathCounter();
        
        for (uint256 i = 0; i < totalOaths; i++) {
            try oathContract.getOath(i) returns (ChainOathSecure.Oath memory oath) {
                if (oath.committer == _user && oath.status == ChainOathSecure.OathStatus.Fulfilled) {
                    fulfilledCount++;
                    if (fulfilledCount >= achievementRequirements[AchievementType.OATH_KEEPER]) {
                        return true;
                    }
                }
            } catch {
                continue;
            }
        }
        return false;
    }
    
    /**
     * 检查监督专家成就
     */
    function _checkSupervisorEligibility(address _user) internal view returns (bool) {
        uint256 supervisionCount = 0;
        uint256 totalOaths = oathContract.oathCounter();
        
        for (uint256 i = 0; i < totalOaths; i++) {
            try oathContract.getSupervisorStatus(i, _user) returns (
                uint16 missCount,
                uint16 successfulChecks,
                bool isDisqualified
            ) {
                if (!isDisqualified && successfulChecks > 0) {
                    supervisionCount += successfulChecks;
                    if (supervisionCount >= achievementRequirements[AchievementType.SUPERVISOR]) {
                        return true;
                    }
                }
            } catch {
                continue;
            }
        }
        return false;
    }
    
    /**
     * 检查社区之星成就
     */
    function _checkCommunityStarEligibility(address _user, uint256 _oathId) internal view returns (bool) {
        try oathContract.getOath(_oathId) returns (ChainOathSecure.Oath memory oath) {
            if (oath.creator == _user && oath.likesCount >= achievementRequirements[AchievementType.COMMUNITY_STAR]) {
                return true;
            }
        } catch {
            return false;
        }
        return false;
    }
    
    /**
     * 检查检查点大师成就
     */
    function _checkCheckpointMasterEligibility(address _user) internal view returns (bool) {
        uint256 completedCheckpoints = 0;
        uint256 totalOaths = oathContract.oathCounter();
        
        for (uint256 i = 0; i < totalOaths; i++) {
            try oathContract.getAllCheckpoints(i) returns (ChainOathSecure.Checkpoint[] memory checkpoints) {
                for (uint256 j = 0; j < checkpoints.length; j++) {
                    if (checkpoints[j].completedBy == _user && checkpoints[j].isCompleted) {
                        completedCheckpoints++;
                        if (completedCheckpoints >= achievementRequirements[AchievementType.CHECKPOINT_MASTER]) {
                            return true;
                        }
                    }
                }
            } catch {
                continue;
            }
        }
        return false;
    }
    
    /**
     * 检查互动之王成就
     */
    function _checkEngagementKingEligibility(address _user) internal view returns (bool) {
        uint256 totalEngagement = 0;
        uint256 totalOaths = oathContract.oathCounter();
        
        for (uint256 i = 0; i < totalOaths; i++) {
            // 计算点赞数
            try oathContract.getHasLiked(i, _user) returns (bool hasLiked) {
                if (hasLiked) {
                    totalEngagement++;
                }
            } catch {}
            
            // 计算评论数
            try oathContract.getCommentsCount(i) returns (uint256 commentsCount) {
                for (uint256 j = 0; j < commentsCount; j++) {
                    try oathContract.getComment(i, j) returns (address author, string memory, uint32) {
                        if (author == _user) {
                            totalEngagement++;
                        }
                    } catch {}
                }
            } catch {}
            
            if (totalEngagement >= achievementRequirements[AchievementType.ENGAGEMENT_KING]) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * 获取用户的所有成就
     */
    function getUserAchievements(address _user) external view returns (uint256[] memory) {
        return userAchievements[_user];
    }
    
    /**
     * 检查用户是否拥有特定成就
     */
    function checkUserAchievement(address _user, AchievementType _achievementType) external view returns (bool) {
        return hasAchievement[_user][_achievementType];
    }
    
    /**
     * 获取成就信息
     */
    function getAchievement(uint256 _tokenId) external view returns (Achievement memory) {
        require(_ownerOf(_tokenId) != address(0), "Achievement does not exist");
        return achievements[_tokenId];
    }
    
    /**
     * 更新成就要求（仅限管理员）
     */
    function updateAchievementRequirement(
        AchievementType _achievementType,
        uint256 _newRequirement
    ) external onlyOwner {
        achievementRequirements[_achievementType] = _newRequirement;
        emit AchievementRequirementUpdated(_achievementType, _newRequirement);
    }
    
    /**
     * 提取合约余额（仅限管理员）
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }
    
    /**
     * 暂停合约（仅限管理员）
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * 恢复合约（仅限管理员）
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // 重写必要的函数
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}