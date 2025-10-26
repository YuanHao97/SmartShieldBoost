// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./LiquidityPool.sol";
import "./MockETH.sol";

contract ETHSimulator is Ownable {
    using SafeERC20 for IERC20;
    
    // 流动性池合约
    LiquidityPool public immutable liquidityPool;
    MockETH public immutable mockETH;
    
    // 事件
    event ETHMinted(address indexed to, uint256 amount);
    event ETHBurned(address indexed from, uint256 amount);
    event ETHTraded(
        address indexed trader,
        bool isBuy,
        uint256 ethAmount,
        uint256 pyusdAmount,
        uint256 newPrice
    );
    
    constructor(address _liquidityPool, address _mockETH) Ownable(msg.sender) {
        liquidityPool = LiquidityPool(_liquidityPool);
        mockETH = MockETH(_mockETH);
    }
    
    // 铸造ETH给用户（用于测试）
    function mintETH(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid address");
        require(amount > 0, "Invalid amount");
        
        mockETH.mint(to, amount);
        emit ETHMinted(to, amount);
    }
    
    // 销毁用户的ETH
    function burnETH(address from, uint256 amount) external onlyOwner {
        require(from != address(0), "Invalid address");
        require(amount > 0, "Invalid amount");
        require(mockETH.balanceOf(from) >= amount, "Insufficient ETH balance");
        
        mockETH.burn(from, amount);
        emit ETHBurned(from, amount);
    }
    
    // 买入ETH
    function buyETH(uint256 ethAmount) external {
        require(ethAmount > 0, "Invalid ETH amount");
        
        // 计算需要的PYUSD数量
        uint256 pyusdNeeded = liquidityPool.calculateBuyAmount(ethAmount);
        
        // 从用户账户转移PYUSD到流动性池
        IERC20 pyusd = IERC20(liquidityPool.mockPYUSD());
        pyusd.safeTransferFrom(msg.sender, address(liquidityPool), pyusdNeeded);
        
        // 调用流动性池的买入函数（会自动铸造MockETH给用户）
        liquidityPool.buyETH(ethAmount);
        
        emit ETHTraded(msg.sender, true, ethAmount, pyusdNeeded, liquidityPool.getCurrentPrice());
    }
    
    // 卖出ETH
    function sellETH(uint256 ethAmount) external {
        require(ethAmount > 0, "Invalid ETH amount");
        require(mockETH.balanceOf(msg.sender) >= ethAmount, "Insufficient ETH balance");
        
        // 调用流动性池的卖出函数（会自动销毁用户的MockETH）
        liquidityPool.sellETH(ethAmount);
        
        emit ETHTraded(msg.sender, false, ethAmount, 0, liquidityPool.getCurrentPrice());
    }
    
    // 获取用户ETH余额
    function getETHBalance(address user) external view returns (uint256) {
        return mockETH.balanceOf(user);
    }
    
    // 获取当前ETH价格
    function getCurrentPrice() external view returns (uint256) {
        return liquidityPool.getCurrentPrice();
    }
    
    // 获取池子信息
    function getPoolInfo() external view returns (
        uint256 ethReserve,
        uint256 pyusdReserve,
        uint256 currentPrice,
        uint256 totalLiquidity
    ) {
        return liquidityPool.getPoolInfo();
    }
}
