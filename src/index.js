import { ethers } from 'ethers';

/**
 * Passly SDK - A comprehensive interface for interacting with the Passly identity protocol
 * 
 * This SDK provides an easy way for developers to integrate with Passly,
 * a social identity layer that helps verify user identities and works as an anti-sybil tool.
 * 
 * Features:
 * - Identity verification and passport management
 * - Points and rewards system integration
 * - Historical verification data access  
 * - Platform configuration queries
 * - Referral system integration
 * - Leaderboard and ranking system
 */
class PasslySDK {
  /**
   * Initialize the Passly SDK
   * @param {Object} config - Configuration options
   * @param {string} [config.contractAddress] - Override for the Passly contract address
   * @param {string} [config.platformsAddress] - Override for the Platforms contract address
   * @param {string} [config.archivesAddress] - Override for the Archives contract address  
   * @param {string} [config.rewardsAddress] - Override for the Rewards contract address
   * @param {string} [config.leaderboardAddress] - Override for the Leaderboard contract address
   * @param {ethers.providers.Provider} [config.provider] - Optional ethers provider
   * @param {ethers.Signer} [config.signer] - Optional ethers signer for write operations
   * @param {string} [config.network] - Network name for default addresses
   */
  constructor(config = {}) {
    this.config = config;
    this.contracts = {};
    this.isConnected = false;
  }

