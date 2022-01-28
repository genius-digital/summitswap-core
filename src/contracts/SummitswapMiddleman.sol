pragma solidity =0.6.6;

import "./libraries/SummitswapLibrary.sol";
import "./libraries/TransferHelper.sol";

import "./interfaces/IRouter.sol";
import "./interfaces/ISummitswapRouter02.sol";
import "./interfaces/ISummitReferral.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/ISummitswapFactory.sol";
import "./interfaces/ISummitswapPair.sol";
import "./interfaces/IWETH.sol";

import "./libraries/SafeMath2.sol";

import "./shared/Ownable.sol";

contract SummitswapMiddleman is Ownable {
  using SafeMath for uint256;

  address public summitswapFactory;
  address public summitswapRouter;
  address public summitReferral;

  modifier ensure(uint256 deadline) {
    require(deadline >= block.timestamp, "SummitswapRouter02: EXPIRED");
    _;
  }

  modifier onlyNoLiquidityExists(address factory, address[] memory path) {
    uint256 pairCount;
    for (uint256 i; i < path.length - 1; i++) {
      address pairAddress = ISummitswapFactory(summitswapFactory).getPair(path[i], path[i + 1]);
      if (pairAddress == address(0)) break;
      pairCount += 1;
    }
    require(factory == summitswapFactory || pairCount != path.length - 1, "Should use Summitswap for swapping");
    _;
  }

  constructor(
    address _summitswapFactory,
    address _summitswapRouter,
    address _summitReferral
  ) public {
    summitswapFactory = _summitswapFactory;
    summitswapRouter = _summitswapRouter;
    summitReferral = _summitReferral;
  }

  function setSummitReferral(address _summitReferral) public onlyOwner {
    summitReferral = _summitReferral;
  }

  // **** SWAP ****
  function _swap(
    address factory,
    uint256[] memory amounts,
    address[] memory path,
    address _to
  ) internal virtual {
    for (uint256 i; i < path.length - 1; i++) {
      (address input, address output) = (path[i], path[i + 1]);
      (address token0, ) = SummitswapLibrary.sortTokens(input, output);
      uint256 amountOut = amounts[i + 1];
      (uint256 amount0Out, uint256 amount1Out) = input == token0 ? (uint256(0), amountOut) : (amountOut, uint256(0));
      address to = i < path.length - 2 ? SummitswapLibrary.pairFor(factory, output, path[i + 2]) : _to;
      ISummitswapPair(SummitswapLibrary.pairFor(factory, input, output)).swap(amount0Out, amount1Out, to, new bytes(0));
    }
  }

  function swapETHForExactTokens(
    address factory,
    address WETH,
    uint256 amountOut,
    address[] calldata path,
    address to,
    uint256 deadline
  ) external payable virtual ensure(deadline) onlyNoLiquidityExists(factory, path) returns (uint256[] memory amounts) {
    require(path[0] == WETH, "SummitswapRouter02: INVALID_PATH");
    amounts = SummitswapLibrary.getAmountsIn(factory, amountOut, path);
    require(amounts[0] <= msg.value, "SummitswapRouter02: EXCESSIVE_INPUT_AMOUNT");
    IWETH(WETH).deposit{value: amounts[0]}();
    assert(IWETH(WETH).transfer(SummitswapLibrary.pairFor(factory, path[0], path[1]), amounts[0]));
    _swap(factory, amounts, path, to);
    // refund dust eth, if any
    if (msg.value > amounts[0]) TransferHelper.safeTransferBNB(msg.sender, msg.value - amounts[0]);
  }
}
