//SPDX-License-Identifier: MIT
pragma solidity ^0.8.1;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../tokens/SummitstudiosBabyToken.sol";

// 0x87064D365710C0C025628ed1294548FEA4f5AD67 dividendTracker
// 0x0C8077A0807AA145e50FF0b93d29C9b249351673 Factory deployment - 97

contract BabyTokenFactory is Ownable {
  BabyToken[] public customBabyTokens;
  uint256 public customBabyTokensMade = 0;

  address public serviceFeeReceiver;
  uint256 public balance;

  constructor(address _serviceFeeReceiver) Ownable() {
    serviceFeeReceiver = _serviceFeeReceiver;
    transferOwnership(msg.sender);
  }

  function createBabyToken(
    string memory _tokenName,
    string memory _tokenSym,
    uint256 _totalSupply,
    address[4] memory addrs, // reward, router, marketing wallet, dividendTracker
    uint256[3] memory feeSettings, // rewards, liquidity, marketing
    uint256 _minimumTokenBalanceForDividends
  ) public payable {
    require(msg.value >= 1 * 10**16, "Not enough eth");
    BabyToken newToken = new BabyToken(
      _tokenName,
      _tokenSym,
      _totalSupply,
      addrs,
      feeSettings,
      _minimumTokenBalanceForDividends,
      msg.sender
    );
    if (serviceFeeReceiver == address(this)) {
      balance += msg.value;
    } else {
      payable(serviceFeeReceiver).transfer(msg.value);
    }
    customBabyTokens.push(newToken);
    customBabyTokensMade += 1;
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
