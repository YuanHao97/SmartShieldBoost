pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import {PyusdHandler} from "./PYUSDHandler.sol";

contract ShieldBoost is Ownable {
  uint256 public poolBalance = 0;
  PyusdHandler public pyusdHandler;
  constructor(address _owner) Ownable(_owner) {
    pyusdHandler = new PyusdHandler(address(this));
  }
  // admin can withdraw and send money to the pool
  function setUpFundingPool(uint amount) external onlyOwner {
    require(poolBalance == 0, "Pool already set up");
    poolBalance += amount;
    pyusdHandler.depositPyusd(amount);
  }

  function withdraw(uint amount) external onlyOwner {
    require(poolBalance >= amount, "Insufficient balance");
    poolBalance -= amount;
    pyusdHandler.sendPyusd(msg.sender, amount);
  }

  function sendToPool(uint amount) external onlyOwner {
    poolBalance += amount;
  }
}