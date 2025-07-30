/**
 * Mock Price Oracle for 1inch Fusion
 * 
 * This module provides a mock price oracle implementation for testing the
 * 1inch Fusion Dutch auction mechanism without relying on external price feeds.
 */

const { ethers } = require('ethers');

/**
 * Default configuration for the mock price oracle
 */
const defaultConfig = {
  initialPrice: ethers.parseEther('1.05').toString(), // 5% premium
  finalPrice: ethers.parseEther('0.98').toString(),   // 2% discount
  duration: 180, // 3 minutes
  decayModel: 'linear',
  steps: 10
};

/**
 * Creates a mock price oracle for 1inch Fusion Dutch auctions
 */
class MockPriceOracle {
  /**
   * Constructor
   * @param {Object} config - Configuration for the mock price oracle
   */
  constructor(config = {}) {
    this.config = {
      ...defaultConfig,
      ...config
    };
    
    this.startTime = this.config.startTime || Math.floor(Date.now() / 1000);
  }

  /**
   * Gets the current price based on the elapsed time
   * @returns {string} The current price as a string
   */
  getCurrentPrice() {
    const now = Math.floor(Date.now() / 1000);
    const elapsedTime = now - this.startTime;
    
    // If auction hasn't started yet
    if (elapsedTime < 0) {
      return this.config.initialPrice;
    }
    
    // If auction has ended
    if (elapsedTime >= this.config.duration) {
      return this.config.finalPrice;
    }
    
    // Calculate price based on decay model
    const initialPriceBN = BigInt(this.config.initialPrice);
    const finalPriceBN = BigInt(this.config.finalPrice);
    const progress = elapsedTime / this.config.duration;
    
    switch (this.config.decayModel) {
      case 'exponential':
        // Exponential decay: price = initialPrice * e^(-k * progress)
        // where k is calculated to reach finalPrice at the end
        const initialNumber = Number(ethers.formatEther(initialPriceBN));
        const finalNumber = Number(ethers.formatEther(finalPriceBN));
        const k = Math.log(initialNumber / finalNumber);
        const factor = Math.exp(-k * progress);
        const result = initialPriceBN * BigInt(Math.floor(factor * 1000000)) / BigInt(1000000);
        return result.toString();
        
      case 'stepwise':
        // Stepwise decay: price decreases in discrete steps
        const steps = this.config.steps || 10;
        const step = Math.floor(progress * steps);
        const stepSize = (initialPriceBN - finalPriceBN) / BigInt(steps);
        return (initialPriceBN - (stepSize * BigInt(step))).toString();
        
      case 'linear':
      default:
        // Linear decay: price decreases linearly with time
        const priceDiff = initialPriceBN - finalPriceBN;
        const progressBN = BigInt(Math.floor(progress * 1000000));
        return (initialPriceBN - (priceDiff * progressBN / BigInt(1000000))).toString();
    }
  }

  /**
   * Generates price points for the entire auction duration
   * @param {number} numPoints - Number of price points to generate
   * @returns {Array} Array of price points
   */
  generatePricePoints(numPoints = 10) {
    const points = [];
    let preimage;
    
    for (let i = 0; i <= numPoints; i++) {
      const progress = i / numPoints;
      const timestamp = this.startTime + Math.floor(progress * this.config.duration);
      
      // Save the current time
      const currentTime = Date.now();
      
      // Override the current time for price calculation
      const mockNow = timestamp * 1000;
      Date.now = () => mockNow;
      
      // Get price at this point
      const price = this.getCurrentPrice();
      
      // Generate hashlock
      if (!preimage) {
        preimage = '0x' + Buffer.from(ethers.randomBytes(32)).toString('hex');
      }
      const hashlock = '0x' + ethers.sha256(ethers.getBytes(preimage)).slice(2);
      
      // Restore the original Date.now
      Date.now = () => currentTime;
      
      points.push({
        timestamp,
        price,
        hashlock
      });
    }
    
    return points;
  }

  /**
   * Generates auction points in the format expected by 1inch Fusion SDK
   * @param {number} numPoints - Number of points to generate
   * @returns {Array<string>} Array of auction points as strings
   */
  generateAuctionPoints(numPoints = 10) {
    const points = this.generatePricePoints(numPoints);
    
    // Format points as required by 1inch Fusion SDK
    // Each point is a string in the format: "timestamp,price"
    return points.map(point => `${point.timestamp},${point.price}`);
  }
}

/**
 * Factory function to create a mock price oracle
 * @param {Object} config - Configuration for the mock price oracle
 * @returns {MockPriceOracle} A new mock price oracle instance
 */
const createMockPriceOracle = (config = {}) => {
  // Convert human-readable config to the format expected by MockPriceOracle
  const oracleConfig = {
    initialPrice: config.startPrice !== undefined 
      ? ethers.parseEther(config.startPrice.toString()).toString() 
      : defaultConfig.initialPrice,
    finalPrice: config.endPrice !== undefined 
      ? ethers.parseEther(config.endPrice.toString()).toString() 
      : defaultConfig.finalPrice,
    duration: config.durationSeconds || defaultConfig.duration,
    decayModel: config.decayModel || defaultConfig.decayModel,
    steps: config.steps || defaultConfig.steps
  };
  
  return new MockPriceOracle(oracleConfig);
};

module.exports = { MockPriceOracle, createMockPriceOracle };
