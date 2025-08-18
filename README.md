# ChainOath: 去中心化链上契约平台

**ChainOath** 是一个完全去中心化的 DApp，允许用户通过钱包交互来创建、签署和验证链上承诺协议。所有契约的生命周期都由智能合约驱动，确保过程的可验证性、不可篡改性和完全公开性。

## 快速开始

### 前置要求
- Node.js 18+ 
- npm 或 yarn
- Foundry (用于智能合约开发)
- MetaMask 或其他 Web3 钱包

### 启动步骤

```bash
# 1. 克隆项目
git clone https://github.com/your-username/ChainOath.git
cd ChainOath

# 2. 安装前端依赖
npm install

# 3. 启动前端开发服务器
npm run dev

# 4. 在新终端中启动智能合约开发环境
cd contracts/foundry-contracts
forge install
forge test -vvv --via-ir
```

访问 `http://localhost:5173` 开始体验 ChainOath！

### 项目结构

```
ChainOath/
├── src/                    # 前端源码
│   ├── components/         # React 组件
│   ├── pages/             # 页面组件
│   ├── assets/            # 静态资源
│   └── theme.ts           # 主题配置
├── contracts/             # 智能合约
│   └── foundry-contracts/ # Foundry 项目
│       ├── src/           # 合约源码
│       ├── test/          # 合约测试
│       └── foundry.toml   # Foundry 配置
├── public/                # 公共资源
├── package.json           # 前端依赖配置
└── README.md             # 项目文档
```

## 技术栈与开发环境

### 核心技术栈
- **前端框架**：React 18 + TypeScript + Vite
- **UI 组件库**：Material-UI (MUI) v6
- **区块链交互**：ethers.js v6
- **智能合约**：Solidity + Foundry
- **去中心化存储**：IPFS (用于存储誓约详情)
- **去中心化消息**：XMTP (用于参与者间通信)
- **网络支持**：Ethereum Mainnet / Sepolia Testnet

### 开发工具链
- **构建工具**：Vite 7.0.6 (快速热重载)
- **代码规范**：ESLint + TypeScript 严格模式
- **路由管理**：React Router v6
- **状态管理**：React Hooks (useState, useEffect)
- **数值处理**：BigNumber.js (精确的大数运算)
- **智能合约**：Foundry + Solidity 0.8.21 (单一主合约架构)

### 网络配置

项目支持多网络部署，采用单一主合约架构，每个网络只需配置一个合约地址：

1. **复制环境变量模板**
```bash
cp .env.example .env
```

2. **配置网络参数**
```bash
# 设置当前使用的网络
VITE_NETWORK=sepolia  # 可选: mainnet, sepolia, localhost

# Sepolia 测试网 - 单一主合约地址
VITE_SEPOLIA_CONTRACT_ADDRESS=0x8DF221De9e8f3C890DC3072f7f8d07A1B5910fcD
```

3. **网络说明**
- **Sepolia**: 推荐的以太坊测试网络，稳定且接近主网环境
- **Mainnet**: 以太坊主网，用于生产环境  
- **Localhost**: 本地开发网络（如 Hardhat/Ganache）

4. **单一主合约优势**
- 简化配置：每个网络只需一个合约地址，无需管理多个合约实例
- 降低成本：避免重复部署，节省 Gas 费用
- 统一管理：所有誓约数据集中存储，便于查询和统计

## 部署信息

### Sepolia 测试网部署

