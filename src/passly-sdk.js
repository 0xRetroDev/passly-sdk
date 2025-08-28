// passly-sdk.js
import { ethers } from 'ethers';

/**
 * Passly SDK - A simple interface for interacting with the Passly identity protocol
 * 
 * This SDK provides an easy way for developers to integrate with Passly,
 * a social identity layer that helps verify user identities and works as an anti-sybil tool.
 */
class PasslySDK {
  /**
   * Initialize the Passly SDK
   * @param {Object} config - Configuration options
   * @param {string} [config.contractAddress] - Optional override for the Passly contract address
   * @param {ethers.providers.Provider} [config.provider] - Optional ethers provider
   * @param {ethers.Signer} [config.signer] - Optional ethers signer for write operations
   */
  constructor(config = {}) {
    // Default configuration will be set when connect() is called
    this.config = config;
    this.contract = null;
    this.isConnected = false;
  }

  /**
   * Connect to the Passly contract
   * @param {Object} options - Optional connection parameters to override constructor config
   * @returns {Promise<PasslySDK>} - Returns the SDK instance
   */
  async connect(options = {}) {
    const config = { ...this.config, ...options };

    // Use default provider if none provided
    if (!config.provider) {
      config.provider = new ethers.providers.JsonRpcProvider('https://testnet.skalenodes.com/v1/aware-fake-trim-testnet');
    }

    // If contract address isn't provided, use the default deployment
    config.contractAddress = config.contractAddress || '0xdf88A23Dab48210b80a44128db4Ce8A786E327be';

    // Load contract ABI
    const abi = [
      "function getPassportByAddress(address user) external view returns (uint256)",
      "function getPassportData(uint256 passportId) external view returns (address owner, uint256 createdAt, uint256 verificationCount, string memory category)",
      "function getVerifiedPlatforms(uint256 passportId) external view returns (string[] memory)",
      "function getVerification(uint256 passportId, string calldata platform) external view returns (string memory identifier, uint256 verifiedAt, bytes32 proofHash, bool active)",
      "function isIdentifierVerified(string calldata platform, string calldata identifier) external view returns (bool isVerified, uint256 passportId)",
      "function getSupportedPlatforms() external view returns (string[] memory)",
      "function getSupportedCategories() external view returns (string[] memory)",
    ];

    // Initialize the contract
    if (config.signer) {
      // Connect with signer for write operations
      this.contract = new ethers.Contract(config.contractAddress, abi, config.signer);
    } else {
      // Connect with provider for read-only operations
      this.contract = new ethers.Contract(config.contractAddress, abi, config.provider);
    }

    this.config = config;
    this.isConnected = true;
    return this;
  }

  /**
   * Ensure the SDK is connected before performing operations
   * @private
   */
  _ensureConnected() {
    if (!this.isConnected) {
      throw new Error('Passly SDK not connected. Call connect() first.');
    }
  }

