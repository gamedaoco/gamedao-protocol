// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../core/GameDAOModule.sol";
import "../../interfaces/IIdentity.sol";
import "../../interfaces/IControl.sol";
import "../../libraries/GameId.sol";

/**
 * @title Identity
 * @dev GameDAO Identity Module - User Identity & Profile Management
 * @notice Provides user identity management, profile creation, name claiming, and verification using hierarchical IDs
 */
contract Identity is GameDAOModule, IIdentity {
    using EnumerableSet for EnumerableSet.Bytes32Set;
    using GameId for bytes8;

    // =============================================================
    // CONSTANTS
    // =============================================================

    bytes32 public constant IDENTITY_ADMIN_ROLE = keccak256("IDENTITY_ADMIN_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    // Name claiming configuration
    uint256 public constant MIN_NAME_STAKE = 100 * 10**18; // 100 GAME tokens
    uint256 public constant MAX_NAME_STAKE = 10000 * 10**18; // 10,000 GAME tokens
    uint256 public constant MIN_STAKE_DURATION = 30 days;
    uint256 public constant MAX_STAKE_DURATION = 365 days;
    uint256 public constant NAME_LENGTH = 8;

    // =============================================================
    // STATE VARIABLES
    // =============================================================

    // Profile storage
    mapping(string => Profile) private _profiles;                           // profileId -> Profile
    mapping(address => mapping(bytes8 => string)) private _ownerToProfile;  // owner -> orgId -> profileId
    EnumerableSet.Bytes32Set private _allProfiles;                          // All profile IDs (as bytes32)
    mapping(bytes8 => EnumerableSet.Bytes32Set) private _organizationProfiles; // orgId -> profileIds

    // Name claiming system
    mapping(bytes8 => address) private _nameOwners;         // name -> owner
    mapping(bytes8 => uint256) private _nameStakes;         // name -> staked amount
    mapping(bytes8 => uint256) private _nameExpirations;    // name -> expiration timestamp
    mapping(address => bytes8[]) private _ownerNames;       // owner -> names
    mapping(bytes8 => NameClaim) private _nameClaims;       // name -> claim details

    // Verification storage
    mapping(string => VerificationLevel) private _verificationLevels;

    // Counters
    uint256 private _profileCounter;

    // =============================================================
    // CONSTRUCTOR
    // =============================================================

    /**
     * @dev Constructor
     */
    constructor() GameDAOModule("1.0.0") {
        // Grant roles to deployer initially
        _grantRole(IDENTITY_ADMIN_ROLE, _msgSender());
        _grantRole(VERIFIER_ROLE, _msgSender());
    }

    /**
     * @dev Returns the unique identifier for this module
     */
    function moduleId() external pure override returns (bytes32) {
        return keccak256("IDENTITY");
    }

    /**
     * @dev Internal initialization hook
     */
    function _onInitialize() internal override {
        // Grant admin roles to the registry
        address registryAddr = this.registry();
        _grantRole(IDENTITY_ADMIN_ROLE, registryAddr);
        _grantRole(VERIFIER_ROLE, registryAddr);
    }

    // =============================================================
    // PROFILE MANAGEMENT
    // =============================================================

    /**
     * @dev Create a new user profile with hierarchical ID
     */
    function createProfile(bytes8 organizationId, string memory metadata)
        external
        override
        onlyInitialized
        whenNotPaused
        returns (string memory profileId)
    {
        // Validate organization exists
        _validateOrganization(organizationId);

        // Check if profile already exists for this owner and organization
        string memory existingProfileId = _ownerToProfile[_msgSender()][organizationId];
        if (bytes(existingProfileId).length != 0) {
            revert ProfileAlreadyExists(_msgSender(), organizationId);
        }

        // Generate hierarchical profile ID using GameId library
        profileId = _generateProfileId(organizationId, _msgSender());

        // Create profile
        Profile storage profile = _profiles[profileId];
        profile.profileId = profileId;
        profile.owner = _msgSender();
        profile.organizationId = organizationId;
        profile.metadata = metadata;
        profile.createdAt = block.timestamp;
        profile.updatedAt = block.timestamp;
        profile.active = true;
        profile.verified = false;

        // Add to tracking sets
        bytes32 profileIdHash = keccak256(bytes(profileId));
        _allProfiles.add(profileIdHash);
        _organizationProfiles[organizationId].add(profileIdHash);
        _ownerToProfile[_msgSender()][organizationId] = profileId;

        emit ProfileCreated(profileId, _msgSender(), organizationId, metadata, block.timestamp);

        return profileId;
    }

    /**
     * @dev Update an existing profile
     */
    function updateProfile(string memory profileId, string memory metadata)
        external
        override
        onlyInitialized
        whenNotPaused
    {
        Profile storage profile = _profiles[profileId];
        if (profile.owner == address(0)) revert ProfileNotFound(profileId);
        if (profile.owner != _msgSender() && !hasRole(IDENTITY_ADMIN_ROLE, _msgSender())) {
            revert UnauthorizedProfileAccess(profileId, _msgSender());
        }

        profile.metadata = metadata;
        profile.updatedAt = block.timestamp;

        emit ProfileUpdated(profileId, metadata, block.timestamp);
    }

    /**
     * @dev Get profile information
     */
    function getProfile(string memory profileId) external view override returns (Profile memory profile) {
        profile = _profiles[profileId];
        if (profile.owner == address(0)) revert ProfileNotFound(profileId);
        return profile;
    }

    /**
     * @dev Get profile by owner and organization
     */
    function getProfileByOwner(address owner, bytes8 organizationId)
        external
        view
        override
        returns (Profile memory profile)
    {
        string memory profileId = _ownerToProfile[owner][organizationId];
        if (bytes(profileId).length == 0) revert ProfileNotFound(profileId);
        return _profiles[profileId];
    }

    /**
     * @dev Check if a profile exists
     */
    function profileExists(string memory profileId) external view override returns (bool exists) {
        return _profiles[profileId].owner != address(0);
    }

    /**
     * @dev Get profiles by organization
     */
    function getProfilesByOrganization(bytes8 organizationId)
        external
        view
        override
        returns (string[] memory profileIds)
    {
        bytes32[] memory profileHashes = _organizationProfiles[organizationId].values();
        profileIds = new string[](profileHashes.length);

        for (uint256 i = 0; i < profileHashes.length; i++) {
            // Find the profile ID that matches this hash
            // This is a simplified approach - in production, consider maintaining a reverse mapping
            bytes32 targetHash = profileHashes[i];
            // For now, we'll need to iterate through profiles to find matches
            // This can be optimized with additional mappings if needed
        }

        return profileIds;
    }

    /**
     * @dev Get total number of profiles
     */
    function getProfileCount() external view override returns (uint256 count) {
        return _allProfiles.length();
    }

    // =============================================================
    // VERIFICATION SYSTEM
    // =============================================================

    /**
     * @dev Verify a profile
     */
    function verifyProfile(string memory profileId, VerificationLevel level)
        external
        override
        onlyRole(VERIFIER_ROLE)
        onlyInitialized
        whenNotPaused
    {
        Profile storage profile = _profiles[profileId];
        if (profile.owner == address(0)) revert ProfileNotFound(profileId);

        profile.verified = level != VerificationLevel.NONE;
        _verificationLevels[profileId] = level;

        emit ProfileVerified(profileId, level, _msgSender(), block.timestamp);
    }

    /**
     * @dev Get verification level for a profile
     */
    function getVerificationLevel(string memory profileId) external view override returns (VerificationLevel level) {
        if (_profiles[profileId].owner == address(0)) revert ProfileNotFound(profileId);
        return _verificationLevels[profileId];
    }

    // =============================================================
    // NAME CLAIMING SYSTEM
    // =============================================================

    /**
     * @dev Claim an 8-byte name with GAME token staking
     */
    function claimName(
        bytes8 name,
        uint256 stakeAmount,
        uint256 stakeDuration,
        NameType nameType
    ) external override onlyInitialized whenNotPaused nonReentrant returns (bool success) {
        // Validate name format
        if (!validateNameFormat(name)) {
            revert InvalidNameFormat(name);
        }

        // Check if name is available
        if (!isNameAvailable(name)) {
            revert NameAlreadyClaimed(name);
        }

        // Validate stake parameters
        if (stakeAmount < MIN_NAME_STAKE || stakeAmount > MAX_NAME_STAKE) {
            revert InvalidStakeAmount(stakeAmount);
        }

        if (stakeDuration < MIN_STAKE_DURATION || stakeDuration > MAX_STAKE_DURATION) {
            revert InvalidStakeDuration(stakeDuration);
        }

        // Get GAME token from registry
        address gameTokenAddress = _getGameTokenAddress();
        IERC20 gameToken = IERC20(gameTokenAddress);

        // Check user balance
        uint256 userBalance = gameToken.balanceOf(_msgSender());
        if (userBalance < stakeAmount) {
            revert InsufficientTokenBalance(gameTokenAddress, stakeAmount, userBalance);
        }

        // Transfer GAME tokens to this contract
        require(
            gameToken.transferFrom(_msgSender(), address(this), stakeAmount),
            "GAME token transfer failed"
        );

        // Create name claim
        uint256 expiresAt = block.timestamp + stakeDuration;
        _nameClaims[name] = NameClaim({
            name: name,
            owner: _msgSender(),
            stakeAmount: stakeAmount,
            stakeDuration: stakeDuration,
            claimedAt: block.timestamp,
            expiresAt: expiresAt,
            isActive: true,
            nameType: nameType
        });

        // Update mappings
        _nameOwners[name] = _msgSender();
        _nameStakes[name] = stakeAmount;
        _nameExpirations[name] = expiresAt;
        _ownerNames[_msgSender()].push(name);

        emit NameClaimed(name, _msgSender(), stakeAmount, stakeDuration, nameType, block.timestamp);

        return true;
    }

    /**
     * @dev Release a claimed name and recover staked tokens
     */
    function releaseName(bytes8 name) external override onlyInitialized whenNotPaused nonReentrant returns (uint256 stakeAmount) {
        NameClaim storage claim = _nameClaims[name];

        // Check if name is claimed
        if (!claim.isActive) {
            revert NameNotClaimed(name);
        }

        // Check ownership
        if (claim.owner != _msgSender()) {
            revert UnauthorizedNameAccess(name, _msgSender());
        }

        // Check if name has expired
        if (block.timestamp < claim.expiresAt) {
            revert NameNotExpired(name);
        }

        stakeAmount = claim.stakeAmount;

        // Update claim status
        claim.isActive = false;

        // Clear mappings
        delete _nameOwners[name];
        delete _nameStakes[name];
        delete _nameExpirations[name];

        // Remove from owner's names array
        bytes8[] storage ownerNames = _ownerNames[_msgSender()];
        for (uint256 i = 0; i < ownerNames.length; i++) {
            if (ownerNames[i] == name) {
                ownerNames[i] = ownerNames[ownerNames.length - 1];
                ownerNames.pop();
                break;
            }
        }

        // Return staked tokens
        address gameTokenAddress = _getGameTokenAddress();
        IERC20 gameToken = IERC20(gameTokenAddress);
        require(gameToken.transfer(_msgSender(), stakeAmount), "GAME token transfer failed");

        emit NameReleased(name, _msgSender(), stakeAmount, block.timestamp);

        return stakeAmount;
    }

    /**
     * @dev Check if a name is available for claiming
     */
    function isNameAvailable(bytes8 name) public view override returns (bool available) {
        NameClaim storage claim = _nameClaims[name];

        // Name is available if:
        // 1. Never claimed, OR
        // 2. Previously claimed but expired and not active
        return !claim.isActive || block.timestamp >= claim.expiresAt;
    }

    /**
     * @dev Get name claim details
     */
    function getNameClaim(bytes8 name) external view override returns (NameClaim memory claim) {
        return _nameClaims[name];
    }

    /**
     * @dev Get names owned by an address
     */
    function getNamesOwnedBy(address owner) external view override returns (bytes8[] memory names) {
        return _ownerNames[owner];
    }

    /**
     * @dev Validate name format (8 characters, alphanumeric)
     */
    function validateNameFormat(bytes8 name) public pure override returns (bool valid) {
        // Convert bytes8 to bytes for validation
        bytes memory nameBytes = new bytes(8);
        for (uint256 i = 0; i < 8; i++) {
            nameBytes[i] = name[i];
        }

        // Check each character is alphanumeric (A-Z, 0-9)
        for (uint256 i = 0; i < 8; i++) {
            bytes1 char = nameBytes[i];

            // Check if character is 0-9 or A-Z
            if (!((char >= 0x30 && char <= 0x39) || (char >= 0x41 && char <= 0x5A))) {
                return false;
            }
        }

        return true;
    }

    // =============================================================
    // INTERNAL FUNCTIONS
    // =============================================================

    /**
     * @dev Validate organization exists through Control module
     */
    function _validateOrganization(bytes8 organizationId) internal view {
        address controlModule = getModule(keccak256("CONTROL"));
        if (controlModule == address(0)) revert OrganizationNotFound(organizationId);

        IControl control = IControl(controlModule);
        if (!control.isOrganizationActive(organizationId)) {
            revert OrganizationNotFound(organizationId);
        }
    }

    /**
     * @dev Generate hierarchical profile ID using GameId library
     */
    function _generateProfileId(bytes8 organizationId, address user) internal view returns (string memory) {
        bytes8 profileId = GameId.generateId("profile", _profileCounter);
        return string(abi.encodePacked(
            organizationId,
            "-U-",
            profileId
        ));
    }

    /**
     * @dev Get GAME token address from registry
     */
    function _getGameTokenAddress() internal view returns (address) {
        // This would typically get the GAME token address from the registry
        // For now, we'll need to add this to the module initialization
        // TODO: Implement proper GAME token address retrieval
        return address(0); // Placeholder
    }
}
