// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.6;

enum TokenType {
  standard,
  antiBotStandard,
  liquidityGenerator,
  antiBotLiquidityGenerator,
  baby,
  antiBotBaby,
  buybackBaby,
  antiBotBuybackBaby
}

abstract contract BaseToken {
  event TokenCreated(address indexed owner, address indexed token, TokenType tokenType, uint256 version);
}
