// SPDX-License-Identifier: Unlisenced
// Developed by: dxsoftware.net

import {Phase} from "./SummitWhitelabelNftEnums.sol";

pragma solidity ^0.8.6;

struct TokenInfo {
  string name;
  string symbol;
  uint256 maxSupply;
  uint256 whitelistMintPrice;
  uint256 publicMintPrice;
  uint8 startTokenId;
  address signer;
  Phase phase;
}
