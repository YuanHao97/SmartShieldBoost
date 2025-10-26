import { writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { network } from "hardhat";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Function to extract ABI
function extractABI(contractName: string) {
  try {
    const artifactPath = join(__dirname, `../artifacts/contracts/${contractName}.sol/${contractName}.json`);
    const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'));
    return artifact.abi;
  } catch (error) {
    console.error(`❌ Failed to read ABI for ${contractName}:`, error);
    return null;
  }
}

// Generate frontend ABI file
function generateFrontendABI(deploymentInfo: any) {
  console.log("\n🔧 Extracting contract ABIs...");
  
  const contractNames = ["MockPYUSD", "MockETH", "PyusdHandler", "LiquidityPool", "ETHSimulator"];
  const abis: Record<string, any[]> = {};
  
  // Extract ABIs for all contracts
  for (const contractName of contractNames) {
    const abi = extractABI(contractName);
    if (abi) {
      abis[contractName] = abi;
      console.log(`✅ ${contractName} ABI extracted successfully`);
    }
  }
  
  // Generate JavaScript file (using global variables, compatible with browsers)
  const jsContent = `// Auto-generated contract ABI file
// Generated at: ${new Date().toISOString()}

// Global variables for browser use
window.CONTRACT_ABIS = ${JSON.stringify(abis, null, 2)};

// Contract addresses (Hardhat local network)
window.CONTRACT_ADDRESSES = ${JSON.stringify(deploymentInfo.contracts, null, 2)};

// Simplified ABIs (only functions needed by frontend)
window.SIMPLIFIED_ABIS = {
  LiquidityPool: [
    "function getPoolInfo() external view returns (uint256, uint256, uint256, uint256)",
    "function getCurrentPrice() public view returns (uint256)",
    "function calculateBuyAmount(uint256 _ethAmount) public view returns (uint256)",
    "function calculateSellAmount(uint256 _ethAmount) public view returns (uint256)",
    "event TradeExecuted(address indexed trader, bool isBuy, uint256 ethAmount, uint256 pyusdAmount, uint256 newPrice, uint256 timestamp)"
  ],
  
  ETHSimulator: [
    "function buyETH(uint256 ethAmount) external",
    "function sellETH(uint256 ethAmount) external", 
    "function getETHBalance(address user) external view returns (uint256)",
    "function getCurrentPrice() external view returns (uint256)",
    "function getPoolInfo() external view returns (uint256, uint256, uint256, uint256)",
    "event ETHTraded(address indexed trader, bool isBuy, uint256 ethAmount, uint256 pyusdAmount, uint256 newPrice)"
  ],
  
  MockPYUSD: [
    "function balanceOf(address account) external view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function transfer(address to, uint256 amount) external returns (bool)",
    "function mint(address to, uint256 amount) external"
  ]
};

// Compatible with ES6 module exports (if using module system)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CONTRACT_ABIS: window.CONTRACT_ABIS,
    CONTRACT_ADDRESSES: window.CONTRACT_ADDRESSES,
    SIMPLIFIED_ABIS: window.SIMPLIFIED_ABIS
  };
}
`;

  // Write JavaScript file
  const jsPath = join(__dirname, "../frontend/contract-abis.js");
  writeFileSync(jsPath, jsContent);
  console.log(`📄 Frontend ABI file generated: ${jsPath}`);
  
  // Generate JSON file
  const jsonContent = {
    timestamp: new Date().toISOString(),
    contracts: abis,
    addresses: deploymentInfo.contracts,
    initialization: deploymentInfo.initialization
  };
  
  const jsonPath = join(__dirname, "../frontend/contract-abis.json");
  writeFileSync(jsonPath, JSON.stringify(jsonContent, null, 2));
  console.log(`📄 JSON ABI file generated: ${jsonPath}`);
}

async function main() {
  console.log("🚀 Starting trading system deployment...");
  const { viem } = await network.connect();
  // Get deployer account
  const [deployer] = await viem.getWalletClients();
  console.log(`📊 Deployer address: ${deployer.account.address}`);
  // console.log(`💰 部署者余额: ${Number(await viem.getBalance({ address: deployer.account.address })) / 1e18} ETH`);

  // Deploy contracts
  console.log("\n📦 Starting contract deployment...");

  // 1. Deploy MockPYUSD
  console.log("1️⃣ Deploying MockPYUSD...");
  const mockPYUSD = await viem.deployContract("MockPYUSD", []);
  console.log(`✅ MockPYUSD deployed to: ${mockPYUSD.address}`);

  // 2. Deploy MockETH
  console.log("2️⃣ Deploying MockETH...");
  const mockETH = await viem.deployContract("MockETH", []);
  console.log(`✅ MockETH deployed to: ${mockETH.address}`);

  // 3. Deploy PyusdHandler
  console.log("3️⃣ Deploying PyusdHandler...");
  const pyusdHandler = await viem.deployContract("PyusdHandler", [mockPYUSD.address]);
  console.log(`✅ PyusdHandler deployed to: ${pyusdHandler.address}`);

  // 4. Deploy LiquidityPool
  console.log("4️⃣ Deploying LiquidityPool...");
  const liquidityPool = await viem.deployContract("LiquidityPool", [mockPYUSD.address, mockETH.address, pyusdHandler.address]);
  console.log(`✅ LiquidityPool deployed to: ${liquidityPool.address}`);

  // 5. Deploy ETHSimulator
  console.log("5️⃣ Deploying ETHSimulator...");
  const ethSimulator = await viem.deployContract("ETHSimulator", [liquidityPool.address, mockETH.address]);
  console.log(`✅ ETHSimulator deployed to: ${ethSimulator.address}`);

  // Initialize system
  console.log("\n🔧 Initializing system...");

  // Mint initial PYUSD to deployer
  const initialPYUSD = 20000000n * 10n ** 6n; // 20,000,000 PYUSD
  await mockPYUSD.write.mint([deployer.account.address, initialPYUSD]);
  console.log(`💰 Minted ${Number(initialPYUSD) / 1e6} PYUSD to deployer`);

  // Add LiquidityPool as minter for MockETH
  await mockETH.write.addMinter([liquidityPool.address]);
  console.log(`🔑 Added LiquidityPool as MockETH minter`);

  // Initialize liquidity pool
  const initialETHReserve = 100n * 10n ** 18n; // 100 ETH
  const initialPYUSDReserve = 10000n * 10n ** 6n; // 10,000 PYUSD (100 ETH * 100 PYUSD/ETH)
  
  await mockPYUSD.write.approve([liquidityPool.address, initialPYUSDReserve]);
  await liquidityPool.write.initializePool([initialETHReserve, initialPYUSDReserve]);
  console.log(`🏦 Liquidity pool initialized: ${Number(initialETHReserve) / 1e18} ETH, ${Number(initialPYUSDReserve) / 1e6} PYUSD`);
  // const cp = await liquidityPool.read.getCurrentPrice();
  // console.log(`📈 初始ETH价格1: ${Number(cp) / 1e6} PYUSD`);
  // Get initial price
  const initialPrice = await liquidityPool.read.getCurrentPrice();
  console.log(`📈 Initial ETH price: ${Number(initialPrice) / 1e6} PYUSD`);

  // Save deployment info
  const deploymentInfo = {
    network: "hardhat",
    deployer: deployer.account.address,
    contracts: {
      MockPYUSD: mockPYUSD.address,
      MockETH: mockETH.address,
      PyusdHandler: pyusdHandler.address,
      LiquidityPool: liquidityPool.address,
      ETHSimulator: ethSimulator.address
    },
    initialization: {
      initialETHReserve: Number(initialETHReserve) / 1e18,
      initialPYUSDReserve: Number(initialPYUSDReserve) / 1e6,
      initialPrice: Number(initialPrice) / 1e6
    },
    timestamp: new Date().toISOString()
  };

  const deploymentPath = join(__dirname, "../log/deployment-info.json");
  writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to: ${deploymentPath}`);

  // Generate frontend ABI file
  generateFrontendABI(deploymentInfo);

  // Output deployment summary
  console.log("\n📋 Deployment Summary:");
  console.log("=".repeat(50));
  console.log(`🌐 Network: Hardhat`);
  console.log(`👤 Deployer: ${deploymentInfo.deployer}`);
  console.log(`📦 MockPYUSD: ${deploymentInfo.contracts.MockPYUSD}`);
  console.log(`📦 MockETH: ${deploymentInfo.contracts.MockETH}`);
  console.log(`📦 PyusdHandler: ${deploymentInfo.contracts.PyusdHandler}`);
  console.log(`📦 LiquidityPool: ${deploymentInfo.contracts.LiquidityPool}`);
  console.log(`📦 ETHSimulator: ${deploymentInfo.contracts.ETHSimulator}`);
  console.log(`💰 Initial Price: ${deploymentInfo.initialization.initialPrice} PYUSD`);
  console.log("=".repeat(50));

  // Test basic functionality
  console.log("\n🧪 Testing basic functionality...");
  
  // Test price query
  const currentPrice = await liquidityPool.read.getCurrentPrice();
  console.log(`✅ Current price query: ${Number(currentPrice) / 1e6} PYUSD`);
  
  // 测试池子信息查询
  const poolInfo = await liquidityPool.read.getPoolInfo();
  // console.log(`✅ 池子信息查询: ETH=${Number(poolInfo.ethReserve) / 1e18}, PYUSD=${Number(poolInfo.pyusdReserve) / 1e6}`);
  
  // Test buy calculation
  const testETHAmount = 1n * 10n ** 18n; // 1 ETH
  const buyAmount = await liquidityPool.read.calculateBuyAmount([testETHAmount]);
  console.log(`✅ Buy 1 ETH requires: ${Number(buyAmount) / 1e6} PYUSD`);
  
  // Test sell calculation
  const sellAmount = await liquidityPool.read.calculateSellAmount([testETHAmount]);
  console.log(`✅ Sell 1 ETH gets: ${Number(sellAmount) / 1e6} PYUSD`);

  console.log("\n🎉 Deployment completed! System is ready.");
  console.log("\n📝 Next steps:");
  console.log("1. Run simulation trading: npx hardhat run scripts/simulate-trading.ts");
  console.log("2. Open frontend page: frontend/trading-dashboard.html");
  console.log("3. View deployment info: log/deployment-info.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });