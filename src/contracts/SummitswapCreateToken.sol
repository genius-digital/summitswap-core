//SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CustomToken is ERC20, Ownable {
  uint8 internal tokenDecimals = 18;
  uint256 public VERSION = 1;

  constructor(
    string memory _tokenName,
    string memory _tokenSym,
    uint8 _decimals,
    uint256 _total_supply,
    address _owner
  ) ERC20(_tokenName, _tokenSym) Ownable() {
    _mint(_owner, _total_supply);
    tokenDecimals = _decimals;
    transferOwnership(_owner);
  }

  function decimals() public view virtual override returns (uint8) {
    return tokenDecimals;
  }
}

contract TokenFactory is Ownable {
  CustomToken[] public customTokens;
  uint256 public tokensMade = 0;
  uint256 public balance;

  constructor() Ownable() {
    transferOwnership(msg.sender);
  }

  function create(
    string memory _tokenName,
    string memory _tokenSym,
    uint8 _decimals,
    uint256 _total_supply,
    address _serviceFeeReceiver,
    uint256 _serviceFee
  ) public payable {
    // require(msg.value >= 1 * 10**16);
    CustomToken newCustomToken = new CustomToken(_tokenName, _tokenSym, _decimals, _total_supply, msg.sender);
    payable(_serviceFeeReceiver).transfer(_serviceFee);
    customTokens.push(newCustomToken);
    tokensMade += 1;
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
