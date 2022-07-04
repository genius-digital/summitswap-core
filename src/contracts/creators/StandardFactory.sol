//SPDX-License-Identifier: MIT

pragma solidity 0.7.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../tokens/SummitswapStandardToken.sol";

contract StandardFactory is Ownable {
  StandardToken[] public customStandardTokens;
  uint256 public customStandardTokensMade = 0;
  uint256 public createTokenFee = 0.001 ether;

  address public serviceFeeReceiver;

  constructor(uint256 _createTokenFee, address _serviceFeeReceiver) {
    createTokenFee = _createTokenFee;
    serviceFeeReceiver = _serviceFeeReceiver;
  }

  function createStandardToken(
    string memory _tokenName,
    string memory _tokenSym,
    uint8 _decimals,
    uint256 _totalSupply
  ) public payable {
    require(msg.value >= createTokenFee, "Not enough Fee");
    StandardToken newToken = new StandardToken(_tokenName, _tokenSym, _decimals, _totalSupply, msg.sender);
    if (serviceFeeReceiver != address(this) && serviceFeeReceiver != address(0)) {
      payable(serviceFeeReceiver).transfer(msg.value);
    }
    customStandardTokens.push(newToken);
    customStandardTokensMade += 1;
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
