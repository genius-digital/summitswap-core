pragma solidity =0.6.6;

import "../shared/ERC20.sol";

contract DummyToken is ERC20 {
  address public owner;

  constructor() public ERC20("Dummy Coin", "DCOIN") {
    _mint(msg.sender, 1000 * 10**18);
    owner = msg.sender;
  }
}