**合约地址**: `0x8DF221De9e8f3C890DC3072f7f8d07A1B5910fcD`
**部署交易**: `0x15f60d028145d7e7c1bcaf87c99f1f85b8afed2c5fa5fe0c209d664fc89ca739`
**部署区块**: `8972397`
**网络**: Sepolia Testnet (Chain ID: 11155111)
**Gas 费用**: 0.000029667698948729 ETH
**区块浏览器**: [查看合约](https://sepolia.etherscan.io/address/0x8DF221De9e8f3C890DC3072f7f8d07A1B5910fcD)

### 合约验证

合约已成功部署并可在 Sepolia 测试网上使用。所有誓约数据都存储在这个单一主合约中，通过 `oathId` 进行区分和管理。

## 项目愿景与核心理念

在数字时代，信任的建立往往依赖于中心化的第三方机构。ChainOath 旨在打破这一模式，通过区块链技术，将承诺这一社会行为赋予密码学保障。

- 去中心化信任：代码即法律，智能合约是唯一的中介
- 用户主权：用户通过钱包完全掌控自己的数据和资产
- 透明与公平：所有规则和执行过程都在链上公开，对所有参与者一视同仁
- 多角色协作：创建者、守约人、监督者三方制衡，确保誓约执行的公正性
- 经济激励：通过质押和奖励机制，激励各方诚实履约

## 技术架构与核心组件

### 单一主合约架构设计

ChainOath 采用单一主合约架构，这是一个经过深思熟虑的设计决策，具有以下核心优势：

### 架构特点
- **统一合约地址**：整个平台只有一个主合约 `ChainOathSecure.sol`，所有誓约数据都存储在该合约中
- **全局ID管理**：通过全局计数器 `nextOathId` 为每个誓约分配唯一标识符
- **中央存储映射**：使用 `mapping(uint256 => Oath) public oaths` 集中管理所有誓约数据
- **统一权限控制**：所有安全检查和权限验证都在单一合约中实现，确保一致性

### 设计优势

| 优势 | 说明 | 对比工厂模式 |
|------|------|-------------|
| **Gas 成本更低** | 避免重复部署合约代码，节省部署和交互成本 | 每个誓约都需要部署新合约，成本高昂 |
| **地址管理简化** | 前端只需配置一个合约地址，用户交互更简单 | 需要跟踪大量合约地址，管理复杂 |
| **数据查询高效** | 通过ID直接查询，支持批量操作和统计分析 | 需要遍历多个合约，查询效率低 |
| **升级维护便利** | 统一的合约逻辑，便于维护和功能扩展 | 分散的合约实例，升级困难 |
| **安全性更强** | 集中的安全控制，减少攻击面 | 分散的安全检查，风险点多 |

### 技术实现

```solidity
// 核心数据结构
contract ChainOathSecure {
    uint256 public nextOathId = 1;  // 全局誓约ID计数器
    mapping(uint256 => Oath) public oaths;  // 中央存储映射
    
    // 所有操作都基于oathId参数
    function createOath(...) external returns (uint256 oathId)
    function committerStake(uint256 oathId, ...) external
    function supervisorStake(uint256 oathId, ...) external
    function getOath(uint256 oathId) external view returns (Oath memory)
}
```

## 智能合约设计

### 角色定义

| 角色 | 描述 | 是否需质押 | 是否可获奖 | 是否影响誓约状态 |
|------|------|------------|------------|------------------|
| **创建者 Creator** | 创建誓约，设定奖励池、配置规则、分配角色 | 是（质押全部奖励池） | 是（领取剩余资金） | 是（设定规则） |
| **守约人 Committer** | 接受任务，履行誓约，被监督者评定 | 是（履约押金，可配置） | 是（完成时获得奖励） | 是（是否守约） |
| **监督者 Supervisor** | 定期进行检查并提交评定，监督守约人行为 | 是（监督押金，可配置） | 是（按成功检查次数） | 是（监督决定） |
| **查看者 Viewer** | 仅查看誓约详情与状态 | 否 | 否 | 否 |

**角色兼任说明**：
- ✅ **创建者可以同时担任守约人**：允许用户为自己创建自律性誓约
- ✅ **创建者可以同时担任监督者**：允许创建者参与监督过程
- ✅ **守约人可以同时担任监督者**：允许更灵活的角色分配
- ⚠️ **注意**：同一地址担任多个角色时，需要分别完成各角色的质押要求

### 核心数据结构

```solidity
contract ChainOathSecure {
    // 全局誓约ID计数器 - 单一主合约的核心
    uint256 public nextOathId = 1;
    
    // 中央存储映射 - 所有誓约数据的统一存储
    mapping(uint256 => Oath) public oaths;
    
    // 监督记录映射 - 按誓约ID和轮次组织
    mapping(uint256 => mapping(uint16 => SupervisionRecord)) public supervisionRecords;
    
    // 监督者状态映射 - 按誓约ID和监督者地址组织
    mapping(uint256 => mapping(address => SupervisorStatus)) public supervisorStatuses;
    
    // 质押记录映射 - 统一管理所有质押
    mapping(uint256 => mapping(address => uint256)) public stakes;
}

// 誓约状态枚举
enum OathStatus {
    Pending,    // 创建后尚未接受
    Accepted,   // 已被接受（所有角色成功在startTime之前完成了质押确认）
    Fulfilled,  // 誓言已履行（完成最后一轮监督者监督，并受约人满足守约条件）
    Broken,     // 誓言未履行（受约人誓约次数 > maxCommitterFailures）
    Aborted     // 因为种种原因被废止了
}
```

### 核心功能函数

基于ID的统一操作接口，所有函数都采用 `oathId` 作为第一个参数：

```solidity
// 创建新的誓约 - 返回全局唯一ID
function createOath(Oath memory _oath, address _token) external nonReentrant returns (uint256 oathId) {
    oathId = nextOathId++;  // 自动分配全局唯一ID
    oaths[oathId] = _oath;  // 存储到中央映射
    emit OathCreated(oathId, msg.sender);
}

// 守约人质押加入誓约 - 基于ID定位
function committerStake(uint256 _oathId, address _token, uint256 _amount) external nonReentrant {
    require(_oathId < nextOathId, "Invalid oath ID");
    Oath storage oath = oaths[_oathId];  // 直接通过ID访问
    // ... 质押逻辑
}

// 监督者质押加入誓约 - 基于ID定位
function supervisorStake(uint256 _oathId, address _token, uint256 _amount) external nonReentrant {
    require(_oathId < nextOathId, "Invalid oath ID");
    Oath storage oath = oaths[_oathId];  // 统一的访问模式
    // ... 质押逻辑
}

// 获取誓约信息 - 通过ID直接查询
function getOath(uint256 _oathId) external view returns (Oath memory) {
    require(_oathId < nextOathId, "Invalid oath ID");
    return oaths[_oathId];  // O(1)时间复杂度查询
}
```

### 事件设计

统一的事件体系，所有事件都包含oathId，便于前端监听和索引：

```solidity
event OathCreated(uint256 indexed oathId, address indexed creator);
event StakeDeposited(uint256 indexed oathId, address indexed staker, uint256 amount);
event SupervisionSubmitted(uint256 indexed oathId, address indexed supervisor, bool approval);
event OathStatusChanged(uint256 indexed oathId, OathStatus newStatus);
event RewardClaimed(uint256 indexed oathId, address indexed claimer, uint256 amount);
```

## 誓约流程说明

### 阶段 1：创建与质押

1. **创建者（Creator）** 调用 `createOath()` 创建誓约，配置所有参数并质押 `totalReward` 作为奖励池
2. **守约人（Committer）** 调用 `committerStake()` 质押履约押金
3. **监督者（Supervisor）** 调用 `supervisorStake()` 质押监督押金
4. 当所有角色都完成质押且在 `startTime` 之前，誓约状态变为 `Accepted`
5. 如果在 `startTime` 之前未完成所有质押，誓约状态变为 `Aborted`

### 阶段 2：监督与履约

1. **监督周期**：每隔 `checkInterval` 触发一个监督轮次
2. **监督窗口**：监督者需在轮次开始后的 `checkWindow` 时间内提交评定
3. **监督评定**：监督者调用 `submitSupervision()` 提交 `true`（守约）或 `false`（失约）
4. **失职处理**：
   - 未在时间窗口内提交评定 → 记录失职一次
   - 失职次数超过 `maxSupervisorMisses` → 监督者被取消资格，质押金被没收
5. **轮次判定**：
   - 有效监督者中批准比例 ≥ `checkThresholdPercent` → 该轮次守约成功
   - 否则 → 该轮次守约失败，记录守约人失败一次
6. **誓约终止条件**：
   - 守约人失败次数超过 `maxCommitterFailures` → 誓约状态变为 `Broken`
   - 完成所有轮次且未超过失败限制 → 誓约状态变为 `Fulfilled`

### 阶段 3：奖励分配与结算

1. **守约人奖励**（誓约完成时）：
   - 获得奖励池中 `(100 - supervisorRewardRatio)%` 的金额
   - 取回自己的质押金

2. **监督者奖励**：
   - 按成功检查次数分配监督者总奖励
   - 未被取消资格的监督者可取回质押金
   - 被取消资格的监督者失去质押金

3. **创建者收益**：
   - 守约人失约时，可领取剩余的奖励池资金
   - 可领取被没收的质押金

4. **特殊情况**：
   - 誓约被废止（`Aborted`）时，所有参与者可通过 `refundStake()` 取回质押金

## 开发、测试与部署流程

### 环境准备

#### 前端开发环境
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 代码检查
npm run lint
```

#### 智能合约开发环境
```bash
# 进入合约目录
cd contracts/foundry-contracts

# 安装 Foundry 依赖
forge install

# 编译合约
forge build

# 运行测试
forge test -vvv --via-ir

# 启动本地测试网络
anvil
```

### 测试流程

#### 智能合约测试
- 使用 `Foundry` 框架进行合约测试
- 支持 Solidity 原生测试，无需 JavaScript
- 使用 `--via-ir` 优化编译，支持复杂合约逻辑
- 测试覆盖所有核心功能：创建誓约、监督检查、奖励分配等

```bash
# 运行所有测试
forge test -vvv --via-ir

# 运行特定测试
forge test --match-test test_SupervisorCheck_Success -vvv

# 生成测试覆盖率报告
forge coverage
```

### 部署流程

#### 智能合约部署
```bash
# 部署到本地测试网
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast

# 部署到 Sepolia 测试网
forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast --verify
```

#### 前端部署
- 支持 `Vercel`、`Netlify` 等现代化部署平台
- 自动化 CI/CD 流程
- 环境变量管理合约地址和网络配置

```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 未来可拓展方向

- 社交功能：允许用户评论、点赞或见证他人的誓约
- 模板市场：用户可以创建和分享常用的誓约模板
- DAO 治理：引入治理代币，由社区决定平台的发展方向和参数
- 多链支持：将 ChainOath 扩展到其他 EVM 兼容链，如 Polygon, Arbitrum 等
