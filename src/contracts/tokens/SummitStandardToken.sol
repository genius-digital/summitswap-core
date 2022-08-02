//SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract StandardToken is ERC20, Ownable {
  uint8 internal tokenDecimals = 18;

  constructor(
    string memory _tokenName,
    string memory _tokenSym,
    uint8 _decimals,
    uint256 _total_supply,
    address _owner
  ) ERC20(_tokenName, _tokenSym) {
    _mint(_owner, _total_supply);
    tokenDecimals = _decimals;
    transferOwnership(_owner);
  }

  function decimals() public view virtual override returns (uint8) {
    return tokenDecimals;
  }
}
