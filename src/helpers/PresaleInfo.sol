pragma solidity 0.7.6;

struct PresaleInfo {
  address presaleToken;
  address router0; // router SummitSwap
  address router1; // router pancakeSwap
  address pairToken;
  uint256 presalePrice; // in wei
  uint256 listingPrice; // in wei
  uint256 liquidityLockTime; // in seconds
  uint256 minBuy; // in wei
  uint256 maxBuy; // in wei
  uint256 softCap; // in wei
  uint256 hardCap; // in wei
  uint256 liquidityPercentage;
  uint256 startPresaleTime;
  uint256 endPresaleTime;
  uint256 claimIntervalDay;
  uint256 claimIntervalHour;
  uint256 totalBought; // in wei
  uint256 maxClaimPercentage;
  uint8 refundType; // 0 refund, 1 burn
  uint8 listingChoice; // 0 100% SS, 1 100% PS, 2 (75% SS & 25% PS), 3 (75% PK & 25% SS)
  bool isWhiteListPhase;
  bool isClaimPhase;
  bool isPresaleCancelled;
  bool isWithdrawCancelledTokens;
  bool isVestingEnabled;
  bool isApproved;
}
