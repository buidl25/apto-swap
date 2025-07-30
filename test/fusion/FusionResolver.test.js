const { expect } = require("chai");
const { ethers } = require("hardhat");
const { setBalance } = require("@nomicfoundation/hardhat-network-helpers");

describe("FusionResolver", function () {
  let fusionResolver;
  let mockERC20;
  let owner;
  let taker;
  let maker;
  let preimage;
  let hashlock;
  let htlcId;

  beforeEach(async function () {
    // Deploy mock ERC20 token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockERC20 = await MockERC20.deploy("Mock Token", "MTK", ethers.parseEther("1000000"));
    await mockERC20.waitForDeployment();

    // Deploy FusionResolver
    const FusionResolver = await ethers.getContractFactory("contracts/FusionResolver.sol:FusionResolver");
    fusionResolver = await FusionResolver.deploy("0x1111111254EEB25477B68fb85Ed929f73A960582"); // Using default 1inch LOP address
    await fusionResolver.waitForDeployment();

    // Get signers
    [owner, taker, maker] = await ethers.getSigners();
    await setBalance(owner.address, ethers.parseEther("1000"));
    await setBalance(taker.address, ethers.parseEther("1000"));
    await setBalance(maker.address, ethers.parseEther("1000"));


    // Generate preimage and hashlock
    preimage = ethers.randomBytes(32);
    hashlock = ethers.sha256(preimage);

    // Transfer tokens to the resolver for testing
    await mockERC20.transfer(maker.address, ethers.parseEther("1000"));
    await mockERC20.connect(maker).approve(await fusionResolver.getAddress(), ethers.parseEther("1000"));
  });

  describe("HTLC functionality", function () {
    it("Should create an HTLC", async function () {
        const tx = await fusionResolver.connect(maker).createHTLC(
            taker.address,
            await mockERC20.getAddress(),
            ethers.parseEther("100"),
            hashlock,
            Math.floor((await ethers.provider.getBlock('latest')).timestamp) + 3600
        );
        const receipt = await tx.wait();
        const events = await fusionResolver.queryFilter("HTLCCreated", receipt.blockNumber);
        htlcId = events[0].args.id;

      const htlc = await fusionResolver.htlcLocks(htlcId);
      expect(htlc.sender).to.equal(maker.address);
      expect(htlc.recipient).to.equal(taker.address);
      expect(htlc.tokenAddress).to.equal(await mockERC20.getAddress());
      expect(htlc.amount).to.equal(ethers.parseEther("100"));
      expect(htlc.hashlock).to.equal(hashlock);
    });

    it("Should allow withdrawal with correct preimage", async function () {
        const tx = await fusionResolver.connect(maker).createHTLC(
            taker.address,
            await mockERC20.getAddress(),
            ethers.parseEther("100"),
            hashlock,
            Math.floor((await ethers.provider.getBlock('latest')).timestamp) + 3600
        );
        const receipt = await tx.wait();
        const events = await fusionResolver.queryFilter("HTLCCreated", receipt.blockNumber);
        htlcId = events[0].args.id;

      const initialBalance = await mockERC20.balanceOf(taker.address);
      await fusionResolver.connect(taker).withdraw(htlcId, preimage);
      const finalBalance = await mockERC20.balanceOf(taker.address);
      expect(finalBalance - initialBalance).to.equal(ethers.parseEther("100"));
    });

    it("Should not allow withdrawal with incorrect preimage", async function () {
        const tx = await fusionResolver.connect(maker).createHTLC(
            taker.address,
            await mockERC20.getAddress(),
            ethers.parseEther("100"),
            hashlock,
            Math.floor((await ethers.provider.getBlock('latest')).timestamp) + 3600
        );
        const receipt = await tx.wait();
        const events = await fusionResolver.queryFilter("HTLCCreated", receipt.blockNumber);
        htlcId = events[0].args.id;

        const wrongPreimage = ethers.randomBytes(32);
        await expect(fusionResolver.connect(taker).withdraw(htlcId, wrongPreimage)).to.be.revertedWith("Invalid preimage");
    });

    it("Should allow refund after timelock", async function () {
        const tx = await fusionResolver.connect(maker).createHTLC(
            taker.address,
            await mockERC20.getAddress(),
            ethers.parseEther("100"),
            hashlock,
            Math.floor((await ethers.provider.getBlock('latest')).timestamp) + 3600
        );
        const receipt = await tx.wait();
        const events = await fusionResolver.queryFilter("HTLCCreated", receipt.blockNumber);
        htlcId = events[0].args.id;

        await network.provider.send("evm_increaseTime", [3601]);
        await network.provider.send("evm_mine");

        const initialBalance = await mockERC20.balanceOf(maker.address);
        await fusionResolver.connect(maker).refund(htlcId);
        const finalBalance = await mockERC20.balanceOf(maker.address);
        expect(finalBalance - initialBalance).to.equal(ethers.parseEther("100"));
    });

    it("Should not allow refund before timelock", async function () {
        const latestBlock = await ethers.provider.getBlock('latest');
        const timelock = latestBlock.timestamp + 3601;

        const tx = await fusionResolver.connect(maker).createHTLC(
            taker.address,
            await mockERC20.getAddress(),
            ethers.parseEther("100"),
            hashlock,
            timelock
        );
        const receipt = await tx.wait();
        const events = await fusionResolver.queryFilter("HTLCCreated", receipt.blockNumber);
        htlcId = events[0].args.id;

        await expect(fusionResolver.connect(maker).refund(htlcId)).to.be.revertedWith("HTLC not yet expired");
    });
  });

  describe("Owner functions", function () {
    it("Should allow owner to rescue tokens", async function () {
        const amount = ethers.parseEther("500");
        await mockERC20.transfer(await fusionResolver.getAddress(), amount);
        const initialBalance = await mockERC20.balanceOf(owner.address);
        await fusionResolver.rescueTokens(await mockERC20.getAddress(), owner.address, amount);
        const finalBalance = await mockERC20.balanceOf(owner.address);
        expect(finalBalance - initialBalance).to.equal(amount);
    });

    it("Should allow owner to approve tokens", async function () {
        await fusionResolver.approveToken(await mockERC20.getAddress());
        const allowance = await mockERC20.allowance(await fusionResolver.getAddress(), "0x1111111254EEB25477B68fb85Ed929f73A960582");
        expect(allowance).to.equal(ethers.MaxUint256);
    });
  });
});

