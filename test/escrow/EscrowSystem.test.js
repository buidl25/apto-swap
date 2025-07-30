const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Escrow System", function () {
  let escrowFactory;
  let fusionResolver;
  let testToken;
  let owner;
  let maker;
  let taker;
  let rescueDelay;
  let secretString = "secret123";
  let secret;
  let secretHash;

  // Helper function to create timelocks
  function createTimelocks() {
    const now = Math.floor(Date.now() / 1000);
    // For FusionResolver.createEscrowOrder, we return just the array
    return [
      now + 60,                // SrcFinality
      now + 120,               // SrcWithdrawal
      now + 180,               // SrcPublicWithdrawal
      now + 240,               // SrcCancellation
      now + 300,               // SrcPublicCancellation
      now + 360,               // DstFinality
      now + 420,               // DstCancellation
      now + 480                // DstPublicCancellation
    ];
  }
  
  // Helper function to create Timelocks struct for Solidity
  function createTimelocksStruct() {
    return { values: createTimelocks() };
  }
  
  // Helper function to create Address struct for Solidity
  function createAddress(address) {
    return { value: address };
  }

  beforeEach(async function () {
    // Get signers
    [owner, maker, taker] = await ethers.getSigners();

    // Deploy test token
    const TestToken = await ethers.getContractFactory("TestEvmToken");
    testToken = await TestToken.deploy();
    await testToken.waitForDeployment();

    // Set rescue delay to 1 hour for testing
    rescueDelay = 3600;

    // Deploy EscrowFactory
    const EscrowFactory = await ethers.getContractFactory("contracts/escrow/EscrowFactory.sol:EscrowFactory");
    escrowFactory = await EscrowFactory.deploy(rescueDelay);
    await escrowFactory.waitForDeployment();

    // Deploy FusionResolver
    const FusionResolver = await ethers.getContractFactory("contracts/escrow/FusionResolver.sol:FusionResolver");
    fusionResolver = await FusionResolver.deploy(
      await owner.getAddress(), // Mock LOP address (using owner for simplicity)
      await escrowFactory.getAddress()
    );
    await fusionResolver.waitForDeployment();

    // Mint tokens to maker
    await testToken.mint(await maker.getAddress(), ethers.parseEther("1000"));

    // Approve tokens for FusionResolver
    await testToken.connect(maker).approve(
      await fusionResolver.getAddress(),
      ethers.parseEther("1000")
    );

    // Generate secret and hash
    secret = ethers.encodeBytes32String(secretString);
    // In Solidity, keccak256(abi.encodePacked(secret)) is used to validate the secret
    // where secret is already a bytes32, so we need to hash the bytes32 value directly
    secretHash = ethers.keccak256(secret);
  });

  describe("EscrowFactory", function () {
    it("Should deploy with correct parameters", async function () {
      expect(await escrowFactory.implementation()).to.not.equal(ethers.ZeroAddress);
      expect(await escrowFactory.owner()).to.equal(await owner.getAddress());
    });
  });

  describe("FusionResolver", function () {
    it("Should create an escrow order", async function () {
      const orderHash = ethers.keccak256(ethers.toUtf8Bytes("testOrder"));
      const amount = ethers.parseEther("100");
      const safetyDeposit = ethers.parseEther("0.1");
      const timelocks = createTimelocks();

      // Create escrow order
      const tx = await fusionResolver.connect(maker).createEscrowOrder(
        await taker.getAddress(),
        await testToken.getAddress(),
        amount,
        secretHash,
        timelocks,
        orderHash,
        { value: safetyDeposit }
      );

      // Wait for transaction to be mined
      const receipt = await tx.wait();

      // Check for EscrowOrderCreated event
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === 'EscrowOrderCreated'
      );
      
      expect(event).to.not.be.undefined;
      
      // Get escrow address from event
      const escrowAddress = event.args[1];
      
      // Check that escrow address is registered in factory
      expect(await escrowFactory.getEscrowAddress(orderHash)).to.equal(escrowAddress);
    });
  });

  describe("EscrowSrc", function () {
    let escrowAddress;
    let escrowSrc;
    let immutables;
    let orderHash;

    beforeEach(async function () {
      orderHash = ethers.keccak256(ethers.toUtf8Bytes("testOrder"));
      const amount = ethers.parseEther("100");
      const safetyDeposit = ethers.parseEther("0.1");
      const timelocks = createTimelocks();

      // Create immutables object - use plain addresses for Address types
      immutables = {
        orderHash: orderHash,
        maker: await maker.getAddress(),
        taker: await taker.getAddress(),
        token: await testToken.getAddress(),
        amount: amount,
        secretHash: secretHash,
        safetyDeposit: safetyDeposit,
        timelocks: createTimelocksStruct()
      };

      // Create escrow order
      const tx = await fusionResolver.connect(maker).createEscrowOrder(
        await taker.getAddress(),
        await testToken.getAddress(),
        amount,
        secretHash,
        timelocks,
        orderHash,
        { value: safetyDeposit }
      );

      // Wait for transaction to be mined
      const receipt = await tx.wait();

      // Get escrow address from event
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === 'EscrowOrderCreated'
      );
      escrowAddress = event.args[1];

      // Get EscrowSrc contract instance
      const EscrowSrc = await ethers.getContractFactory("contracts/escrow/EscrowSrc.sol:EscrowSrc");
      escrowSrc = EscrowSrc.attach(escrowAddress);
    });

    it("Should allow taker to withdraw with correct secret", async function () {
      // Fast forward time to after SrcWithdrawal timelock
      await ethers.provider.send("evm_increaseTime", [130]);
      await ethers.provider.send("evm_mine");

      // Check taker balance before withdrawal
      const takerBalanceBefore = await testToken.balanceOf(await taker.getAddress());

      // Withdraw funds
      await escrowSrc.connect(taker).withdraw(secret, immutables);

      // Check taker balance after withdrawal
      const takerBalanceAfter = await testToken.balanceOf(await taker.getAddress());
      expect(takerBalanceAfter - takerBalanceBefore).to.equal(immutables.amount);
    });

    it("Should allow public withdrawal after public withdrawal timelock", async function () {
      // Get current timelocks from the immutables
      const publicWithdrawalTime = immutables.timelocks.values[2]; // SrcPublicWithdrawal
      const cancellationTime = immutables.timelocks.values[3]; // SrcCancellation
      
      // Debug: Log timelock values
      console.log('SrcPublicWithdrawal timelock:', publicWithdrawalTime.toString());
      console.log('SrcCancellation timelock:', cancellationTime.toString());
      
      // Get current block timestamp
      const blockNumBefore = await ethers.provider.getBlockNumber();
      const blockBefore = await ethers.provider.getBlock(blockNumBefore);
      const currentBlockTime = blockBefore.timestamp;
      console.log('Current block timestamp:', currentBlockTime);
      
      // Calculate the time to advance (midpoint between public withdrawal and cancellation)
      const targetTime = Math.floor((Number(publicWithdrawalTime) + Number(cancellationTime)) / 2);
      const timeToAdvance = targetTime - currentBlockTime;
      console.log('Time to advance:', timeToAdvance);
      
      // Fast forward time to be strictly between SrcPublicWithdrawal and SrcCancellation
      await ethers.provider.send("evm_increaseTime", [timeToAdvance]);
      await ethers.provider.send("evm_mine");
      
      // Verify new block time
      const blockNumAfter = await ethers.provider.getBlockNumber();
      const blockAfter = await ethers.provider.getBlock(blockNumAfter);
      console.log('New block timestamp:', blockAfter.timestamp);
      console.log('Is after publicWithdrawalTime?', blockAfter.timestamp > publicWithdrawalTime);
      console.log('Is before cancellationTime?', blockAfter.timestamp < cancellationTime);

      // Check taker balance before withdrawal
      const takerBalanceBefore = await testToken.balanceOf(await taker.getAddress());

      // Public withdraw funds (can be called by anyone)
      await escrowSrc.connect(owner).publicWithdraw(secret, immutables);

      // Check taker balance after withdrawal
      const takerBalanceAfter = await testToken.balanceOf(await taker.getAddress());
      expect(takerBalanceAfter - takerBalanceBefore).to.equal(immutables.amount);
    });

    it("Should allow taker to cancel after cancellation timelock", async function () {
      // Fast forward time to after SrcCancellation timelock
      await ethers.provider.send("evm_increaseTime", [250]);
      await ethers.provider.send("evm_mine");

      // Check maker balance before cancellation
      const makerBalanceBefore = await testToken.balanceOf(await maker.getAddress());

      // Cancel escrow
      await escrowSrc.connect(taker).cancel(immutables);

      // Check maker balance after cancellation
      const makerBalanceAfter = await testToken.balanceOf(await maker.getAddress());
      expect(makerBalanceAfter - makerBalanceBefore).to.equal(immutables.amount);
    });

    it("Should allow public cancellation after public cancellation timelock", async function () {
      // Debug: Check token balances before proceeding
      console.log("Maker address:", await maker.getAddress());
      console.log("Escrow address:", escrowAddress);
      console.log("Maker token balance:", await testToken.balanceOf(await maker.getAddress()));
      console.log("Escrow token balance:", await testToken.balanceOf(escrowAddress));
      console.log("Escrow ETH balance:", await ethers.provider.getBalance(escrowAddress));

      // Fast forward time to after SrcPublicCancellation timelock
      await ethers.provider.send("evm_increaseTime", [310]);
      await ethers.provider.send("evm_mine");

      // Check maker balance before cancellation
      const makerBalanceBefore = await testToken.balanceOf(await maker.getAddress());

      // Public cancel escrow (can be called by anyone)
      await escrowSrc.connect(owner).publicCancel(immutables);

      // Check maker balance after cancellation
      const makerBalanceAfter = await testToken.balanceOf(await maker.getAddress());
      expect(makerBalanceAfter - makerBalanceBefore).to.equal(immutables.amount);
    });
  });
});
