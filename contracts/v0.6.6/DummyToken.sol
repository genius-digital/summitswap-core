// SPDX-License-Identifier: MIT

pragma solidity =0.6.6;

import '../libraries/ERC20.sol';

contract DummyToken is ERC20 {
    address public owner;
    
    constructor() ERC20("Dummy Coin", "DCOIN") public {
        _mint(msg.sender, 1000 * 10 ** 18);
        owner = msg.sender;
    }
}