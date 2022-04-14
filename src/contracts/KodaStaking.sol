// SPDX-License-Identifier: MIT
// Developed by: dxsoftware.net

pragma solidity 0.8.13;

import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";

import "./interfaces/IERC20.sol";
import "./shared/Ownable.sol";

library Errors {
  string public constant ZERO_GROW_K_PERIOD = "ZERO_GROW_K_PERIOD";
  string public constant NOT_DEPOSIT_OWNER = "NOT_DEPOSIT_OWNER";
  string public constant DEPOSIT_IS_LOCKED = "DEPOSIT_IS_LOCKED";
  string public constant INSUFFICIENT_DEPOSIT = "INSUFFICIENT_DEPOSIT";
  string public constant ZERO_TOTAL_RATING = "ZERO_TOTAL_RATING";
  string public constant ZERO_ADDRESS = "ZERO_ADDRESS";
  string public constant SMALL_END_K = "SMALL_END_K";
  string public constant ZERO_DEPOSIT_AMOUNT = "ZERO_DEPOSIT_AMOUNT";
  string public constant NOT_FOUND = "NOT_FOUND";
  string public constant WRONG_INDEX = "WRONG_INDEX";
  string public constant DATA_INCONSISTENCY = "DATA_INCONSISTENCY";
  string public constant INSUFFICIENT_SWAP = "INSUFFICIENT_SWAP";
}

