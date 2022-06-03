//SPDX-License-Identifier: MIT
pragma solidity ^0.8.1;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../tokens/SummitstudiosStandardToken.sol";

// 0xBb40eACCecDc0838f70588E87485EC1587116904 Factory deployment - 97

contract StandardFactory is Ownable {
  StandardToken[] public customStandardTokens;
  uint256 public customStandardTokensMade = 0;

  address public serviceFeeReceiver;
  uint256 public balance;

  constructor(address _serviceFeeReceiver) Ownable() {
    serviceFeeReceiver = _serviceFeeReceiver;
    transferOwnership(msg.sender);
  }

  function createStandardToken(
    string memory _tokenName,
    string memory _tokenSym,
    uint8 _decimals,
    uint256 _totalSupply
  ) public payable {
    require(msg.value >= 1 * 10**16, "Not enough eth");
    StandardToken newToken = new StandardToken(_tokenName, _tokenSym, _decimals, _totalSupply, msg.sender);
    if (serviceFeeReceiver == address(this)) {
      balance += msg.value;
    } else {
      payable(serviceFeeReceiver).transfer(msg.value);
    }
    customStandardTokens.push(newToken);
    customStandardTokensMade += 1;
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
