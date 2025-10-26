// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./PYUSDHandler.sol";
import "./MockETH.sol";

contract LiquidityPool is Ownable {
    using SafeERC20 for IERC20;
    
    // 代币合约
    IERC20 public immutable mockPYUSD;
    MockETH public immutable mockETH;
    PyusdHandler public immutable pyusdHandler;
    
    // 流动性池状态
    uint256 public ethReserve;           // ETH储备量
    uint256 public pyusdReserve;         // PYUSD储备量
    uint256 public constant INITIAL_ETH_PRICE = 100; // 初始ETH价格（PYUSD）
    
    // 交易事件
    event TradeExecuted(
        address indexed trader,
        bool isBuy,           // true = 买入ETH, false = 卖出ETH
        uint256 ethAmount,
        uint256 pyusdAmount,
        uint256 newPrice,
        uint256 timestamp
    );
    
    event LiquidityAdded(
        address indexed provider,
        uint256 ethAmount,
        uint256 pyusdAmount
    );
    
    constructor(
        address _mockPYUSD,
        address _mockETH,
        address _pyusdHandler
    ) Ownable(msg.sender) {
        mockPYUSD = IERC20(_mockPYUSD);
        mockETH = MockETH(_mockETH);
        pyusdHandler = PyusdHandler(_pyusdHandler);
    }
    
    // 初始化流动性池
    function initializePool(uint256 _ethAmount, uint256 _pyusdAmount) external onlyOwner {
        require(ethReserve == 0 && pyusdReserve == 0, "Pool already initialized");
        require(_ethAmount > 0 && _pyusdAmount > 0, "Invalid amounts");
        
        ethReserve = _ethAmount;
        pyusdReserve = _pyusdAmount;
        
        // 将PYUSD转入合约
        mockPYUSD.safeTransferFrom(msg.sender, address(this), _pyusdAmount);
        
        emit LiquidityAdded(msg.sender, _ethAmount, _pyusdAmount);
    }
    
    // 获取当前ETH价格
    function getCurrentPrice() public view returns (uint256) {
        if (ethReserve == 0) return INITIAL_ETH_PRICE * 1e18;
        // pyusdReserve 有6位小数，ethReserve 有18位小数
        // 要得到 PYUSD/ETH 的价格，需要调整小数位数
        // 价格 = (pyusdReserve * 1e18) / ethReserve，但需要除以1e6来调整PYUSD的小数位
        return (pyusdReserve * 1e18) / ethReserve;
    }
    // 计算买入ETH需要的PYUSD数量（使用恒定乘积公式）
    function calculateBuyAmount(uint256 _ethAmount) public view returns (uint256) {
        require(_ethAmount > 0, "Invalid ETH amount");
        require(_ethAmount < ethReserve, "Insufficient ETH reserve");
        
        // 使用恒定乘积公式: x * y = k
        // 新储备量: ethReserve - _ethAmount, pyusdReserve + pyusdNeeded
        // 保持乘积不变: (ethReserve - _ethAmount) * (pyusdReserve + pyusdNeeded) = ethReserve * pyusdReserve
        uint256 newEthReserve = ethReserve - _ethAmount;
        uint256 newPyusdReserve = (ethReserve * pyusdReserve) / newEthReserve;
        return newPyusdReserve - pyusdReserve;
    }
    
    // 计算卖出ETH能得到的PYUSD数量
    function calculateSellAmount(uint256 _ethAmount) public view returns (uint256) {
        require(_ethAmount > 0, "Invalid ETH amount");
        require(_ethAmount <= ethReserve, "Insufficient ETH reserve");
        
        // 使用恒定乘积公式
        uint256 newEthReserve = ethReserve + _ethAmount;
        uint256 newPyusdReserve = (ethReserve * pyusdReserve) / newEthReserve;
        return pyusdReserve - newPyusdReserve;
    }
    
    // 买入ETH（内部函数，由ETHSimulator调用）
    function buyETH(uint256 _ethAmount) external {
        require(_ethAmount > 0, "Invalid ETH amount");
        require(_ethAmount < ethReserve, "Insufficient ETH reserve");
        
        uint256 pyusdNeeded = calculateBuyAmount(_ethAmount);
        
        // 更新储备量
        ethReserve -= _ethAmount;
        pyusdReserve += pyusdNeeded;
        
        // 转账MockETH给用户
        mockETH.mint(msg.sender, _ethAmount);
        
        uint256 newPrice = getCurrentPrice();
        emit TradeExecuted(msg.sender, true, _ethAmount, pyusdNeeded, newPrice, block.timestamp);
    }
    
    // 卖出ETH
    function sellETH(uint256 _ethAmount) external {
        require(_ethAmount > 0, "Invalid ETH amount");
        require(mockETH.balanceOf(msg.sender) >= _ethAmount, "Insufficient ETH balance");
        
        uint256 pyusdReceived = calculateSellAmount(_ethAmount);
        require(mockPYUSD.balanceOf(address(this)) >= pyusdReceived, "Insufficient PYUSD in pool");
        
        // 销毁用户的MockETH
        mockETH.burn(msg.sender, _ethAmount);
        
        // 更新储备量
        ethReserve += _ethAmount;
        pyusdReserve -= pyusdReceived;
        
        // 转账PYUSD给用户
        mockPYUSD.safeTransfer(msg.sender, pyusdReceived);
        
        uint256 newPrice = getCurrentPrice();
        emit TradeExecuted(msg.sender, false, _ethAmount, pyusdReceived, newPrice, block.timestamp);
    }
    
    // 获取池子信息
    function getPoolInfo() external view returns (
        uint256 _ethReserve,
        uint256 _pyusdReserve,
        uint256 _currentPrice,
        uint256 _totalLiquidity
    ) {
        return (ethReserve, pyusdReserve, getCurrentPrice(), ethReserve + pyusdReserve);
    }
    
    // 获取交易历史（简化版本，实际项目中可能需要更复杂的实现）
    function getTradeHistory(uint256 _limit) external view returns (
        address[] memory traders,
        bool[] memory isBuy,
        uint256[] memory ethAmounts,
        uint256[] memory pyusdAmounts,
        uint256[] memory prices,
        uint256[] memory timestamps
    ) {
        // 这里返回空数组，实际实现需要存储交易历史
        // 为了简化，我们只返回当前状态
        traders = new address[](0);
        isBuy = new bool[](0);
        ethAmounts = new uint256[](0);
        pyusdAmounts = new uint256[](0);
        prices = new uint256[](0);
        timestamps = new uint256[](0);
    }
}
