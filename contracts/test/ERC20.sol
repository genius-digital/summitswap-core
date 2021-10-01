pragma solidity =0.5.16;

import '../SummitswapERC20.sol';

contract ERC20 is SummitswapERC20 {
    constructor(uint _totalSupply) public {
        _mint(msg.sender, _totalSupply);
    }
}
