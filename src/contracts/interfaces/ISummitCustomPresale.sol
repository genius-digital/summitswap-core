// SPDX-License-Identifier: UNLICENSED
// Developed by: dxsoftware.net

pragma solidity 0.8.6;

pragma experimental ABIEncoderV2;

interface ISummitCustomPresale {
  struct PresaleInfo {
    address presaleToken;
    address router;
    uint256 presalePrice; // in wei
    uint256 listingPrice; // in wei
    uint256 liquidityLockTime; // in seconds
    uint256 minBuyBnb; // in wei
    uint256 maxBuyBnb; // in wei
    uint256 softCap; // in wei
    uint256 hardCap; // in wei
    uint256 liquidityPercentage;
    uint256 startPresaleTime;
    uint256 endPresaleTime;
    uint256 totalBought; // in wei
    uint8 feeType; // 0 == 5% raised Bnb || 1 == 2% raised Bnb and 2% raised tokens
    uint8 refundType; // 0 refund, 1 burn
    bool isWhiteListPhase;
    bool isClaimPhase;
    bool isPresaleCancelled;
    bool isWithdrawCancelledTokens;
  }

  function getInfo() external view returns (PresaleInfo memory);

  function getContributors() external view returns (address[] memory);

  function getWhitelist() external view returns (address[] memory);

  function isPresaleCancelled() external view returns (bool);

  function calculateBnbToPresaleToken(uint256 _amount, uint256 _price) external view returns (uint256 tokens);

  function buy() external payable;

  function claim() external;

  function withdrawBNB() external;

  function emergencyWithdrawBNB() external;

  function addWhiteList(address[] memory addresses) external;

  function removeWhiteList(address[] memory addresses) external;

  function finalize() external payable;

  function withdrawCancelledTokens() external;

  function toggleWhitelistPhase() external;

  function cancelPresale() external;

  function setServiceFeeReceiver(address _feeReceiver) external;

  function withdrawBNBOwner(uint256 _amount, address _receiver) external;
}