  /**
   * Get a user's passport ID from their wallet address
   * @param {string} address - The wallet address to check
   * @returns {Promise<number|null>} - The passport ID or null if none exists
   */
  async getPassportId(address) {
    this._ensureConnected();
    
    try {
      const passportId = await this.contract.getPassportByAddress(address);
      return passportId.toNumber();
    } catch (error) {
      // If the error is "User has no passport", return null
      if (error.message.includes('User has no passport')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Check if a user has a passport
   * @param {string} address - The wallet address to check
   * @returns {Promise<boolean>} - Whether the user has a passport
   */
  async hasPassport(address) {
    const passportId = await this.getPassportId(address);
    return passportId !== null;
  }

  /**
   * Get complete passport data for a user
   * @param {string} address - The wallet address
   * @returns {Promise<Object|null>} - The passport data or null if no passport
   */
  async getPassport(address) {
    this._ensureConnected();
    
    let passportId;
    try {
      passportId = await this.getPassportId(address);
    } catch (error) {
      return null;
    }
    
    if (!passportId) return null;
    
    const [owner, createdAt, verificationCount, category] = await this.contract.getPassportData(passportId);
    const platforms = await this.contract.getVerifiedPlatforms(passportId);
    
    // Gather all verifications
    const verifications = {};
    for (const platform of platforms) {
      const [identifier, verifiedAt, proofHash, active] = await this.contract.getVerification(
        passportId, 
        platform
      );
      
      verifications[platform] = {
        identifier,
        verifiedAt: new Date(verifiedAt.toNumber() * 1000),
        proofHash: proofHash,
        active
      };
    }
    
    return {
      id: passportId,
      owner: owner,
      createdAt: new Date(createdAt.toNumber() * 1000),
      verificationCount: verificationCount.toNumber(),
      category,
      platforms,
      verifications
    };
  }

  /**
   * Get all verification data for a passport
   * @param {number} passportId - The passport ID
   * @returns {Promise<Object>} - Object containing verification details
   */
  async getVerifications(passportId) {
    this._ensureConnected();
    
    const platforms = await this.contract.getVerifiedPlatforms(passportId);
    const verifications = {};
    
    for (const platform of platforms) {
      const [identifier, verifiedAt, proofHash, active] = await this.contract.getVerification(
        passportId, 
        platform
      );
      
      verifications[platform] = {
        identifier,
        verifiedAt: new Date(verifiedAt.toNumber() * 1000),
        proofHash: proofHash,
        active
      };
    }
    
    return verifications;
  }

  /**
   * Check if a social media account identifier is verified
   * @param {string} platform - The platform (e.g., "twitter")
   * @param {string} identifier - The account identifier (e.g., username)
   * @returns {Promise<{isVerified: boolean, passportId: number|null}>} - Verification status and passport ID if verified
   */
  async isAccountVerified(platform, identifier) {
    this._ensureConnected();
    
    const [isVerified, passportId] = await this.contract.isIdentifierVerified(platform, identifier);
    
    return {
      isVerified,
      passportId: isVerified ? passportId.toNumber() : null
    };
  }

  /**
   * Get supported platforms
   * @returns {Promise<string[]>} - List of supported platforms
   */
  async getSupportedPlatforms() {
    this._ensureConnected();
    return await this.contract.getSupportedPlatforms();
  }

  /**
   * Get supported categories
   * @returns {Promise<string[]>} - List of supported categories
   */
  async getSupportedCategories() {
    this._ensureConnected();
    return await this.contract.getSupportedCategories();
  }

  /**
   * Helper method to get a user's active verifications by wallet address
   * @param {string} address - The wallet address
   * @returns {Promise<Object|null>} - Object of platforms and identifiers, or null if no passport
   */
  async getUserVerifications(address) {
    const passport = await this.getPassport(address);
    if (!passport) return null;
    
    const result = {};
    for (const platform in passport.verifications) {
      const verification = passport.verifications[platform];
      if (verification.active) {
        result[platform] = verification.identifier;
      }
    }
    
    return result;
  }

  /**
   * Check if a user has verified a specific platform
   * @param {string} address - The wallet address
   * @param {string} platform - The platform to check
   * @returns {Promise<boolean>} - Whether the user has verified this platform
   */
  async hasVerifiedPlatform(address, platform) {
    const verifications = await this.getUserVerifications(address);
    return verifications !== null && verifications[platform.toLowerCase()] !== undefined;
  }

  /**
   * Get a user's identifier on a specific platform
   * @param {string} address - The wallet address
   * @param {string} platform - The platform to check
   * @returns {Promise<string|null>} - The identifier or null if not verified
   */
  async getPlatformIdentifier(address, platform) {
    const verifications = await this.getUserVerifications(address);
    if (!verifications) return null;
    return verifications[platform.toLowerCase()] || null;
  }

  // CONVENIENCE FUNCTIONS FOR ENHANCED IDENTITY VERIFICATION

  /**
   * Get how long a user has been verified on a specific platform
   * @param {string} address - The wallet address
   * @param {string} platform - The platform to check
   * @returns {Promise<Object|null>} - Object with verification age data or null if not verified
   */
  async getVerificationAge(address, platform) {
    const passport = await this.getPassport(address);
    if (!passport || !passport.verifications[platform.toLowerCase()]) {
      return null;
    }

    const verification = passport.verifications[platform.toLowerCase()];
    if (!verification.active) return null;

    const now = new Date();
    const verifiedAt = verification.verifiedAt;
    const ageInMs = now - verifiedAt;
    const ageInDays = Math.floor(ageInMs / (1000 * 60 * 60 * 24));
    const ageInHours = Math.floor(ageInMs / (1000 * 60 * 60));
    const ageInMinutes = Math.floor(ageInMs / (1000 * 60));

    return {
      platform: platform.toLowerCase(),
      identifier: verification.identifier,
      verifiedAt: verifiedAt,
      ageInMs,
      ageInMinutes,
      ageInHours,
      ageInDays,
      humanReadable: ageInDays > 0 
        ? `${ageInDays} day${ageInDays !== 1 ? 's' : ''}`
        : ageInHours > 0 
        ? `${ageInHours} hour${ageInHours !== 1 ? 's' : ''}`
        : `${ageInMinutes} minute${ageInMinutes !== 1 ? 's' : ''}`
    };
  }

  /**
   * Get the earliest verification for a user (their "account age" in the Passly ecosystem)
   * @param {string} address - The wallet address
   * @returns {Promise<Object|null>} - Object with earliest verification data or null if no verifications
   */
  async getEarliestVerification(address) {
    const passport = await this.getPassport(address);
    if (!passport || passport.platforms.length === 0) {
      return null;
    }

    let earliest = null;
    let earliestDate = null;

    for (const platform of passport.platforms) {
      const verification = passport.verifications[platform];
      if (verification.active && (!earliestDate || verification.verifiedAt < earliestDate)) {
        earliestDate = verification.verifiedAt;
        earliest = {
          platform,
          identifier: verification.identifier,
          verifiedAt: verification.verifiedAt,
          proofHash: verification.proofHash
        };
      }
    }

    if (earliest) {
      const now = new Date();
      const ageInMs = now - earliest.verifiedAt;
      const ageInDays = Math.floor(ageInMs / (1000 * 60 * 60 * 24));

      return {
        ...earliest,
        ageInDays,
        humanReadable: `${ageInDays} day${ageInDays !== 1 ? 's' : ''} ago`
      };
    }

    return null;
  }

  /**
   * Calculate a verification strength score for a user (0-100)
   * @param {string} address - The wallet address
   * @returns {Promise<Object|null>} - Object with verification strength data or null if no passport
   */
  async getVerificationStrength(address) {
    const passport = await this.getPassport(address);
    if (!passport) return null;

    const now = new Date();
    let score = 0;
    let breakdown = {
      platformCount: 0,
      ageBonus: 0,
      diversityBonus: 0,
      totalScore: 0
    };

    // Base score: 20 points per verified platform (max 80 points for 4+ platforms)
    const activePlatforms = passport.platforms.filter(platform => 
      passport.verifications[platform].active
    );
    breakdown.platformCount = Math.min(activePlatforms.length * 20, 80);
    score += breakdown.platformCount;

    // Age bonus: up to 15 points based on earliest verification age
    const earliest = await this.getEarliestVerification(address);
    if (earliest) {
      const ageInDays = earliest.ageInDays;
      // Give more points for older verifications (max 15 points at 365+ days)
      breakdown.ageBonus = Math.min(Math.floor(ageInDays / 24.33), 15); // ~15 points at 1 year
      score += breakdown.ageBonus;
    }

    // Diversity bonus: 5 points if they have both social and development platforms
    const socialPlatforms = ['twitter', 'discord', 'telegram', 'instagram'];
    const devPlatforms = ['github', 'gitlab'];
    
    const hasSocial = activePlatforms.some(platform => socialPlatforms.includes(platform));
    const hasDev = activePlatforms.some(platform => devPlatforms.includes(platform));
    
    if (hasSocial && hasDev) {
      breakdown.diversityBonus = 5;
      score += 5;
    }

    breakdown.totalScore = Math.min(score, 100);

    return {
      score: breakdown.totalScore,
      grade: breakdown.totalScore >= 80 ? 'A' : 
             breakdown.totalScore >= 60 ? 'B' : 
             breakdown.totalScore >= 40 ? 'C' : 
             breakdown.totalScore >= 20 ? 'D' : 'F',
      breakdown,
      activePlatforms: activePlatforms.length,
      accountAge: earliest ? earliest.ageInDays : 0
    };
}

  /**
   * Get users by category (requires querying multiple passport IDs)
   * Note: This is a simplified version that checks known passport IDs
   * In a real implementation, you might want to use The Graph or similar indexing
   * @param {string} category - The category to search for
   * @param {number} limit - Maximum number of results
   * @param {number} startId - Starting passport ID to search from
   * @returns {Promise<Array>} - Array of passport data matching the category
   */
  async getUsersByCategory(category, limit = 10, startId = 1) {
    this._ensureConnected();
    
    const results = [];
    const normalizedCategory = category.toLowerCase();
    let currentId = startId;
    let found = 0;
    let attempts = 0;
    const maxAttempts = limit * 10; // Prevent infinite loops

    while (found < limit && attempts < maxAttempts) {
      try {
        const [owner, createdAt, verificationCount, passportCategory] = 
          await this.contract.getPassportData(currentId);
        
        if (passportCategory.toLowerCase() === normalizedCategory) {
          const platforms = await this.contract.getVerifiedPlatforms(currentId);
          
          results.push({
            id: currentId,
            owner,
            createdAt: new Date(createdAt.toNumber() * 1000),
            verificationCount: verificationCount.toNumber(),
            category: passportCategory,
            platforms
          });
          
          found++;
        }
      } catch (error) {
        // Passport doesn't exist, continue to next ID
      }
      
      currentId++;
      attempts++;
    }

    return results;
  }

  // PROOF HASH UTILITIES

  /**
   * Get the proof hash for a specific platform verification
   * @param {string} address - The wallet address
   * @param {string} platform - The platform to get proof hash for
   * @returns {Promise<string|null>} - The proof hash or null if not verified
   */
  async getProofHash(address, platform) {
    const passport = await this.getPassport(address);
    if (!passport || !passport.verifications[platform.toLowerCase()]) {
      return null;
    }

    const verification = passport.verifications[platform.toLowerCase()];
    if (!verification.active) return null;

    return verification.proofHash;
  }

  /**
   * Get all proof hashes for all verified platforms
   * @param {string} address - The wallet address
   * @returns {Promise<Object|null>} - Object mapping platforms to proof hashes or null if no passport
   */
  async getAllProofHashes(address) {
    const passport = await this.getPassport(address);
    if (!passport) return null;

    const proofHashes = {};
    
    for (const platform of passport.platforms) {
      const verification = passport.verifications[platform];
      if (verification.active) {
        proofHashes[platform] = verification.proofHash;
      }
    }

    return proofHashes;
  }


}

export default PasslySDK;