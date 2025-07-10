// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title Treasury
 * @dev Treasury contract for managing organization funds
 * @author GameDAO AG
 */
contract Treasury is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant SPENDER_ROLE = keccak256("SPENDER_ROLE");
    bytes32 public constant DEPOSITOR_ROLE = keccak256("DEPOSITOR_ROLE");

    // Treasury owner (the organization)
    bytes32 public immutable organizationId;
    address public immutable controlModule;

    // Balances tracking
    mapping(address => uint256) private _balances;
    address[] private _supportedTokens;
    mapping(address => bool) private _tokenSupported;

    // Spending limits
    mapping(address => uint256) private _spendingLimits; // per token
    mapping(address => mapping(address => uint256)) private _dailySpent; // spender => token => amount
    mapping(address => mapping(address => uint256)) private _lastSpendDay; // spender => token => day

    // Events
    event FundsDeposited(
        address indexed token,
        address indexed from,
        uint256 amount,
        string purpose,
        uint256 timestamp
    );

    event FundsSpent(
        address indexed token,
        address indexed to,
        address indexed spender,
        uint256 amount,
        string purpose,
        uint256 timestamp
    );

    event TokenAdded(address indexed token, uint256 timestamp);

    event TokenRemoved(address indexed token, uint256 timestamp);

    event SpendingLimitUpdated(
        address indexed token,
        uint256 oldLimit,
        uint256 newLimit,
        uint256 timestamp
    );

    // Errors
    error OnlyControlModule();
    error TokenNotSupported(address token);
    error InsufficientBalance(address token, uint256 requested, uint256 available);
    error SpendingLimitExceeded(address token, uint256 requested, uint256 limit);
    error ZeroAmount();
    error ZeroAddress();
    error TokenAlreadySupported(address token);

    /**
     * @dev Constructor
     * @param _organizationId The ID of the organization this treasury belongs to
     * @param _controlModule The address of the control module
     * @param _admin The admin address for this treasury
     */
    constructor(
        bytes32 _organizationId,
        address _controlModule,
        address _admin
    ) {
        require(_controlModule != address(0), "Invalid control module");
        require(_admin != address(0), "Invalid admin");

        organizationId = _organizationId;
        controlModule = _controlModule;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(SPENDER_ROLE, _controlModule);
        _grantRole(DEPOSITOR_ROLE, _controlModule);
    }

    /**
     * @dev Modifier to restrict access to the control module
     */
    modifier onlyControlModule() {
        if (_msgSender() != controlModule) revert OnlyControlModule();
        _;
    }

    /**
     * @dev Add a supported token
     * @param token The token address to add
     */
    function addToken(address token) external onlyRole(ADMIN_ROLE) {
        if (token == address(0)) revert ZeroAddress();
        if (_tokenSupported[token]) revert TokenAlreadySupported(token);

        _tokenSupported[token] = true;
        _supportedTokens.push(token);

        emit TokenAdded(token, block.timestamp);
    }

    /**
     * @dev Remove a supported token
     * @param token The token address to remove
     */
    function removeToken(address token) external onlyRole(ADMIN_ROLE) {
        if (!_tokenSupported[token]) revert TokenNotSupported(token);

        _tokenSupported[token] = false;

        // Remove from array
        for (uint256 i = 0; i < _supportedTokens.length; i++) {
            if (_supportedTokens[i] == token) {
                _supportedTokens[i] = _supportedTokens[_supportedTokens.length - 1];
                _supportedTokens.pop();
                break;
            }
        }

        emit TokenRemoved(token, block.timestamp);
    }

    /**
     * @dev Deposit funds to the treasury
     * @param token The token address
     * @param amount The amount to deposit
     * @param purpose The purpose of the deposit
     */
    function deposit(
        address token,
        uint256 amount,
        string memory purpose
    ) external nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();
        if (!_tokenSupported[token]) revert TokenNotSupported(token);

        IERC20(token).safeTransferFrom(_msgSender(), address(this), amount);
        _balances[token] += amount;

        emit FundsDeposited(token, _msgSender(), amount, purpose, block.timestamp);
    }

    /**
     * @dev Spend funds from the treasury
     * @param token The token address
     * @param to The recipient address
     * @param amount The amount to spend
     * @param purpose The purpose of the spending
     */
    function spend(
        address token,
        address to,
        uint256 amount,
        string memory purpose
    ) external nonReentrant whenNotPaused onlyRole(SPENDER_ROLE) {
        if (amount == 0) revert ZeroAmount();
        if (to == address(0)) revert ZeroAddress();
        if (!_tokenSupported[token]) revert TokenNotSupported(token);

        uint256 balance = _balances[token];
        if (balance < amount) {
            revert InsufficientBalance(token, amount, balance);
        }

        // Check spending limits
        _checkSpendingLimit(_msgSender(), token, amount);

        _balances[token] -= amount;
        IERC20(token).safeTransfer(to, amount);

        // Update daily spending
        uint256 currentDay = block.timestamp / 1 days;
        if (_lastSpendDay[_msgSender()][token] != currentDay) {
            _dailySpent[_msgSender()][token] = 0;
            _lastSpendDay[_msgSender()][token] = currentDay;
        }
        _dailySpent[_msgSender()][token] += amount;

        emit FundsSpent(token, to, _msgSender(), amount, purpose, block.timestamp);
    }

    /**
     * @dev Set spending limit for a token
     * @param token The token address
     * @param limit The daily spending limit
     */
    function setSpendingLimit(address token, uint256 limit)
        external
        onlyRole(ADMIN_ROLE)
    {
        uint256 oldLimit = _spendingLimits[token];
        _spendingLimits[token] = limit;

        emit SpendingLimitUpdated(token, oldLimit, limit, block.timestamp);
    }

    /**
     * @dev Emergency withdrawal (admin only)
     * @param token The token address
     * @param to The recipient address
     * @param amount The amount to withdraw
     */
    function emergencyWithdraw(
        address token,
        address to,
        uint256 amount
    ) external nonReentrant onlyRole(ADMIN_ROLE) {
        if (amount == 0) revert ZeroAmount();
        if (to == address(0)) revert ZeroAddress();

        uint256 balance = _balances[token];
        if (balance < amount) {
            revert InsufficientBalance(token, amount, balance);
        }

        _balances[token] -= amount;
        IERC20(token).safeTransfer(to, amount);

        emit FundsSpent(token, to, _msgSender(), amount, "Emergency withdrawal", block.timestamp);
    }

    /**
     * @dev Get balance of a specific token
     * @param token The token address
     * @return The balance amount
     */
    function getBalance(address token) external view returns (uint256) {
        return _balances[token];
    }

    /**
     * @dev Get all supported tokens
     * @return Array of supported token addresses
     */
    function getSupportedTokens() external view returns (address[] memory) {
        return _supportedTokens;
    }

    /**
     * @dev Check if a token is supported
     * @param token The token address
     * @return True if supported
     */
    function isTokenSupported(address token) external view returns (bool) {
        return _tokenSupported[token];
    }

    /**
     * @dev Get spending limit for a token
     * @param token The token address
     * @return The daily spending limit
     */
    function getSpendingLimit(address token) external view returns (uint256) {
        return _spendingLimits[token];
    }

    /**
     * @dev Get daily spent amount for a spender and token
     * @param spender The spender address
     * @param token The token address
     * @return The amount spent today
     */
    function getDailySpent(address spender, address token)
        external
        view
        returns (uint256)
    {
        uint256 currentDay = block.timestamp / 1 days;
        if (_lastSpendDay[spender][token] != currentDay) {
            return 0;
        }
        return _dailySpent[spender][token];
    }

    /**
     * @dev Pause the treasury (admin only)
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause the treasury (admin only)
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Internal function to check spending limits
     * @param spender The spender address
     * @param token The token address
     * @param amount The amount to spend
     */
    function _checkSpendingLimit(
        address spender,
        address token,
        uint256 amount
    ) internal view {
        uint256 limit = _spendingLimits[token];
        if (limit == 0) return; // No limit set

        uint256 currentDay = block.timestamp / 1 days;
        uint256 spentToday = 0;

        if (_lastSpendDay[spender][token] == currentDay) {
            spentToday = _dailySpent[spender][token];
        }

        if (spentToday + amount > limit) {
            revert SpendingLimitExceeded(token, spentToday + amount, limit);
        }
    }

    /**
     * @dev Get total value in treasury (requires price oracle for meaningful calculation)
     * @return tokens Array of token addresses
     * @return balances Array of corresponding balances
     */
    function getTotalValue()
        external
        view
        returns (address[] memory tokens, uint256[] memory balances)
    {
        tokens = _supportedTokens;
        balances = new uint256[](tokens.length);

        for (uint256 i = 0; i < tokens.length; i++) {
            balances[i] = _balances[tokens[i]];
        }
    }
}
