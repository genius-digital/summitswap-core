// SPDX-License-Identifier: UNLICENSED
// Developed by: dxsoftware.net

import "./IAccessControl.sol";

pragma solidity 0.7.6;

pragma experimental ABIEncoderV2;

interface ISummitCustomPresale is IAccessControl {
  function isPresaleCancelled() external view returns (bool);

  function approvePresale() external;

  function initialize(
    address[8] memory,
    uint256[3] memory,
    uint256[4] memory,
    uint256[4] memory,
    uint256,
    uint256,
    uint8,
    uint8,
    bool,
    bool
  ) external;

  function setFeeInfo(
    uint256 feeRaisedToken,
    uint256 feePresaleToken,
    uint256 emergencyWithdrawFee,
    address raisedTokenAddress
  ) external;

  function setPresaleInfo(
    address _pairToken,
    uint256[3] memory _tokenDetails, // presalePrice, listingPrice, liquidityPercent
    uint256[4] memory _bnbAmounts, // minBuy, maxBuy, softcap, hardcap
    uint256[4] memory _presaleTimeDetails, // startPresaleTime, endPresaleTime, claimIntervalDay, claimIntervalHour
    uint256 _liquidityLockTime,
    uint256 _maxClaimPercentage,
    uint8 _refundType,
    uint8 _listingChoice,
    bool _isWhiteListPhase,
    bool _isVestingEnabled
  ) external;
}
