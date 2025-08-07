# ⛓️ ChainOath: 去中心化链上契约平台

**ChainOath** 是一个完全去中心化的 DApp，它允许用户通过钱包交互来创建、签署和验证链上"承诺协议"。无论是个人习惯养成、团队目标达成，还是朋友间的趣味约定，所有契约的生命周期都由智能合约驱动，确保了过程的**可验证性、不可篡改性和完全公开性**。

## 🚀 快速开始

### 📋 前置要求
- Node.js 18+ 
- npm 或 yarn
- [Foundry](https://getfoundry.sh/) (用于智能合约开发)
- MetaMask 或其他 Web3 钱包

### ⚡ 一键启动

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

### 📁 项目结构

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

---

# 🧭 一、项目愿景与核心理念

在数字时代，信任的建立往往依赖于中心化的第三方机构。ChainOath 旨在打破这一模式，通过区块链技术，将“承诺”这一社会行为赋予密码学保障。我们相信，当承诺的履行过程变得透明、自动且不可干预时，人与人之间的协作将达到新的高度。

- **去中心化信任**：代码即法律，智能合约是唯一的中介。
- **用户主权**：用户通过钱包完全掌控自己的数据和资产。
- **透明与公平**：所有规则和执行过程都在链上公开，对所有参与者一视同仁。

---

# 🧱 二、技术架构与核心组件

ChainOath 采用纯 DApp 架构，前端直接与区块链和去中心化存储交互，无任何中心化后端服务器。这保证了平台的抗审查性和高可用性。

| 模块 | 技术选型 | 选型理由 |
| :--- | :--- | :--- |
| **前端框架** | `React 19.1.0` + `Vite 7.0.4` + `TypeScript 5.8.3` | 最新版本的现代前端技术栈，提供最佳的开发体验和性能。 |
| **UI 组件库** | `Material-UI 7.2.0` + `Tailwind CSS 4.1.11` | MUI 提供丰富的组件，Tailwind 提供原子化 CSS，双重保障界面美观性。 |
| **样式方案** | `Emotion` + `Styled-Components` | 支持 CSS-in-JS，提供动态样式和主题切换能力。 |
| **图标库** | `Lucide React` + `MUI Icons` | 现代化的图标库，覆盖各种使用场景。 |
| **路由管理** | `React Router DOM 7.7.1` | 最新版本的 React 路由解决方案，支持现代化的路由特性。 |
| **状态管理** | `Zustand 5.0.7` | 轻量、简洁的全局状态管理方案，对 React Hooks 友好。 |
| **区块链交互** | `Wagmi 2.16.1` + `Viem 2.33.2` + `Ethers.js 6.15.0` | 最新的 Web3 技术栈，Wagmi 提供强大的 React Hooks，Viem 轻量高效。 |
| **智能合约开发** | `Solidity 0.8.21` + `Foundry` | Solidity 是以太坊生态标准，Foundry 提供快速、现代化的合约开发和测试环境。 |
| **代码质量** | `ESLint 9.30.1` + `TypeScript ESLint` | 严格的代码规范和类型检查，确保代码质量。 |
| **构建工具** | `PostCSS` + `Autoprefixer` | 现代化的 CSS 处理工具链。 |
| **目标网络** | `Ethereum Testnet` (Sepolia) | 主流测试网络，拥有丰富的工具和生态支持。 |

---

## 📋 三、页面结构与核心功能

应用的核心用户旅程围绕着“创建”、“签署”、“履行”和“验证”四个环节展开。

### 1️⃣ **首页 (`/`) - 发现与入口**

- **目的**：吸引用户，清晰传达产品价值，并提供核心操作的入口。
- **核心元素**：
    - **醒目的 Logo 和 Slogan**：例如 “ChainOath: Code Your Promise, Trust the Chain.”
    - **项目简介**：用动画或图文形式生动介绍平台如何运作。
    - **`Connect Wallet` 按钮**：页面右上角常驻，使用 `Wagmi` 的 `useConnect` Hook 实现。
    - **核心操作按钮**：
        - `[ 创建我的誓约 ]` -> `/create`
        - `[ 查看我的誓约 ]` -> `/my-oaths` (需连接钱包)

### 2️⃣ **创建誓约页 (`/create`) - 定义承诺**

- **目的**：引导用户清晰、完整地定义一个链上契约。
- **表单结构**：
    - **誓约标题** (必填): `string`
    - **誓约详情** (可选): `string` (Markdown/富文本), 上传至 IPFS。
    - **参与人地址** (至少一个): `address[]`
    - **打卡周期**: `select` (每日 / 每周)
    - **持续时间**: `number` (天)
    - **个人押金**: `number` (ETH)
    - **公共奖励池**: `number` (ETH, 可选)
- **提交流程**：
    1.  用户填写表单，点击 `[ 发起誓约 ]`。
    2.  若包含誓约详情，前端将其上传至 IPFS，获取 `CID`。
    3.  构造交易，调用合约的 `createOath()` 方法，并附带所有参数和押金。
    4.  交易成功后，跳转至该誓约的详情页 (`/oath/:id`)，并提示用户分享链接给其他参与者。

### 3️⃣ **我的誓约页 (`/my-oaths`) - 管理与追踪**

- **目的**：展示用户所有相关（创建或参与）的誓约，并提供交互入口。
- **核心元素**：
    - **`Oath Card` 列表**：每个卡片展示誓约的核心信息（标题、状态、进度、起止时间）。
    - **状态标签**：用不同颜色区分 `[ 待签署 ]`, `[ 进行中 ]`, `[ 已完成 ]`, `[ 已违约 ]`。
    - **交互按钮**：
        - `[ 查看详情 ]` -> `/oath/:id`
        - `[ 签名加入 ]` (仅对未签名的参与者显示)
        - `[ 我要打卡 ]` (在打卡周期内可用)
        - `[ 领取奖励 ]` (在完成后可用)

### 4️⃣ **誓约详情页 (`/oath/:id`) - 透明与验证**

- **目的**：提供单个誓约的所有详细信息，作为信任的最终来源。
- **核心元素**：
    - **合约基础信息**：创建者、所有参与人、当前状态、起止时间、押金/奖励池金额。
    - **誓约内容**：从 IPFS 读取并展示誓约详情。
    - **参与人状态**：列表展示每个参与人的签名状态和打卡记录。
    - **时间线/进度条**：可视化展示整个誓约的生命周期和每个人的打卡进度。
    - **交互按钮**：根据用户身份和合约状态，动态显示 `[ 签名 ]`, `[ 打卡 ]`, `[ 领取奖励 ]` 等操作按钮。

---

# ⛓️ 四、智能合约设计（核心逻辑）

## 🧬 ChainOath 智能合约规则文档

## 1. 角色定义

| 角色 | 描述 | 是否需质押 | 是否可获奖 | 是否影响誓约状态 |
|------|------|------------|------------|------------------|
| **创建者 Creator** | 创建誓约，设定奖励池、配置规则、分配角色 | ✅（质押全部奖励池） | ✅（领取剩余资金） | ✅（设定规则） |
| **守约人 Committer** | 接受任务，履行誓约，被监督者评定 | ✅（履约押金，可配置） | ✅（完成时获得奖励） | ✅（是否守约） |
| **监督者 Supervisor** | 定期进行检查并提交评定，监督守约人行为 | ✅（监督押金，可配置） | ✅（按成功检查次数） | ✅（监督决定） |
| **查看者 Viewer** | 仅查看誓约详情与状态 | ❌ | ❌ | ❌ |

---

## 2. 智能合约核心结构

### 主要数据结构

```solidity
// 誓约状态枚举
enum OathStatus {
    Pending,    // 创建后尚未接受
    Accepted,   // 已被接受（所有角色成功在startTime之前完成了质押确认）
    Fulfilled,  // 誓言已履行（完成最后一轮监督者监督，并受约人满足守约条件）
    Broken,     // 誓言未履行（受约人誓约次数 > maxCommitterFailures）
    Aborted     // 因为种种原因被废止了
}

// 誓约主体结构
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

// 监督记录结构
struct SupervisionRecord {
    mapping(address => bool) hasChecked;     // 监督者是否已检查
    mapping(address => bool) approvals;     // 监督者的批准状态
    uint16 totalChecked;                    // 总检查人数
    uint16 totalApproved;                   // 总批准人数
    bool isCompleted;                       // 本轮是否完成
    bool isSuccess;                         // 本轮是否成功
}

// 监督者状态结构
struct SupervisorStatus {
    uint16 missCount;                       // 失职次数
    uint16 successfulChecks;                // 成功检查次数
    bool isDisqualified;                   // 是否被取消资格
}
```

### 核心功能函数

```solidity
// 创建新的誓约
function createOath(Oath memory _oath, address _token) external nonReentrant

// 守约人质押加入誓约
function committerStake(uint256 _oathId, address _token, uint256 _amount) external nonReentrant

// 监督者质押加入誓约
function supervisorStake(uint256 _oathId, address _token, uint256 _amount) external nonReentrant

// 监督者提交检查结果
function submitSupervision(uint256 _oathId, bool _approval) external nonReentrant

// 处理超时的监督轮次
function processTimeoutRound(uint256 _oathId) external

// 领取奖励
function claimReward(uint256 _oathId) external nonReentrant

// 检查并更新誓约状态
function checkOathStatus(uint256 _oathId) external

// 退回质押金（仅在誓约被废止时）
function refundStake(uint256 _oathId) external nonReentrant

// 获取誓约信息
function getOath(uint256 _oathId) external view returns (Oath memory)

// 获取监督记录
function getSupervisionRecord(uint256 _oathId, uint16 _round) external view

// 获取监督者状态
function getSupervisorStatus(uint256 _oathId, address _supervisor) external view
```

## 3. 誓约流程说明

**阶段 1：创建与质押**

1. **创建者（Creator）** 调用 `createOath()` 创建誓约，配置所有参数并质押 `totalReward` 作为奖励池
2. **守约人（Committer）** 调用 `committerStake()` 质押履约押金
3. **监督者（Supervisor）** 调用 `supervisorStake()` 质押监督押金
4. 当所有角色都完成质押且在 `startTime` 之前，誓约状态变为 `Accepted`
5. 如果在 `startTime` 之前未完成所有质押，誓约状态变为 `Aborted`

**阶段 2：监督与履约**

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

**阶段 3：奖励分配与结算**

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

---

## 4. 奖励计算与惩罚机制

### 奖励分配公式

```javascript
// 基础奖励分配
监督者总奖励 = totalReward × (supervisorRewardRatio / 100)
守约人总奖励 = totalReward × ((100 - supervisorRewardRatio) / 100)

// 监督者个人奖励计算
有效监督者数量 = 已质押且未被取消资格的监督者数量
单个监督者基础奖励 = 监督者总奖励 / 有效监督者数量 / 总检查轮次
监督者实际奖励 = 单个监督者基础奖励 × 该监督者成功检查次数

// 创建者剩余资金
创建者可领取金额 = 合约剩余代币余额（包括未分配奖励和被没收质押金）
```

### 惩罚规则

| 违规行为 | 惩罚结果 | 影响范围 |
|----------|----------|----------|
| 监督者未在时间窗口内提交评定 | 记录失职一次 | 个人失职计数 |
| 监督者累计失职超过 `maxSupervisorMisses` | 被取消资格，没收全部质押金 | 失去奖励和质押金 |
| 守约人单轮次未通过监督评定 | 记录失败一次 | 个人失败计数 |
| 守约人累计失败超过 `maxCommitterFailures` | 誓约状态变为 `Broken`，没收质押金 | 失去奖励和质押金 |
| 质押期结束前未完成所有质押 | 誓约状态变为 `Aborted` | 所有人可退回质押金 |

### 代币支持

- **支持 ERC20 代币**：合约支持任意 ERC20 代币作为质押和奖励代币
- **灵活配置**：创建者可指定使用的代币类型
- **安全转账**：使用 `transferFrom` 和 `transfer` 确保代币安全

---

## 5. 关键特性与安全机制

### 时间管理
- **自动轮次计算**：根据 `checkInterval` 自动计算当前监督轮次
- **时间窗口控制**：监督者必须在指定的 `checkWindow` 内提交评定
- **超时处理**：支持通过 `processTimeoutRound()` 处理超时的监督轮次

### 状态同步
- **实时状态更新**：誓约状态根据参与者行为自动更新
- **条件检查**：每次质押后自动检查是否满足誓约接受条件
- **状态查询**：提供丰富的查询接口获取誓约和参与者状态

### 安全保障
- **重入保护**：所有状态变更函数使用 `nonReentrant` 修饰符
- **权限控制**：严格的角色权限验证，防止未授权操作
- **资金安全**：使用 OpenZeppelin 标准库确保代币转账安全

---

## 6. 安全机制与最佳实践

### 已实现的安全措施
- **重入攻击防护**：使用 OpenZeppelin 的 `ReentrancyGuard`，所有资金操作函数都有 `nonReentrant` 保护
- **权限验证**：严格的角色权限检查，确保只有授权用户可以执行相应操作
- **状态一致性**：完善的状态检查机制，防止在错误状态下执行操作
- **时间控制**：精确的时间窗口管理，防止过期操作和时间操纵
- **代币安全**：使用标准 ERC20 接口，支持 `transferFrom` 和 `transfer` 安全转账

### 设计原则
- **去中心化**：无需中心化服务器，完全基于智能合约运行
- **透明性**：所有规则和状态变更都在链上公开可验证
- **可扩展性**：支持任意 ERC20 代币，灵活的参数配置
- **用户友好**：提供丰富的查询接口和状态反馈

### 未来改进方向
- **争议仲裁**：引入去中心化仲裁机制处理特殊争议
- **链下存储**：支持将详细描述和证明材料存储到 IPFS
- **多签支持**：支持多重签名增强安全性
- **治理机制**：引入 DAO 治理优化平台参数

---

## 7. 示例配置参考

| 字段 | 示例值 |
|------|--------|
| totalReward | 100 ETH |
| supervisorRatio | 10% |
| committerRatio | 90% |
| committerStake | 2 ETH |
| supervisorStake | 1 ETH |
| checkInterval | 每 5 天 |
| checkWindow | 2 天 |
| maxSupervisorMisses | 2 次 |
| maxCommitterFailures | 1 次 |


---

# 🧪 五、开发、测试与部署流程

我们遵循专业的软件开发生命周期，确保代码质量和应用稳定性。

## 🔧 环境准备

### 前端开发环境
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

### 智能合约开发环境
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

## 🧪 测试流程

### 智能合约测试
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

### 前端测试
- 使用 `ESLint` 进行代码质量检查
- TypeScript 严格模式确保类型安全
- 组件级别的单元测试（计划中）

## 🚀 部署流程

### 智能合约部署
```bash
# 部署到本地测试网
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast

# 部署到 Sepolia 测试网
forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast --verify
```

### 前端部署
- 支持 `Vercel`、`Netlify` 等现代化部署平台
- 自动化 CI/CD 流程
- 环境变量管理合约地址和网络配置

```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

---

# ✅ 六、未来可拓展方向

- **社交功能**：允许用户评论、点赞或“见证”他人的誓约。
- **模板市场**：用户可以创建和分享常用的誓约模板。
- **DAO 治理**：引入治理代币，由社区决定平台的发展方向和参数。
- **多链支持**：将 ChainOath 扩展到其他 EVM 兼容链，如 Polygon, Arbitrum 等。