  /**
   * Connect to the Passly contracts
   * @param {Object} options - Optional connection parameters to override constructor config
   * @returns {Promise<PasslySDK>} - Returns the SDK instance
   */
  async connect(options = {}) {
    const config = { ...this.config, ...options };

    // Use default provider if none provided
    if (!config.provider) {
      config.provider = new ethers.providers.JsonRpcProvider('https://testnet.skalenodes.com/v1/aware-fake-trim-testnet');
    }

    // Default contract addresses
    const addresses = {
      passly: config.contractAddress || '0x8EEFC0840Bc24e269A2F77B787E9b3e212c4F316',
      platforms: config.platformsAddress || '0xd2FEEa5775c171D85648198AeB77377fD9AdFe98',
      archives: config.archivesAddress || '0xbC57EA3ff9BDE13087b907Dc02e86f08C57574E7',
      rewards: config.rewardsAddress || '0xEc34ad267a9AACE045Ef4644047BCFeB0f53b0C0',
      leaderboard: config.leaderboardAddress || '0x7f9c4841346d0ef7970daF02aE3663f8AC5bE540'
    };

    // Contract ABIs
    const abis = {
      passly: [
        "function getPassportByAddress(address user) external view returns (uint256)",
        "function getPassportData(uint256 passportId) external view returns (address owner, uint256 createdAt, uint256 verificationCount, string memory category, uint256 totalPoints, string memory referralCode, uint256 totalReferrals)",
        "function getVerifiedPlatforms(uint256 passportId) external view returns (string[] memory)",
        "function getVerification(uint256 passportId, string calldata platform) external view returns (string memory identifier, uint256 verifiedAt, bytes32 proofHash, bool active, bool pointsAwarded)",
        "function isIdentifierVerified(string calldata platform, string calldata identifier) external view returns (bool isVerified, uint256 passportId)",
        "function getSupportedCategories() external view returns (string[] memory)",
        "function isCategorySupported(string calldata category) external view returns (bool)",
        "function ownerOf(uint256 tokenId) external view returns (address)"
      ],
      
      platforms: [
        "function getPlatformConfig(string calldata platform) external view returns (bool isSupported, string memory platformType, string[] memory requiredPlatforms, uint256 pointReward, bool enablePointPunishment, uint256 punishmentPeriodDays)",
        "function getSupportedPlatforms() external view returns (string[] memory)",
        "function getSupportedPlatformTypes() external view returns (string[] memory)", 
        "function isPlatformSupported(string calldata platform) external view returns (bool)",
        "function isPlatformTypeSupported(string calldata platformType) external view returns (bool)",
        "function validateDependencies(string[] calldata verifiedPlatforms, string calldata platform) external view returns (bool isValid, string memory missingDependency)",
        "function getCascadeAffectedPlatforms(string[] calldata verifiedPlatforms, string calldata revokedPlatform) external view returns (string[] memory affectedPlatforms)"
      ],

      archives: [
        "function getVerificationHistory(uint256 passportId, string calldata platform) external view returns (tuple(string identifier, uint256 verifiedAt, uint256 revokedAt, bytes32 proofHash, bool wasRevoked, string revokeReason)[] memory)",
        "function getPlatformHistory(uint256 passportId, string calldata platform) external view returns (tuple(uint256 totalVerifications, uint256 totalRevocations, string[] historicalIdentifiers, uint256 firstVerificationAt, uint256 lastRevocationAt))",
        "function getHistoricalIdentifiers(uint256 passportId, string calldata platform) external view returns (string[] memory)",
        "function getIdentifierUsage(string calldata platform, string calldata identifier) external view returns (uint256[] memory)",
        "function getMultiPlatformHistory(uint256 passportId, string[] calldata platforms) external view returns (uint256 totalVerifications, uint256 totalRevocations, tuple(uint256 totalVerifications, uint256 totalRevocations, string[] historicalIdentifiers, uint256 firstVerificationAt, uint256 lastRevocationAt)[] memory platformStats)"
      ],

      rewards: [
        "function getPoints(uint256 passportId) external view returns (uint256)",
        "function getPointBreakdown(uint256 passportId) external view returns (uint256 holding, uint256 platform, uint256 referral, uint256 total)",
        "function getPlatformPoints(uint256 passportId, string calldata platform) external view returns (uint256)",
        "function isPlatformRewarded(uint256 passportId, string calldata platform) external view returns (bool)",
        "function getReferralInfo(uint256 passportId) external view returns (string memory referralCode, address referredBy, uint256 totalReferrals, uint256 referralEarnings)",
        "function validateReferralCode(string calldata referralCode) external view returns (bool isValid, uint256 ownerPassportId)",
        "function getUserReferrals(uint256 passportId) external view returns (string[] memory)",
        "function getPointConfig() external view returns (uint256 dailyHolding, uint256 referral, uint256 referee)"
      ],

      leaderboard: [
        // Global leaderboard functions
        "function getTopEntries(uint256 count) external view returns (tuple(uint256 passportId, address owner, uint256 totalScore, uint256 holdingPoints, uint256 platformPoints, uint256 referralPoints, uint256 verificationCount, string category, uint256 lastUpdated, uint256 rank, uint256 previousRank)[] memory)",
        "function getPassportEntry(uint256 passportId) external view returns (tuple(uint256 passportId, address owner, uint256 totalScore, uint256 holdingPoints, uint256 platformPoints, uint256 referralPoints, uint256 verificationCount, string category, uint256 lastUpdated, uint256 rank, uint256 previousRank))",
        "function getPassportRank(uint256 passportId) external view returns (uint256)",
        "function getPassportScore(uint256 passportId) external view returns (uint256)",
        "function isPassportInLeaderboard(uint256 passportId) external view returns (bool)",
        
        // Category-specific functions
        "function getTopEntriesByCategory(string calldata category, uint256 count) external view returns (tuple(uint256 passportId, address owner, uint256 totalScore, uint256 holdingPoints, uint256 platformPoints, uint256 referralPoints, uint256 verificationCount, string category, uint256 lastUpdated, uint256 rank, uint256 previousRank)[] memory)",
        "function getPassportEntryByCategory(uint256 passportId, string calldata category) external view returns (tuple(uint256 passportId, address owner, uint256 totalScore, uint256 holdingPoints, uint256 platformPoints, uint256 referralPoints, uint256 verificationCount, string category, uint256 lastUpdated, uint256 rank, uint256 previousRank))",
        "function getPassportRankByCategory(uint256 passportId, string calldata category) external view returns (uint256)",
        
        // Leaderboard statistics
        "function getLeaderboardStats(string calldata category) external view returns (uint256 totalEntries, bool isActive, uint256 maxEntries)",
        "function getSupportedCategories() external view returns (string[] memory)"
      ]
    };

    // Initialize contracts
    const contractProvider = config.signer || config.provider;
    
    this.contracts.passly = new ethers.Contract(addresses.passly, abis.passly, contractProvider);
    
    if (addresses.platforms) {
      this.contracts.platforms = new ethers.Contract(addresses.platforms, abis.platforms, contractProvider);
    }
    
    if (addresses.archives) {
      this.contracts.archives = new ethers.Contract(addresses.archives, abis.archives, contractProvider);
    }
    
    if (addresses.rewards) {
      this.contracts.rewards = new ethers.Contract(addresses.rewards, abis.rewards, contractProvider);
    }

    if (addresses.leaderboard) {
      this.contracts.leaderboard = new ethers.Contract(addresses.leaderboard, abis.leaderboard, contractProvider);
    }

    this.config = { ...config, addresses };
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
   * Helper to convert address or passport ID to passport ID
   * @private
   */
  async _resolvePassportId(addressOrPassportId) {
    if (typeof addressOrPassportId === 'number' || 
        (typeof addressOrPassportId === 'string' && /^\d+$/.test(addressOrPassportId))) {
      return parseInt(addressOrPassportId);
    }
    
    if (typeof addressOrPassportId === 'string' && ethers.utils.isAddress(addressOrPassportId)) {
      const passportId = await this.getPassportId(addressOrPassportId);
      if (!passportId) {
        throw new Error('No passport found for address');
      }
      return passportId;
    }
    
    throw new Error('Invalid address or passport ID');
  }

  /**
   * Helper to format leaderboard entry from contract response
   * @private
   */
  _formatLeaderboardEntry(entry) {
    return {
      passportId: entry.passportId.toNumber(),
      owner: entry.owner,
      totalScore: entry.totalScore.toNumber(),
      holdingPoints: entry.holdingPoints.toNumber(),
      platformPoints: entry.platformPoints.toNumber(),
      referralPoints: entry.referralPoints.toNumber(),
      verificationCount: entry.verificationCount.toNumber(),
      category: entry.category,
      lastUpdated: new Date(entry.lastUpdated.toNumber() * 1000),
      rank: entry.rank.toNumber(),
      previousRank: entry.previousRank.toNumber()
    };
  }

  // =============================================================================
  // PASSPORT & IDENTITY FUNCTIONS
  // =============================================================================

  /**
   * Get a user's passport ID from their wallet address
   * @param {string} address - The wallet address to check
   * @returns {Promise<number|null>} - The passport ID or null if none exists
   */
  async getPassportId(address) {
    this._ensureConnected();
    
    try {
      const passportId = await this.contracts.passly.getPassportByAddress(address);
      return passportId.toNumber();
    } catch (error) {
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
      if (!passportId) return null;
    } catch (error) {
      return null;
    }
    
    // Get passport data - now correctly handling all 7 return values
    const [owner, createdAt, verificationCount, category, totalPoints, referralCode, totalReferrals] = 
      await this.contracts.passly.getPassportData(passportId);
    
    const platforms = await this.contracts.passly.getVerifiedPlatforms(passportId);
    
    // Gather all verifications
    const verifications = {};
    for (const platform of platforms) {
      try {
        const [identifier, verifiedAt, proofHash, active, pointsAwarded] = 
          await this.contracts.passly.getVerification(passportId, platform);
        
        verifications[platform] = {
          identifier,
          verifiedAt: new Date(verifiedAt.toNumber() * 1000),
          proofHash,
          active,
          pointsAwarded
        };
      } catch (error) {
        // Skip platforms that fail to load
        console.warn(`Failed to load verification for platform ${platform}:`, error.message);
      }
    }
    
    return {
      id: passportId,
      owner,
      createdAt: new Date(createdAt.toNumber() * 1000),
      verificationCount: verificationCount.toNumber(),
      category,
      totalPoints: totalPoints.toNumber(),
      referralCode,
      totalReferrals: totalReferrals.toNumber(),
      platforms,
      verifications
    };
  }

  /**
   * Get all verification data for a passport
   * @param {string|number} addressOrPassportId - Wallet address or passport ID
   * @returns {Promise<Object>} - Object containing verification details
   */
  async getVerifications(addressOrPassportId) {
    this._ensureConnected();
    
    const passportId = await this._resolvePassportId(addressOrPassportId);
    const platforms = await this.contracts.passly.getVerifiedPlatforms(passportId);
    const verifications = {};
    
    for (const platform of platforms) {
      try {
        const [identifier, verifiedAt, proofHash, active, pointsAwarded] = 
          await this.contracts.passly.getVerification(passportId, platform);
        
        verifications[platform] = {
          identifier,
          verifiedAt: new Date(verifiedAt.toNumber() * 1000),
          proofHash,
          active,
          pointsAwarded
        };
      } catch (error) {
        console.warn(`Failed to load verification for platform ${platform}:`, error.message);
      }
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
    
    const [isVerified, passportId] = await this.contracts.passly.isIdentifierVerified(platform, identifier);
    
    return {
      isVerified,
      passportId: isVerified ? passportId.toNumber() : null
    };
  }

  /**
 * Get a user's identifier on a specific platform
 * @param {string} address - The wallet address
 * @param {string} platform - The platform name (e.g., "twitter")
 * @returns {Promise<string|null>} - The platform identifier (username/handle) or null if not verified
 */
async getPlatformIdentifier(address, platform) {
  this._ensureConnected();
  
  try {
    const passportId = await this.getPassportId(address);
    if (!passportId) return null;
    
    const [identifier, , , active] = await this.contracts.passly.getVerification(
      passportId, 
      platform.toLowerCase()
    );
    
    // Only return identifier if verification is active
    return active ? identifier : null;
  } catch (error) {
    return null;
  }
}

  // =============================================================================
  // REWARDS & POINTS FUNCTIONS
  // =============================================================================

  /**
   * Get total points for a passport
   * @param {string|number} addressOrPassportId - Wallet address or passport ID
   * @returns {Promise<number|null>} - Total points or null if no passport/rewards contract
   */
  async getPoints(addressOrPassportId) {
    this._ensureConnected();
    
    if (!this.contracts.rewards) {
      // Fallback to passport data
      const passport = await this.getPassport(addressOrPassportId);
      return passport ? passport.totalPoints : null;
    }
    
    try {
      const passportId = await this._resolvePassportId(addressOrPassportId);
      const points = await this.contracts.rewards.getPoints(passportId);
      return points.toNumber();
    } catch (error) {
      return null;
    }
  }

  /**
   * Get detailed point breakdown for a passport
   * @param {string|number} addressOrPassportId - Wallet address or passport ID
   * @returns {Promise<Object|null>} - Point breakdown or null if no passport/rewards contract
   */
  async getPointBreakdown(addressOrPassportId) {
    this._ensureConnected();
    
    if (!this.contracts.rewards) return null;
    
    try {
      const passportId = await this._resolvePassportId(addressOrPassportId);
      const [holding, platform, referral, total] = await this.contracts.rewards.getPointBreakdown(passportId);
      
      return {
        holding: holding.toNumber(),
        platform: platform.toNumber(), 
        referral: referral.toNumber(),
        total: total.toNumber()
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get points earned from a specific platform
   * @param {string|number} addressOrPassportId - Wallet address or passport ID
   * @param {string} platform - The platform name
   * @returns {Promise<number|null>} - Platform points or null if no passport/rewards contract
   */
  async getPlatformPoints(addressOrPassportId, platform) {
    this._ensureConnected();
    
    if (!this.contracts.rewards) return null;
    
    try {
      const passportId = await this._resolvePassportId(addressOrPassportId);
      const points = await this.contracts.rewards.getPlatformPoints(passportId, platform);
      return points.toNumber();
    } catch (error) {
      return null;
    }
  }

  // =============================================================================
  // REFERRAL FUNCTIONS
  // =============================================================================

  /**
   * Get referral information for a passport
   * @param {string|number} addressOrPassportId - Wallet address or passport ID
   * @returns {Promise<Object|null>} - Referral info or null if no passport/rewards contract
   */
  async getReferralInfo(addressOrPassportId) {
    this._ensureConnected();
    
    if (!this.contracts.rewards) {
      // Fallback to passport data
      const passport = await this.getPassport(addressOrPassportId);
      if (!passport) return null;
      
      return {
        referralCode: passport.referralCode,
        referredBy: '0x0000000000000000000000000000000000000000', // Not available in passport data
        totalReferrals: passport.totalReferrals,
        referralEarnings: 0 // Not available in passport data
      };
    }
    
    try {
      const passportId = await this._resolvePassportId(addressOrPassportId);
      const [referralCode, referredBy, totalReferrals, referralEarnings] = 
        await this.contracts.rewards.getReferralInfo(passportId);
      
      return {
        referralCode,
        referredBy,
        totalReferrals: totalReferrals.toNumber(),
        referralEarnings: referralEarnings.toNumber()
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate a referral code
   * @param {string} referralCode - The referral code to validate
   * @returns {Promise<Object|null>} - Validation result or null if no rewards contract
   */
  async validateReferralCode(referralCode) {
    this._ensureConnected();
    
    if (!this.contracts.rewards) return null;
    
    try {
      const [isValid, ownerPassportId] = await this.contracts.rewards.validateReferralCode(referralCode);
      
      return {
        isValid,
        ownerPassportId: isValid ? ownerPassportId.toNumber() : null
      };
    } catch (error) {
      return { isValid: false, ownerPassportId: null };
    }
  }

  // =============================================================================
  // LEADERBOARD FUNCTIONS
  // =============================================================================

  /**
   * Get top entries from global leaderboard
   * @param {number} [count=10] - Number of entries to return
   * @returns {Promise<Array|null>} - Top leaderboard entries or null if no leaderboard contract
   */
  async getTopEntries(count = 10) {
    this._ensureConnected();
    
    if (!this.contracts.leaderboard) return null;
    
    try {
      const entries = await this.contracts.leaderboard.getTopEntries(count);
      return entries.map(entry => this._formatLeaderboardEntry(entry));
    } catch (error) {
      console.warn('Failed to get top entries:', error.message);
      return null;
    }
  }

  /**
   * Get leaderboard entry for a specific passport
   * @param {string|number} addressOrPassportId - Wallet address or passport ID
   * @returns {Promise<Object|null>} - Leaderboard entry or null if not found/no leaderboard contract
   */
  async getPassportLeaderboardEntry(addressOrPassportId) {
    this._ensureConnected();
    
    if (!this.contracts.leaderboard) return null;
    
    try {
      const passportId = await this._resolvePassportId(addressOrPassportId);
      const entry = await this.contracts.leaderboard.getPassportEntry(passportId);
      return this._formatLeaderboardEntry(entry);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get global rank for a passport
   * @param {string|number} addressOrPassportId - Wallet address or passport ID
   * @returns {Promise<number|null>} - Global rank (1 = first place, 0 = not ranked) or null if no leaderboard contract
   */
  async getGlobalRank(addressOrPassportId) {
    this._ensureConnected();
    
    if (!this.contracts.leaderboard) return null;
    
    try {
      const passportId = await this._resolvePassportId(addressOrPassportId);
      const rank = await this.contracts.leaderboard.getPassportRank(passportId);
      return rank.toNumber();
    } catch (error) {
      return null;
    }
  }

  /**
   * Get current leaderboard score for a passport
   * @param {string|number} addressOrPassportId - Wallet address or passport ID
   * @returns {Promise<number|null>} - Current score or null if not found/no leaderboard contract
   */
  async getLeaderboardScore(addressOrPassportId) {
    this._ensureConnected();
    
    if (!this.contracts.leaderboard) return null;
    
    try {
      const passportId = await this._resolvePassportId(addressOrPassportId);
      const score = await this.contracts.leaderboard.getPassportScore(passportId);
      return score.toNumber();
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if passport is in the leaderboard
   * @param {string|number} addressOrPassportId - Wallet address or passport ID
   * @returns {Promise<boolean>} - Whether passport is ranked in leaderboard
   */
  async isInLeaderboard(addressOrPassportId) {
    this._ensureConnected();
    
    if (!this.contracts.leaderboard) return false;
    
    try {
      const passportId = await this._resolvePassportId(addressOrPassportId);
      return await this.contracts.leaderboard.isPassportInLeaderboard(passportId);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get top entries from a specific category leaderboard
   * @param {string} category - Category name (e.g., "creator", "developer") or "global"
   * @param {number} [count=10] - Number of entries to return
   * @returns {Promise<Array|null>} - Top entries for category or null if no leaderboard contract
   */
  async getTopEntriesByCategory(category, count = 10) {
    this._ensureConnected();
    
    if (!this.contracts.leaderboard) return null;
    
    try {
      const entries = await this.contracts.leaderboard.getTopEntriesByCategory(category, count);
      return entries.map(entry => this._formatLeaderboardEntry(entry));
    } catch (error) {
      console.warn(`Failed to get top entries for category ${category}:`, error.message);
      return null;
    }
  }

  /**
   * Get passport's rank in a specific category
   * @param {string|number} addressOrPassportId - Wallet address or passport ID
   * @param {string} category - Category name
   * @returns {Promise<number|null>} - Rank in category (1 = first place, 0 = not ranked) or null if no leaderboard contract
   */
  async getCategoryRank(addressOrPassportId, category) {
    this._ensureConnected();
    
    if (!this.contracts.leaderboard) return null;
    
    try {
      const passportId = await this._resolvePassportId(addressOrPassportId);
      const rank = await this.contracts.leaderboard.getPassportRankByCategory(passportId, category);
      return rank.toNumber();
    } catch (error) {
      return null;
    }
  }

  /**
   * Get passport's entry in a specific category leaderboard
   * @param {string|number} addressOrPassportId - Wallet address or passport ID
   * @param {string} category - Category name
   * @returns {Promise<Object|null>} - Category leaderboard entry or null if not found/no leaderboard contract
   */
  async getCategoryLeaderboardEntry(addressOrPassportId, category) {
    this._ensureConnected();
    
    if (!this.contracts.leaderboard) return null;
    
    try {
      const passportId = await this._resolvePassportId(addressOrPassportId);
      const entry = await this.contracts.leaderboard.getPassportEntryByCategory(passportId, category);
      return this._formatLeaderboardEntry(entry);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get statistics for a leaderboard category
   * @param {string} category - Category name or "global"
   * @returns {Promise<Object|null>} - Leaderboard statistics or null if no leaderboard contract
   */
  async getLeaderboardStats(category) {
    this._ensureConnected();
    
    if (!this.contracts.leaderboard) return null;
    
    try {
      const [totalEntries, isActive, maxEntries] = await this.contracts.leaderboard.getLeaderboardStats(category);
      
      return {
        category,
        totalEntries: totalEntries.toNumber(),
        isActive,
        maxEntries: maxEntries.toNumber()
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get all supported leaderboard categories
   * @returns {Promise<string[]>} - Array of supported category names
   */
  async getLeaderboardCategories() {
    this._ensureConnected();
    
    if (!this.contracts.leaderboard) return [];
    
    try {
      return await this.contracts.leaderboard.getSupportedCategories();
    } catch (error) {
      return [];
    }
  }

  /**
   * Get comprehensive leaderboard data for a passport
   * @param {string|number} addressOrPassportId - Wallet address or passport ID
   * @returns {Promise<Object|null>} - Complete leaderboard information or null if no leaderboard contract
   */
  async getCompleteLeaderboardData(addressOrPassportId) {
    this._ensureConnected();
    
    if (!this.contracts.leaderboard) return null;
    
    try {
      const passportId = await this._resolvePassportId(addressOrPassportId);
      
      // Get passport's category from passport data
      const passportData = await this.getPassport(addressOrPassportId);
      if (!passportData) return null;
      
      const category = passportData.category;
      
      // Gather all leaderboard data in parallel
      const [globalEntry, categoryEntry, isInBoard, categories] = await Promise.all([
        this.getPassportLeaderboardEntry(passportId).catch(() => null),
        this.getCategoryLeaderboardEntry(passportId, category).catch(() => null),
        this.isInLeaderboard(passportId).catch(() => false),
        this.getLeaderboardCategories().catch(() => [])
      ]);
      
      return {
        passportId,
        category,
        isInLeaderboard: isInBoard,
        global: globalEntry,
        categorySpecific: categoryEntry,
        availableCategories: categories
      };
    } catch (error) {
      return null;
    }
  }

  // =============================================================================
  // HISTORICAL DATA FUNCTIONS
  // =============================================================================

  /**
   * Get verification history for a platform
   * @param {string|number} addressOrPassportId - Wallet address or passport ID
   * @param {string} platform - The platform name
   * @returns {Promise<Array|null>} - Verification history or null if no passport/archives contract
   */
  async getVerificationHistory(addressOrPassportId, platform) {
    this._ensureConnected();
    
    if (!this.contracts.archives) return null;
    
    try {
      const passportId = await this._resolvePassportId(addressOrPassportId);
      const history = await this.contracts.archives.getVerificationHistory(passportId, platform);
      
      return history.map(entry => ({
        identifier: entry.identifier,
        verifiedAt: new Date(entry.verifiedAt.toNumber() * 1000),
        revokedAt: entry.revokedAt.toNumber() > 0 ? new Date(entry.revokedAt.toNumber() * 1000) : null,
        proofHash: entry.proofHash,
        wasRevoked: entry.wasRevoked,
        revokeReason: entry.revokeReason
      }));
    } catch (error) {
      return null;
    }
  }

  /**
   * Get platform usage statistics
   * @param {string|number} addressOrPassportId - Wallet address or passport ID
   * @param {string} platform - The platform name
   * @returns {Promise<Object|null>} - Platform history or null if no passport/archives contract
   */
  async getPlatformHistory(addressOrPassportId, platform) {
    this._ensureConnected();
    
    if (!this.contracts.archives) return null;
    
    try {
      const passportId = await this._resolvePassportId(addressOrPassportId);
      const history = await this.contracts.archives.getPlatformHistory(passportId, platform);
      
      return {
        totalVerifications: history.totalVerifications.toNumber(),
        totalRevocations: history.totalRevocations.toNumber(),
        historicalIdentifiers: history.historicalIdentifiers,
        firstVerificationAt: history.firstVerificationAt.toNumber() > 0 ? 
          new Date(history.firstVerificationAt.toNumber() * 1000) : null,
        lastRevocationAt: history.lastRevocationAt.toNumber() > 0 ? 
          new Date(history.lastRevocationAt.toNumber() * 1000) : null
      };
    } catch (error) {
      return null;
    }
  }

  // =============================================================================
  // PLATFORM CONFIGURATION FUNCTIONS
  // =============================================================================

  /**
   * Get platform configuration
   * @param {string} platform - The platform name
   * @returns {Promise<Object|null>} - Platform config or null if no platforms contract
   */
  async getPlatformConfig(platform) {
    this._ensureConnected();
    
    if (!this.contracts.platforms) return null;
    
    try {
      const [isSupported, platformType, requiredPlatforms, pointReward, enablePointPunishment, punishmentPeriodDays] = 
        await this.contracts.platforms.getPlatformConfig(platform);
      
      return {
        isSupported,
        platformType,
        requiredPlatforms,
        pointReward: pointReward.toNumber(),
        enablePointPunishment,
        punishmentPeriodDays: punishmentPeriodDays.toNumber()
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get supported platforms
   * @returns {Promise<string[]>} - List of supported platforms
   */
  async getSupportedPlatforms() {
    this._ensureConnected();
    
    if (this.contracts.platforms) {
      return await this.contracts.platforms.getSupportedPlatforms();
    }
    
    // If platforms contract not available, return empty array
    return [];
  }

  /**
   * Get supported categories (from Passly contract)
   * @returns {Promise<string[]>} - List of supported categories
   */
  async getSupportedCategories() {
    this._ensureConnected();
    return await this.contracts.passly.getSupportedCategories();
  }

  /**
   * Check if a platform is supported
   * @param {string} platform - The platform name
   * @returns {Promise<boolean>} - Whether the platform is supported
   */
  async isPlatformSupported(platform) {
    this._ensureConnected();
    
    if (this.contracts.platforms) {
      return await this.contracts.platforms.isPlatformSupported(platform);
    }
    
    return false;
  }

  // =============================================================================
  // CONVENIENCE & UTILITY FUNCTIONS
  // =============================================================================

  /**
   * Get user's active verifications by wallet address
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
   * Get comprehensive user profile
   * @param {string} address - The wallet address
   * @returns {Promise<Object|null>} - Complete user profile or null if no passport
   */
  async getUserProfile(address) {
    const passport = await this.getPassport(address);
    if (!passport) return null;

    const [pointBreakdown, referralInfo, leaderboardData] = await Promise.all([
      this.getPointBreakdown(address).catch(() => null),
      this.getReferralInfo(address).catch(() => null),
      this.getCompleteLeaderboardData(address).catch(() => null)
    ]);

    return {
      ...passport,
      points: pointBreakdown,
      referrals: referralInfo,
      leaderboard: leaderboardData
    };
  }

  /**
   * Calculate verification strength score for a user (0-100)
   * @param {string} address - The wallet address
   * @returns {Promise<Object|null>} - Verification strength data or null if no passport
   */
  async getVerificationStrength(address) {
    const passport = await this.getPassport(address);
    if (!passport) return null;

    let score = 0;
    let breakdown = {
      platformCount: 0,
      ageBonus: 0,
      diversityBonus: 0,
      pointsBonus: 0,
      totalScore: 0
    };

    // Base score: 15 points per verified platform (max 75 points for 5+ platforms)
    const activePlatforms = passport.platforms.filter(platform => 
      passport.verifications[platform].active
    );
    breakdown.platformCount = Math.min(activePlatforms.length * 15, 75);
    score += breakdown.platformCount;

    // Age bonus: up to 10 points based on passport age
    const now = new Date();
    const ageInDays = Math.floor((now - passport.createdAt) / (1000 * 60 * 60 * 24));
    breakdown.ageBonus = Math.min(Math.floor(ageInDays / 30), 10);
    score += breakdown.ageBonus;

    // Diversity bonus: 10 points if they have multiple platform types
    const socialPlatforms = ['twitter', 'discord', 'telegram', 'instagram'];
    const devPlatforms = ['github', 'gitlab'];
    const chainPlatforms = ['solana', 'ethereum'];
    
    const types = [
      activePlatforms.some(p => socialPlatforms.includes(p)),
      activePlatforms.some(p => devPlatforms.includes(p)),
      activePlatforms.some(p => chainPlatforms.includes(p))
    ].filter(Boolean);
    
    if (types.length >= 2) {
      breakdown.diversityBonus = 10;
      score += 10;
    }

    // Points bonus: up to 5 points based on total points
    if (passport.totalPoints > 0) {
      breakdown.pointsBonus = Math.min(Math.floor(passport.totalPoints / 100), 5);
      score += breakdown.pointsBonus;
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
      accountAge: ageInDays
    };
  }

  /**
   * Get system configuration
   * @returns {Promise<Object>} - System configuration
   */
  async getSystemConfig() {
    this._ensureConnected();
    
    const [supportedPlatforms, supportedCategories, leaderboardCategories] = await Promise.all([
      this.getSupportedPlatforms().catch(() => []),
      this.getSupportedCategories().catch(() => []),
      this.getLeaderboardCategories().catch(() => [])
    ]);

    let pointConfig = null;
    if (this.contracts.rewards) {
      try {
        const [dailyHolding, referral, referee] = await this.contracts.rewards.getPointConfig();
        pointConfig = {
          dailyHolding: dailyHolding.toNumber(),
          referral: referral.toNumber(),
          referee: referee.toNumber()
        };
      } catch (error) {
        // Ignore if not available
      }
    }

    return {
      supportedPlatforms,
      supportedCategories,
      leaderboardCategories,
      pointConfig,
      contracts: {
        passly: this.config.addresses.passly,
        platforms: this.config.addresses.platforms || null,
        archives: this.config.addresses.archives || null,
        rewards: this.config.addresses.rewards || null,
        leaderboard: this.config.addresses.leaderboard || null
      }
    };
  }

  /**
   * Get proof hash for a specific platform verification
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
 * Get all proof hashes for all verified platforms for a user
 * @param {string} address - The wallet address
 * @returns {Promise<{[platform: string]: string}|null>} - Object mapping platforms to proof hashes, or null if no passport
 */
async getAllProofHashes(address) {
  this._ensureConnected();
  
  try {
    const passportId = await this.getPassportId(address);
    if (!passportId) return null;
    
    const platforms = await this.contracts.passly.getVerifiedPlatforms(passportId);
    const proofHashes = {};
    
    for (const platform of platforms) {
      try {
        const [, , proofHash, active] = await this.contracts.passly.getVerification(
          passportId, 
          platform
        );
        
        // Only include active verifications
        if (active) {
          proofHashes[platform] = proofHash;
        }
      } catch (error) {
        // Skip platforms that fail to load
        console.warn(`Failed to load proof hash for platform ${platform}:`, error.message);
      }
    }
    
    return Object.keys(proofHashes).length > 0 ? proofHashes : null;
  } catch (error) {
    return null;
  }
}
}

export default PasslySDK;