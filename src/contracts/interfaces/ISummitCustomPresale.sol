// SPDX-License-Identifier: UNLICENSED
// Developed by: dxsoftware.net

pragma solidity 0.7.6;

pragma experimental ABIEncoderV2;

import "../../structs/PresaleFee.sol";
import "../../structs/PresaleInfo.sol";

interface ISummitCustomPresale {
  function isPresaleCancelled() external view returns (bool);

  function approvePresale() external;

  function initialize(
    string[8] memory,
    PresaleInfo memory,
    FeeInfo memory,
    address,
    address
  ) external;

  function setFeeInfo(
    uint256 feeRaisedToken,
    uint256 feePresaleToken,
    uint256 emergencyWithdrawFee,
    address raisedTokenAddress
  ) external;

  function setPresaleInfo(
    address _pairToken,
    uint256[3] memory _bnbAmounts, // minBuy, maxBuy, softcap, hardcap
    uint256[4] memory _presaleTimeDetails, // startPresaleTime, endPresaleTime, claimIntervalDay, claimIntervalHour
    uint256 _liquidityLockTime,
    uint256 _maxClaimPercentage,
    uint8 _refundType,
    uint8 _listingChoice,
    bool _isWhiteListPhase,
    bool _isVestingEnabled
  ) external;

  function assignAdmins(address[] calldata _admins) external;

  function revokeAdmins(address[] calldata _admins) external;

  function getPresaleInfo() external view returns (PresaleInfo memory);

  function updatePresaleAndApprove(PresaleInfo memory _presale, FeeInfo memory _feeInfo) external;
}
