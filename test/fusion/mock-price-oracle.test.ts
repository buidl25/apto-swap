/**
 * Unit tests for the Mock Price Oracle
 */
import { expect } from 'chai';
import { ethers } from 'ethers';
import sinon from 'sinon';
import { MockPriceOracle } from '../../scripts/fusion/mock-price-oracle';

describe('MockPriceOracle', () => {
  // Sandbox for sinon stubs
  let sandbox: sinon.SinonSandbox;
  let mockClock: sinon.SinonFakeTimers;
  
  // Test constants
  const initialPrice = ethers.parseEther('1.05').toString();
  const finalPrice = ethers.parseEther('0.98').toString();
  const duration = 180; // 3 minutes
  const startTime = Math.floor(Date.now() / 1000);
  
  beforeEach(() => {
    // Create a sandbox for stubs
    sandbox = sinon.createSandbox();
    
    // Use fake timers to control time
    mockClock = sinon.useFakeTimers(startTime * 1000);
  });
  
  afterEach(() => {
    // Restore all stubs and mocks
    sandbox.restore();
    mockClock.restore();
  });
  
  describe('constructor', () => {
    it('should initialize with default values when no config is provided', () => {
      const oracle = new MockPriceOracle();
      expect(oracle).to.be.an('object');
      expect(oracle.getCurrentPrice()).to.be.a('string');
    });
    
    it('should initialize with provided config values', () => {
      const oracle = new MockPriceOracle({
        initialPrice,
        finalPrice,
        duration,
        startTime
      });
      
      expect(oracle).to.be.an('object');
      expect(oracle.getCurrentPrice()).to.equal(initialPrice);
    });
  });
  
  describe('getCurrentPrice', () => {
    it('should return initialPrice before auction starts', () => {
      // Set start time to future
      const futureStartTime = startTime + 60; // 1 minute in the future
      const oracle = new MockPriceOracle({
        initialPrice,
        finalPrice,
        duration,
        startTime: futureStartTime
      });
      
      expect(oracle.getCurrentPrice()).to.equal(initialPrice);
    });
    
    it('should return finalPrice after auction ends', () => {
      const oracle = new MockPriceOracle({
        initialPrice,
        finalPrice,
        duration,
        startTime
      });
      
      // Move time to after auction end
      mockClock.tick((duration + 10) * 1000);
      
      expect(oracle.getCurrentPrice()).to.equal(finalPrice);
    });
    
    it('should return intermediate price during auction (linear model)', () => {
      const oracle = new MockPriceOracle({
        initialPrice,
        finalPrice,
        duration,
        startTime,
        decayModel: 'linear'
      });
      
      // Move time to middle of auction
      mockClock.tick(duration * 500); // 50% of duration
      
      const currentPrice = oracle.getCurrentPrice();
      const initialPriceBN = ethers.getBigInt(initialPrice);
      const finalPriceBN = ethers.getBigInt(finalPrice);
      const priceDiff = initialPriceBN - finalPriceBN;
      const expectedPrice = initialPriceBN - (priceDiff / 2n);
      
      // Allow for small rounding differences
      const currentPriceBN = ethers.getBigInt(currentPrice);
      const difference = currentPriceBN > expectedPrice ? currentPriceBN - expectedPrice : expectedPrice - currentPriceBN;
      const tolerance = ethers.getBigInt(ethers.parseEther('0.0001').toString());
      
      expect(difference <= tolerance).to.be.true;
    });
    
    it('should return intermediate price during auction (exponential model)', () => {
      const oracle = new MockPriceOracle({
        initialPrice,
        finalPrice,
        duration,
        startTime,
        decayModel: 'exponential'
      });
      
      // Move time to middle of auction
      mockClock.tick(duration * 500); // 50% of duration
      
      const currentPrice = oracle.getCurrentPrice();
      expect(currentPrice).to.be.a('string');
      
      // Verify the price is between initial and final
      const currentPriceBN = ethers.getBigInt(currentPrice);
      const initialPriceBN = ethers.getBigInt(initialPrice);
      const finalPriceBN = ethers.getBigInt(finalPrice);
      
      expect(currentPriceBN <= initialPriceBN).to.be.true;
      expect(currentPriceBN >= finalPriceBN).to.be.true;
    });
    
    it('should return intermediate price during auction (stepwise model)', () => {
      const steps = 10;
      const oracle = new MockPriceOracle({
        initialPrice,
        finalPrice,
        duration,
        startTime,
        decayModel: 'stepwise',
        steps
      });
      
      // Move time to just after first step
      mockClock.tick(duration * 1000 / steps + 100);
      
      const currentPrice = oracle.getCurrentPrice();
      const initialPriceBN = ethers.getBigInt(initialPrice);
      const finalPriceBN = ethers.getBigInt(finalPrice);
      const stepSize = (initialPriceBN - finalPriceBN) / BigInt(steps);
      const expectedPrice = initialPriceBN - stepSize;
      
      // Allow for small rounding differences
      const currentPriceBN = ethers.getBigInt(currentPrice);
      const difference = currentPriceBN > expectedPrice ? currentPriceBN - expectedPrice : expectedPrice - currentPriceBN;
      const tolerance = ethers.getBigInt(ethers.parseEther('0.0001').toString());
      
      expect(difference <= tolerance).to.be.true;
    });
  });
  
  describe('generatePricePoints', () => {
    it('should generate the specified number of price points', () => {
      const oracle = new MockPriceOracle({
        initialPrice,
        finalPrice,
        duration,
        startTime
      });
      
      const numPoints = 5;
      const points = oracle.generatePricePoints(numPoints);
      
      expect(points).to.be.an('array');
      expect(points.length).to.equal(numPoints + 1); // +1 because it includes start and end points
      
      // First point should be at start time with initial price
      expect(points[0].timestamp).to.equal(startTime);
      expect(points[0].price).to.equal(initialPrice);
      
      // Last point should be at end time with final price
      expect(points[numPoints].timestamp).to.equal(startTime + duration);
      expect(points[numPoints].price).to.equal(finalPrice);
    });
  });
  
  describe('generateAuctionPoints', () => {
    it('should generate auction points in the correct format', () => {
      const oracle = new MockPriceOracle({
        initialPrice,
        finalPrice,
        duration,
        startTime
      });
      
      const numPoints = 5;
      const points = oracle.generateAuctionPoints(numPoints);
      
      expect(points).to.be.an('array');
      expect(points.length).to.equal(numPoints + 1); // +1 because it includes start and end points
      
      // Each point should be a string in the format "timestamp,price"
      points.forEach(point => {
        expect(point).to.be.a('string');
        const parts = point.split(',');
        expect(parts.length).to.equal(2);
        
        const timestamp = parseInt(parts[0]);
        const price = parts[1];
        
        expect(timestamp).to.be.a('number');
        expect(price).to.be.a('string');
      });
      
      // First point should be at start time with initial price
      expect(points[0]).to.equal(`${startTime},${initialPrice}`);
      
      // Last point should be at end time with final price
      expect(points[numPoints]).to.equal(`${startTime + duration},${finalPrice}`);
    });
  });
});
