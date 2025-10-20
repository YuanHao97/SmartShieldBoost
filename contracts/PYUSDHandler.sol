// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// 导入 OpenZeppelin 的 IERC20 接口
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PyusdHandler is Ownable {
    using SafeERC20 for IERC20;
    
    // PYUSD 代币合约地址（以太坊主网）
    IERC20 public immutable pyusd;
    
    // 事件
    event PyusdReceived(address indexed from, uint256 amount);
    event PyusdSent(address indexed to, uint256 amount);
    event PyusdWithdrawn(address indexed to, uint256 amount);
    
    constructor(address _pyusdAddress) Ownable(msg.sender) {
        require(_pyusdAddress != address(0), "Invalid PYUSD address");
        pyusd = IERC20(_pyusdAddress);
    }
    
    // 接收 PYUSD（用户需要先 approve）
    function depositPyusd(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        
        // 从用户转账到合约
        pyusd.safeTransferFrom(msg.sender, address(this), amount);
        
        emit PyusdReceived(msg.sender, amount);
    }
    
    // 发送 PYUSD 给指定地址
    function sendPyusd(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid address");
        require(amount > 0, "Amount must be greater than 0");
        require(pyusd.balanceOf(address(this)) >= amount, "Insufficient balance");
        
        // 从合约转账给目标地址
        pyusd.safeTransfer(to, amount);
        
        emit PyusdSent(to, amount);
    }
    
    // 批量发送 PYUSD
    function batchSendPyusd(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyOwner {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        
        require(pyusd.balanceOf(address(this)) >= totalAmount, "Insufficient balance");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            pyusd.safeTransfer(recipients[i], amounts[i]);
            emit PyusdSent(recipients[i], amounts[i]);
        }
    }
    
    // 提取所有 PYUSD（管理员功能）
    function withdrawAllPyusd() external onlyOwner {
        uint256 balance = pyusd.balanceOf(address(this));
        require(balance > 0, "No PYUSD to withdraw");
        
        pyusd.safeTransfer(owner(), balance);
        
        emit PyusdWithdrawn(owner(), balance);
    }
    
    // 查询合约的 PYUSD 余额
    function getPyusdBalance() external view returns (uint256) {
        return pyusd.balanceOf(address(this));
    }
    
    // 查询指定地址的 PYUSD 余额
    function getUserPyusdBalance(address user) external view returns (uint256) {
        return pyusd.balanceOf(user);
    }
}