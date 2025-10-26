// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockETH is ERC20, Ownable {
    // 允许铸造的地址
    mapping(address => bool) public minters;
    
    constructor() ERC20("MockETH", "mockETH") Ownable(msg.sender) {
        minters[msg.sender] = true;
    }
    
    // 添加铸造者
    function addMinter(address minter) external onlyOwner {
        minters[minter] = true;
    }
    
    // 移除铸造者
    function removeMinter(address minter) external onlyOwner {
        minters[minter] = false;
    }
    
    // 铸造ETH给指定地址
    function mint(address to, uint256 amount) external {
        require(minters[msg.sender], "Not authorized to mint");
        _mint(to, amount);
    }

    // 销毁指定地址的ETH
    function burn(address from, uint256 amount) external {
        require(minters[msg.sender], "Not authorized to burn");
        _burn(from, amount);
    }

    // 批量铸造ETH
    function batchMint(address[] calldata recipients, uint256[] calldata amounts) external onlyOwner {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amounts[i]);
        }
    }

    // 获取用户ETH余额
    function getETHBalance(address user) external view returns (uint256) {
        return balanceOf(user);
    }
}
