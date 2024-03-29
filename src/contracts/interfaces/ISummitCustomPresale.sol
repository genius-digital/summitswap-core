// SPDX-License-Identifier: UNLICENSED
// Developed by: dxsoftware.net

pragma solidity 0.8.6;

pragma experimental ABIEncoderV2;

import "../../structs/PresaleFeeInfo.sol";
import "../../structs/PresaleInfo.sol";

interface ISummitCustomPresale {
  function isPresaleCancelled() external view returns (bool);

  function approvePresale() external;

  function initialize(
    string[8] memory,
    PresaleInfo memory,
    PresaleFeeInfo memory,
    address,
    address
  ) external;

  function setAdmins(address[] calldata _admins, bool _isAdmin) external;

  function revokeAdmins(address[] calldata _admins) external;

  function getPresaleInfo() external view returns (PresaleInfo memory);

  function updatePresaleAndApprove(
    PresaleInfo memory _presale,
    PresaleFeeInfo memory _feeInfo,
    string[8] memory _projectDetails
  ) external;

  function updatePresale(
    PresaleInfo memory _presale,
    PresaleFeeInfo memory _feeInfo,
    string[8] memory _projectDetails
  ) external;
}
