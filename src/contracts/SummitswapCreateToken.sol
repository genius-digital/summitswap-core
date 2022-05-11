//SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./tokens/SummitstudiosStandardToken.sol";
import "./tokens/SummitstudiosLiquidityToken.sol";

contract TokenFactory is Ownable {
  StandardToken[] public customStandardTokens;
  uint256 public customStandardTokensMade = 0;

  LiquidityGeneratorToken[] public customLiquidityTokens;
  uint256 public customLiquidityTokensMade = 0;

  uint256 public balance;

  constructor() Ownable() {
    transferOwnership(msg.sender);
  }

  function createStandardToken(
    string memory _tokenName,
    string memory _tokenSym,
    uint8 _decimals,
    uint256 _total_supply,
    address _serviceFeeReceiver
  ) public payable {
    require(msg.value >= 1 * 10**16, "Not enough eth");
    StandardToken newToken = new StandardToken(_tokenName, _tokenSym, _decimals, _total_supply, msg.sender);
    if (_serviceFeeReceiver == address(this)) {
      balance += msg.value;
    } else {
      payable(_serviceFeeReceiver).transfer(msg.value);
    }
    customStandardTokens.push(newToken);
    customStandardTokensMade += 1;
  }

  function createLiquidityToken(
    string memory _name,
    string memory _symbol,
    uint256 _totalSupply,
    address _router,
    address _charityAddress,
    uint16 _taxFeeBps,
    uint16 _liquidityFeeBps,
    uint16 _charityFeeBps,
    address _serviceFeeReceiver
  ) public payable {
    require(msg.value >= 1 * 10**16, "Not enough eth");
    LiquidityGeneratorToken newToken = new LiquidityGeneratorToken(
      _name,
      _symbol,
      _totalSupply,
      _router,
      _charityAddress,
      _taxFeeBps,
      _liquidityFeeBps,
      _charityFeeBps,
      msg.sender
    );
    if (_serviceFeeReceiver == address(this)) {
      balance += msg.value;
    } else {
      payable(_serviceFeeReceiver).transfer(msg.value);
    }
    customLiquidityTokens.push(newToken);
    customLiquidityTokensMade += 1;
  }

  function receiveMoney() external payable {
    balance += msg.value;
  }

  function getBalance() public view returns (uint256) {
    return address(this).balance;
  }

  function withdraw() public onlyOwner {
    address payable to = payable(msg.sender);
    to.transfer(getBalance());
  }
}
