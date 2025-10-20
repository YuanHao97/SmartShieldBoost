// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Counter} from "./Counter.sol";
import "hardhat/console.sol";

contract CounterTest {
  Counter counter;

  constructor() {
    counter = new Counter();
  }

  function getInitialValue() public view returns (uint256) {
    return counter.x();
  }

  function testInc(uint8 x) public {
    for (uint8 i = 0; i < x; i++) {
      counter.inc();
    }
  }

  function getValue() public view returns (uint256) {
    return counter.x();
  }

  function testIncBy(uint256 amount) public {
    counter.incBy(amount);
  }
}
