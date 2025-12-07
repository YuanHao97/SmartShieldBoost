import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 合约名称列表
const CONTRACT_NAMES = [
  "MockPYUSD",
  "MockETH", 
  "LiquidityPool",
  "ETHSimulator"
];

// 提取ABI的函数
function extractABI(contractName: string) {
  try {
    const artifactPath = join(__dirname, `../artifacts/contracts/${contractName}.sol/${contractName}.json`);
    const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'));
    return artifact.abi;
  } catch (error) {
    console.error(`❌ 无法读取 ${contractName} 的ABI:`, error);
    return null;
  }
}

// 生成前端ABI文件
function generateFrontendABI() {
  console.log("🔧 开始提取合约ABI...");
  
  const abis: Record<string, any[]> = {};
  
  // 提取所有合约的ABI
  for (const contractName of CONTRACT_NAMES) {
    const abi = extractABI(contractName);
    if (abi) {
      abis[contractName] = abi;
      console.log(`✅ ${contractName} ABI提取成功`);
    }
  }
  
  // 生成JavaScript文件（使用全局变量，兼容浏览器）
  const jsContent = `// 自动生成的合约ABI文件
// 生成时间: ${new Date().toISOString()}

// 全局变量，供浏览器使用
window.CONTRACT_ABIS = ${JSON.stringify(abis, null, 2)};

// 合约地址 (Hardhat本地网络)
window.CONTRACT_ADDRESSES = {
  MockPYUSD: "0x5fbdb2315678afecb367f032d93f642f64180aa3",
  MockETH: "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512",
  LiquidityPool: "0xcf7ed3acca5a467e9e704c703e8d87f634fb0fc9",
  ETHSimulator: "0xdc64a140aa3e981100a9beca4e685f962f0cf6c9"
};

// 简化的ABI (只包含前端需要的函数)
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

// 兼容ES6模块导出（如果使用模块系统）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CONTRACT_ABIS: window.CONTRACT_ABIS,
    CONTRACT_ADDRESSES: window.CONTRACT_ADDRESSES,
    SIMPLIFIED_ABIS: window.SIMPLIFIED_ABIS
  };
}
`;

  // 写入JavaScript文件
  const jsPath = join(__dirname, "../frontend/contract-abis.js");
  writeFileSync(jsPath, jsContent);
  console.log(`📄 前端ABI文件已生成: ${jsPath}`);
  
  // 生成JSON文件
  const jsonContent = {
    timestamp: new Date().toISOString(),
    contracts: abis,
    addresses: {
      MockPYUSD: "0x5fbdb2315678afecb367f032d93f642f64180aa3",
      MockETH: "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512",
      LiquidityPool: "0xcf7ed3acca5a467e9e704c703e8d87f634fb0fc9",
      ETHSimulator: "0xdc64a140aa3e981100a9beca4e685f962f0cf6c9"
    }
  };
  
  const jsonPath = join(__dirname, "../frontend/contract-abis.json");
  writeFileSync(jsonPath, JSON.stringify(jsonContent, null, 2));
  console.log(`📄 JSON ABI文件已生成: ${jsonPath}`);
  
  // 生成TypeScript声明文件
  const tsContent = `// 自动生成的TypeScript声明文件
// 生成时间: ${new Date().toISOString()}

export interface ContractABIs {
  MockPYUSD: any[];
  MockETH: any[];
  LiquidityPool: any[];
  ETHSimulator: any[];
}

export interface ContractAddresses {
  MockPYUSD: string;
  MockETH: string;
  LiquidityPool: string;
  ETHSimulator: string;
}

export declare const CONTRACT_ABIS: ContractABIs;
export declare const CONTRACT_ADDRESSES: ContractAddresses;
export declare const SIMPLIFIED_ABIS: ContractABIs;
`;

  const tsPath = join(__dirname, "../frontend/contract-abis.d.ts");
  writeFileSync(tsPath, tsContent);
  console.log(`📄 TypeScript声明文件已生成: ${tsPath}`);
  
  console.log("\n🎉 ABI提取完成！");
  console.log("📋 生成的文件:");
  console.log(`  - ${jsPath}`);
  console.log(`  - ${jsonPath}`);
  console.log(`  - ${tsPath}`);
}

// 运行ABI提取
generateFrontendABI();
