//SPDX-License-Identifier: MIT

pragma solidity 0.7.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../tokens/SummitswapLiquidityToken.sol";

contract LiquidityFactory is Ownable {
  LiquidityGeneratorToken[] public customLiquidityTokens;
  uint256 public customLiquidityTokensMade = 0;

  address public serviceFeeReceiver;
  uint256 public balance;

  constructor(address _serviceFeeReceiver) Ownable() {
    serviceFeeReceiver = _serviceFeeReceiver;
    transferOwnership(msg.sender);
  }

  function createLiquidityToken(
    string memory _name,
    string memory _symbol,
    uint256 _totalSupply,
    address _router,
    address _charityAddress,
    uint16 _taxFeeBps,
    uint16 _liquidityFeeBps,
    uint16 _charityFeeBps
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
    if (serviceFeeReceiver == address(this)) {
      balance += msg.value;
    } else {
      payable(serviceFeeReceiver).transfer(msg.value);
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

  function changeFeeReceiver(address _serviceFeeReceiver) public onlyOwner {
    serviceFeeReceiver = _serviceFeeReceiver;
  }
}
