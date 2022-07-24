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
}
