//SPDX-License-Identifier: MIT

pragma solidity 0.7.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../tokens/SummitLiquidityToken.sol";

contract LiquidityTokenFactory is Ownable {
  LiquidityGeneratorToken[] public customLiquidityTokens;
  uint256 public customLiquidityTokensMade = 0;
  uint256 public createTokenFee = 0.001 ether;

  address public serviceFeeReceiver;

  constructor(uint256 _createTokenFee, address _serviceFeeReceiver) {
    createTokenFee = _createTokenFee;
    serviceFeeReceiver = _serviceFeeReceiver;
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
    require(msg.value >= createTokenFee, "Not enough Fee");
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
    if (serviceFeeReceiver != address(this) && serviceFeeReceiver != address(0)) {
      payable(serviceFeeReceiver).transfer(msg.value);
    }
    customLiquidityTokens.push(newToken);
    customLiquidityTokensMade += 1;
  }

  function withdraw(address _feeReceiver) public onlyOwner {
    address payable to = payable(_feeReceiver);
    to.transfer(address(this).balance);
  }

  function setServiceFeeReceiver(address _serviceFeeReceiver) public onlyOwner {
    serviceFeeReceiver = _serviceFeeReceiver;
  }

  function setFee(uint256 _fee) external onlyOwner {
    createTokenFee = _fee;
  }
}