contract RankedStaking is Ownable, ReentrancyGuard {
  using SafeERC20 for IERC20;
  using EnumerableSet for EnumerableSet.UintSet;

  event DepositPut(address indexed user, uint40 lockFor, uint256 indexed id, uint256 amount);
  event DepositWithdrawn(address indexed user, uint256 indexed id, uint256 amount, uint256 rest);
  event SharePremium(address indexed user, uint256 amount, uint256 premiumPerRatingPoint, uint256 totalRating);
  event PremiumPaid(address indexed user, uint256 amount);

  struct Deposit {
    address user;
    uint40 depositAt;
    uint40 lockFor;
    uint256 amount;
  }

  struct UserAccount {
    uint256 claimedAmount;
    uint256 rating;
    uint256 totalDepositAmount;
  }

  address public immutable stakingToken;
  address public immutable premiumToken;

  uint256 internal nextDepositId;
  uint256 public totalRating;
  uint256 public premiumPerRatingPoint;
  uint256 public constant PREMIUM_PER_RATING_POINT_BASE = 10**18;
  uint256 public constant RATE_POINT_BASE = 10**18;
  mapping(uint256 => Deposit) public deposits;
  mapping(address => UserAccount) public accounts;
  mapping(address => EnumerableSet.UintSet) internal userDepositIds;

  uint256 public constant K_BASE = 10**18;
  uint256 public constant START_K = K_BASE; // starting K
  uint256 public constant END_K = 3 * 10**18; // maximum K
  uint256 public constant START_K_PERIOD = 1209600; // 14 days
  uint256 public constant GROW_K_PERIOD = 6048000; // 70 days

  constructor(address _premiumToken, address _stakingToken) {
    require(_premiumToken != address(0), Errors.ZERO_ADDRESS);
    require(_stakingToken != address(0), Errors.ZERO_ADDRESS);
    premiumToken = _premiumToken;
    stakingToken = _stakingToken;
  }

  //    K
  //  ^                        K = END_K, after T >= depositAt + START_K_PERIOD + GROW_K_PERIOD
  //  |                ---------
  //  |               /
  //  |              /
  //  |             /
  //  |            /   K = START_K + (END_K - START_K) * (T - depositAt - START_K_PERIOD) / GROW_K_PERIOD, after T > depositAt + START_K_PERIOD
  //  |           /
  //  |   -------/
  //  |
  //  |    ^
  //  |    K = START_K, T <= depositAt + START_K_PERIOD
  //  |
  //  |-----------------------------------> Time
  function calculateK(uint256 lockFor) public view returns (uint256) {
    if (lockFor <= START_K_PERIOD) {
      return START_K;
    } else if (lockFor < START_K_PERIOD + GROW_K_PERIOD) {
      return START_K + ((END_K - START_K) * (lockFor - START_K_PERIOD)) / GROW_K_PERIOD;
    } else {
      return END_K;
    }
  }

  function getUserDepositIds(address user) external view returns (uint256[] memory) {
    uint256[] memory depositIds = new uint256[](userDepositIds[user].length());
    for (uint256 i = 0; i < userDepositIds[user].length(); ++i) {
      depositIds[i] = userDepositIds[user].at(i);
    }
    return depositIds;
  }

  function getUserDepositIdAtIndex(address user, uint256 index) external view returns (uint256) {
    return userDepositIds[user].at(index);
  }

  function getUserDepositsLength(address user) external view returns (uint256) {
    return userDepositIds[user].length();
  }

  function sharePremium(uint256 amount) external {
    require(totalRating > 0, Errors.ZERO_TOTAL_RATING);
    premiumPerRatingPoint += (amount * PREMIUM_PER_RATING_POINT_BASE) / totalRating;
    emit SharePremium(msg.sender, amount, premiumPerRatingPoint, totalRating);
    IERC20(premiumToken).safeTransferFrom(msg.sender, address(this), amount);
  }

  function claimPremium() external {
    accounts[msg.sender].claimedAmount = _claimPremium();
  }

  function _claimPremium() private returns (uint256) {
    UserAccount storage account = accounts[msg.sender];
    uint256 total = (account.rating * premiumPerRatingPoint) / PREMIUM_PER_RATING_POINT_BASE;
    uint256 _claimedAmount = account.claimedAmount;
    if (total <= _claimedAmount) {
      return _claimedAmount;
    }
    uint256 rest = total - _claimedAmount;
    emit PremiumPaid(msg.sender, rest);
    IERC20(premiumToken).safeTransfer(msg.sender, rest);
    return total;
  }

  function premiumOf(address user) external view returns (uint256) {
    UserAccount memory account = accounts[user];
    uint256 total = (account.rating * premiumPerRatingPoint) / PREMIUM_PER_RATING_POINT_BASE;
    if (total <= account.claimedAmount) {
      return 0;
    }
    uint256 rest = total - account.claimedAmount;
    return rest;
  }

  function putDeposit(uint256 amount, uint40 lockFor) external returns (uint256) {
    IERC20(stakingToken).safeTransferFrom(msg.sender, address(this), amount);
    return deposit(msg.sender, amount, lockFor);
  }

  function deposit(
    address beneficiary,
    uint256 amount,
    uint40 lockFor
  ) private returns (uint256) {
    require(amount > 0, Errors.ZERO_DEPOSIT_AMOUNT);
    _claimPremium();
    uint256 depositId = nextDepositId++;
    deposits[depositId] = Deposit({
      user: beneficiary,
      depositAt: uint40(block.timestamp),
      amount: amount,
      lockFor: lockFor
    });
    uint256 deltaRating = (amount * calculateK(lockFor)) / K_BASE;
    UserAccount storage account = accounts[beneficiary];
    uint256 _rating = account.rating;
    account.claimedAmount = ((_rating + deltaRating) * premiumPerRatingPoint) / PREMIUM_PER_RATING_POINT_BASE;
    account.rating = _rating + deltaRating;
    account.totalDepositAmount += amount;
    require(userDepositIds[beneficiary].add(depositId), Errors.DATA_INCONSISTENCY);
    totalRating += deltaRating;
    emit DepositPut(beneficiary, lockFor, depositId, amount);
    return depositId;
  }

  function withdrawDeposit(uint256 depositId, uint256 amount) external {
    _claimPremium();
    Deposit storage deposit = deposits[depositId];
    if (deposit.amount < amount) {
      revert(Errors.INSUFFICIENT_DEPOSIT);
    }
    // deposit.amount >= amount
    require(deposit.user == msg.sender, Errors.NOT_DEPOSIT_OWNER);
    require(block.timestamp >= deposit.depositAt + deposit.lockFor, Errors.DEPOSIT_IS_LOCKED);
    require(userDepositIds[msg.sender].contains(depositId), Errors.DATA_INCONSISTENCY);
    uint256 deltaRating = (amount * calculateK(deposit.lockFor)) / K_BASE;
    UserAccount storage account = accounts[msg.sender];
    account.totalDepositAmount -= amount;
    uint256 _rating = account.rating;
    account.claimedAmount = ((_rating - deltaRating) * premiumPerRatingPoint) / PREMIUM_PER_RATING_POINT_BASE;
    account.rating = (_rating - deltaRating);
    totalRating -= deltaRating;
    if (deposit.amount > amount) {
      deposit.amount -= amount;
      emit DepositWithdrawn(msg.sender, depositId, amount, deposit.amount);
    } else {
      // deposit.amount == amount, because of require condition (take care!)
      delete deposits[depositId]; // free up storage slot
      require(userDepositIds[msg.sender].remove(depositId), Errors.DATA_INCONSISTENCY);
      emit DepositWithdrawn(msg.sender, depositId, amount, 0);
    }
    IERC20(stakingToken).safeTransfer(msg.sender, amount);
  }
}
