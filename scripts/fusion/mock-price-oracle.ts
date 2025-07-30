/**
 * Mock Price Oracle for 1inch Fusion
 * 
 * This module provides a mock price oracle implementation for testing the
 * 1inch Fusion Dutch auction mechanism without relying on external price feeds.
 */

import { ethers } from 'ethers';

/**
 * Configuration for the mock price oracle
 */
export interface MockPriceOracleConfig {
  readonly initialPrice: string;
  readonly finalPrice: string;
  readonly duration: number; // in seconds
  readonly startTime?: number; // unix timestamp
  readonly decayModel?: 'linear' | 'exponential' | 'stepwise';
  readonly steps?: number; // for stepwise decay
}

/**
 * Price point in the auction
 */
export interface PricePoint {
  readonly timestamp: number;
  readonly price: string;
}

/**
 * Default configuration for the mock price oracle
 */
const defaultConfig: MockPriceOracleConfig = {
  initialPrice: ethers.parseEther('1.05').toString(), // 5% premium
  finalPrice: ethers.parseEther('0.98').toString(),   // 2% discount
  duration: 180, // 3 minutes
  decayModel: 'linear',
  steps: 10
};

/**
 * Creates a mock price oracle for 1inch Fusion Dutch auctions
 */
export class MockPriceOracle {
  private config: MockPriceOracleConfig;
  private startTime: number;

  /**
   * Constructor
   * @param config - Configuration for the mock price oracle
   */
  constructor(config: Partial<MockPriceOracleConfig> = {}) {
    this.config = {
      ...defaultConfig,
      ...config
    };
    
    this.startTime = this.config.startTime || Math.floor(Date.now() / 1000);
  }

  /**
   * Gets the current price based on the elapsed time
   * @returns The current price as a string
   */
  getCurrentPrice(): string {
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
    const initialPriceBN = ethers.getBigInt(this.config.initialPrice);
    const finalPriceBN = ethers.getBigInt(this.config.finalPrice);
    const progress = elapsedTime / this.config.duration;
    
    switch (this.config.decayModel) {
      case 'exponential':
        // Exponential decay: price = initialPrice * e^(-k * progress)
        // where k is calculated to reach finalPrice at the end
        const initialNumber = Number(ethers.formatEther(initialPriceBN));
        const finalNumber = Number(ethers.formatEther(finalPriceBN));
        const k = Math.log(initialNumber / finalNumber);
        const factor = Math.exp(-k * progress);
        const result = initialPriceBN * BigInt(Math.floor(factor * 1000000)) / 1000000n;
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
        return (initialPriceBN - (priceDiff * progressBN / 1000000n)).toString();
    }
  }

  /**
   * Generates price points for the entire auction duration
   * @param numPoints - Number of price points to generate
   * @returns Array of price points
   */
  generatePricePoints(numPoints: number = 10): PricePoint[] {
    const points: PricePoint[] = [];
    
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
      
      // Restore the original Date.now
      Date.now = () => currentTime;
      
      points.push({
        timestamp,
        price
      });
    }
    
    return points;
  }

  /**
   * Generates auction points in the format expected by 1inch Fusion SDK
   * @param numPoints - Number of points to generate
   * @returns Array of auction points as strings
   */
  generateAuctionPoints(numPoints: number = 10): string[] {
    const points = this.generatePricePoints(numPoints);
    
    // Format points as required by 1inch Fusion SDK
    // Each point is a string in the format: "timestamp,price"
    return points.map(point => `${point.timestamp},${point.price}`);
  }
}

export default MockPriceOracle;
