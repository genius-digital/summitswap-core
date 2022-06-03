//SPDX-License-Identifier: MIT
pragma solidity ^0.8.1;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../tokens/SummitstudiosBuybackBabyToken.sol";

// 0xaB5484aA51467E149744cEF8E4daf05EDf1B537B Factory deployment - 97

contract BuyBackBabyTokenFactory is Ownable {
  BuybackBabyToken[] public customBuybackBabyTokens;
  uint256 public customBuybackBabyTokensMade = 0;

  address public serviceFeeReceiver;
  uint256 public balance;

  constructor(address _serviceFeeReceiver) Ownable() {
    serviceFeeReceiver = _serviceFeeReceiver;
    transferOwnership(msg.sender);
  }

  function createBuybackBabyToken(
    string memory _tokenName,
    string memory _tokenSym,
    uint256 _totalSupply,
    address rewardToken_,
    address router_,
    uint256[5] memory feeSettings_
  ) public payable {
    require(msg.value >= 1 * 10**16, "Not enough eth");
    BuybackBabyToken newToken = new BuybackBabyToken(
      _tokenName,
      _tokenSym,
      _totalSupply,
      rewardToken_,
      router_,
      feeSettings_,
      payable(msg.sender)
    );
    if (serviceFeeReceiver == address(this)) {
      balance += msg.value;
    } else {
      payable(serviceFeeReceiver).transfer(msg.value);
    }
    customBuybackBabyTokens.push(newToken);
    customBuybackBabyTokensMade += 1;
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
