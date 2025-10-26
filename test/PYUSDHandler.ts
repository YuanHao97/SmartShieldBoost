import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";

describe("PYUSDHandler", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  
  let mockPYUSD: any;
  let pyusdHandler: any;
  let owner: string;
  let user1: string;
  let user2: string;

  it("Should deploy MockPYUSD and PYUSDHandler successfully", async function () {
    // 获取测试账户
    const accounts = await viem.getWalletClients();
    owner = accounts[0].account.address;
    user1 = accounts[1].account.address;
    user2 = accounts[2].account.address;

    // 部署 MockPYUSD
    mockPYUSD = await viem.deployContract("MockPYUSD");
    console.log("MockPYUSD deployed at:", mockPYUSD.address);

    // 部署 PYUSDHandler
    pyusdHandler = await viem.deployContract("PyusdHandler", [mockPYUSD.address]);
    console.log("PYUSDHandler deployed at:", pyusdHandler.address);

    // 验证部署
    assert.ok(mockPYUSD.address);
    assert.ok(pyusdHandler.address);
    
    // 验证 PYUSDHandler 的 pyusd 地址
    const pyusdAddress = await pyusdHandler.read.pyusd();
    assert.equal(pyusdAddress.toLowerCase(), mockPYUSD.address.toLowerCase());
  });

  it("Should mint PYUSD tokens to users", async function () {
    const mintAmount = 1000n * 10n**6n; // 1000 tokens with 6 decimals

    // 给用户1铸造代币
    await mockPYUSD.write.mint([user1, mintAmount], {
      account: owner
    });
    const user1Balance = await mockPYUSD.read.balanceOf([user1]);
    assert.equal(user1Balance, mintAmount);

    // 给用户2铸造代币
    await mockPYUSD.write.mint([user2, mintAmount], {
      account: owner
    });
    const user2Balance = await mockPYUSD.read.balanceOf([user2]);
    assert.equal(user2Balance, mintAmount);

    console.log("User1 balance:", user1Balance.toString());
    console.log("User2 balance:", user2Balance.toString());
  });

  it("Should allow users to deposit PYUSD after approval", async function () {
    const depositAmount = 100n * 10n**6n; // 100 tokens

    // 用户1授权 PYUSDHandler 使用代币
    await mockPYUSD.write.approve([pyusdHandler.address, depositAmount], {
      account: user1
    });

    // 验证授权
    const allowance = await mockPYUSD.read.allowance([user1, pyusdHandler.address]);
    assert.equal(allowance, depositAmount);

    // 用户1存入代币
    await pyusdHandler.write.depositPyusd([depositAmount], {
      account: user1
    });

    // 验证合约余额
    const contractBalance = await pyusdHandler.read.getPyusdBalance();
    assert.equal(contractBalance, depositAmount);

    // 验证用户1余额减少
    const user1Balance = await mockPYUSD.read.balanceOf([user1]);
    const expectedBalance = 1000n * 10n**6n - depositAmount;
    assert.equal(user1Balance, expectedBalance);

    console.log("Contract balance after deposit:", contractBalance.toString());
  });

  it("Should emit PyusdReceived event when depositing", async function () {
    const depositAmount = 50n * 10n**6n; // 50 tokens

    // 用户2授权
    await mockPYUSD.write.approve([pyusdHandler.address, depositAmount], {
      account: user2
    });

    // 监听事件
    const deploymentBlockNumber = await publicClient.getBlockNumber();

    // 用户2存入代币
    await pyusdHandler.write.depositPyusd([depositAmount], {
      account: user2
    });

    // 获取事件
    const events = await publicClient.getContractEvents({
      address: pyusdHandler.address,
      abi: pyusdHandler.abi,
      eventName: "PyusdReceived",
      fromBlock: deploymentBlockNumber,
      strict: true,
    });

    // 应该至少有1个事件（用户2的存款）
    assert.ok(events.length >= 1);

    // 验证最新事件
    const latestEvent = events[events.length - 1];
    assert.equal(latestEvent.args.from.toLowerCase(), user2.toLowerCase());
    assert.equal(latestEvent.args.amount, depositAmount);

    console.log("Events found:", events.length);
  });

  it("Should allow owner to send PYUSD to users", async function () {
    const sendAmount = 30n * 10n**6n; // 30 tokens

    // 记录发送前的余额
    const user1BalanceBefore = await mockPYUSD.read.balanceOf([user1]);
    const contractBalanceBefore = await pyusdHandler.read.getPyusdBalance();

    // 所有者发送代币给用户1
    await pyusdHandler.write.sendPyusd([user1, sendAmount], {
      account: owner
    });

    // 验证用户1余额增加
    const user1BalanceAfter = await mockPYUSD.read.balanceOf([user1]);
    assert.equal(user1BalanceAfter, user1BalanceBefore + sendAmount);

    // 验证合约余额减少
    const contractBalanceAfter = await pyusdHandler.read.getPyusdBalance();
    assert.equal(contractBalanceAfter, contractBalanceBefore - sendAmount);

    console.log("User1 balance after receiving:", user1BalanceAfter.toString());
  });

  it("Should allow owner to batch send PYUSD", async function () {
    const recipients = [user1, user2];
    const amounts = [20n * 10n**6n, 10n * 10n**6n]; // 20 and 10 tokens

    // 记录发送前的余额
    const user1BalanceBefore = await mockPYUSD.read.balanceOf([user1]);
    const user2BalanceBefore = await mockPYUSD.read.balanceOf([user2]);
    const contractBalanceBefore = await pyusdHandler.read.getPyusdBalance();

    // 批量发送
    await pyusdHandler.write.batchSendPyusd([recipients, amounts], {
      account: owner
    });

    // 验证用户余额增加
    const user1BalanceAfter = await mockPYUSD.read.balanceOf([user1]);
    const user2BalanceAfter = await mockPYUSD.read.balanceOf([user2]);
    
    assert.equal(user1BalanceAfter, user1BalanceBefore + amounts[0]);
    assert.equal(user2BalanceAfter, user2BalanceBefore + amounts[1]);

    // 验证合约余额减少
    const contractBalanceAfter = await pyusdHandler.read.getPyusdBalance();
    const totalSent = amounts[0] + amounts[1];
    assert.equal(contractBalanceAfter, contractBalanceBefore - totalSent);

    console.log("Batch send completed");
  });

  it("Should allow owner to withdraw all PYUSD", async function () {
    const contractBalanceBefore = await pyusdHandler.read.getPyusdBalance();
    const ownerBalanceBefore = await mockPYUSD.read.balanceOf([owner]);

    // 所有者提取所有代币
    await pyusdHandler.write.withdrawAllPyusd({
      account: owner
    });

    // 验证合约余额为0
    const contractBalanceAfter = await pyusdHandler.read.getPyusdBalance();
    assert.equal(contractBalanceAfter, 0n);

    // 验证所有者余额增加
    const ownerBalanceAfter = await mockPYUSD.read.balanceOf([owner]);
    assert.equal(ownerBalanceAfter, ownerBalanceBefore + contractBalanceBefore);

    console.log("Withdrawal completed, owner balance:", ownerBalanceAfter.toString());
  });

  it("Should reject non-owner operations", async function () {
    const sendAmount = 10n * 10n**6n;

    // 用户1尝试发送代币（应该失败）
    try {
      await pyusdHandler.write.sendPyusd([user2, sendAmount], {
        account: user1
      });
      assert.fail("Should have reverted");
    } catch (error) {
      console.log("Correctly rejected non-owner send operation");
    }

    // 用户1尝试批量发送（应该失败）
    try {
      await pyusdHandler.write.batchSendPyusd([[user2], [sendAmount]], {
        account: user1
      });
      assert.fail("Should have reverted");
    } catch (error) {
      console.log("Correctly rejected non-owner batch send operation");
    }

    // 用户1尝试提取（应该失败）
    try {
      await pyusdHandler.write.withdrawAllPyusd({
        account: user1
      });
      assert.fail("Should have reverted");
    } catch (error) {
      console.log("Correctly rejected non-owner withdrawal operation");
    }
  });

  it("Should reject deposit without approval", async function () {
    const depositAmount = 10n * 10n**6n;

    // 用户1尝试存入代币但没有授权（应该失败）
    try {
      await pyusdHandler.write.depositPyusd([depositAmount], {
        account: user1
      });
      assert.fail("Should have reverted");
    } catch (error) {
      console.log("Correctly rejected deposit without approval");
    }
  });

  it("Should reject deposit with insufficient balance", async function () {
    const largeAmount = 10000n * 10n**6n; // 10000 tokens (more than user has)

    // 用户1授权大额代币
    await mockPYUSD.write.approve([pyusdHandler.address, largeAmount], {
      account: user1
    });

    // 用户1尝试存入超过余额的代币（应该失败）
    try {
      await pyusdHandler.write.depositPyusd([largeAmount], {
        account: user1
      });
      assert.fail("Should have reverted");
    } catch (error) {
      console.log("Correctly rejected deposit with insufficient balance");
    }
  });

  it("Should handle zero amount deposits", async function () {
    // 用户1尝试存入0代币（应该失败）
    try {
      await pyusdHandler.write.depositPyusd([0n], {
        account: user1
      });
      assert.fail("Should have reverted");
    } catch (error) {
      console.log("Correctly rejected zero amount deposit");
    }
  });
});