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

  address public immutable WETH;
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
    address _WETH,
    address _summitswapFactory,
    address _summitswapRouter,
    address _summitReferral
  ) public {
    WETH = _WETH;
    summitswapFactory = _summitswapFactory;
    summitswapRouter = _summitswapRouter;
    summitReferral = _summitReferral;
  }

  function setSummitReferral(address _summitReferral) public onlyOwner {
    summitReferral = _summitReferral;
  }

  receive() external payable {
    assert(msg.sender == WETH); // only accept ETH via fallback from the WETH contract
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
      if (summitReferral != address(0)) {
        ISummitReferral(summitReferral).swap(msg.sender, input, output, amounts[i], amountOut);
      }
      address to = i < path.length - 2 ? SummitswapLibrary.pairFor(factory, output, path[i + 2]) : _to;
      ISummitswapPair(SummitswapLibrary.pairFor(factory, input, output)).swap(amount0Out, amount1Out, to, new bytes(0));
    }
  }

  function swapExactTokensForTokens(
    address factory,
    uint256 amountIn,
    uint256 amountOutMin,
    address[] calldata path,
    address to,
    uint256 deadline
  ) external virtual ensure(deadline) onlyNoLiquidityExists(factory, path) returns (uint256[] memory amounts) {
    amounts = SummitswapLibrary.getAmountsOut(factory, amountIn, path);
    require(amounts[amounts.length - 1] >= amountOutMin, "SummitswapRouter02: INSUFFICIENT_OUTPUT_AMOUNT");
    TransferHelper.safeTransferFrom(
      path[0],
      msg.sender,
      SummitswapLibrary.pairFor(factory, path[0], path[1]),
      amounts[0]
    );
    _swap(factory, amounts, path, to);
  }

  function swapTokensForExactTokens(
    address factory,
    uint256 amountOut,
    uint256 amountInMax,
    address[] calldata path,
    address to,
    uint256 deadline
  ) external virtual ensure(deadline) onlyNoLiquidityExists(factory, path) returns (uint256[] memory amounts) {
    amounts = SummitswapLibrary.getAmountsIn(factory, amountOut, path);
    require(amounts[0] <= amountInMax, "SummitswapRouter02: EXCESSIVE_INPUT_AMOUNT");
    TransferHelper.safeTransferFrom(
      path[0],
      msg.sender,
      SummitswapLibrary.pairFor(factory, path[0], path[1]),
      amounts[0]
    );
    _swap(factory, amounts, path, to);
  }

  function swapExactETHForTokens(
    address factory,
    uint256 amountOutMin,
    address[] calldata path,
    address to,
    uint256 deadline
  ) external payable virtual ensure(deadline) onlyNoLiquidityExists(factory, path) returns (uint256[] memory amounts) {
    require(path[0] == WETH, "SummitswapRouter02: INVALID_PATH");
    amounts = SummitswapLibrary.getAmountsOut(factory, msg.value, path);
    require(amounts[amounts.length - 1] >= amountOutMin, "SummitswapRouter02: INSUFFICIENT_OUTPUT_AMOUNT");
    IWETH(WETH).deposit{value: amounts[0]}();
    assert(IWETH(WETH).transfer(SummitswapLibrary.pairFor(factory, path[0], path[1]), amounts[0]));
    _swap(factory, amounts, path, to);
  }

  function swapTokensForExactETH(
    address factory,
    uint256 amountOut,
    uint256 amountInMax,
    address[] calldata path,
    address to,
    uint256 deadline
  ) external virtual ensure(deadline) onlyNoLiquidityExists(factory, path) returns (uint256[] memory amounts) {
    require(path[path.length - 1] == WETH, "SummitswapRouter02: INVALID_PATH");
    amounts = SummitswapLibrary.getAmountsIn(factory, amountOut, path);
    require(amounts[0] <= amountInMax, "SummitswapRouter02: EXCESSIVE_INPUT_AMOUNT");
    TransferHelper.safeTransferFrom(
      path[0],
      msg.sender,
      SummitswapLibrary.pairFor(factory, path[0], path[1]),
      amounts[0]
    );
    _swap(factory, amounts, path, address(this));
    IWETH(WETH).withdraw(amounts[amounts.length - 1]);
    TransferHelper.safeTransferBNB(to, amounts[amounts.length - 1]);
  }

  function swapExactTokensForETH(
    address factory,
    uint256 amountIn,
    uint256 amountOutMin,
    address[] calldata path,
    address to,
    uint256 deadline
  ) external virtual ensure(deadline) onlyNoLiquidityExists(factory, path) returns (uint256[] memory amounts) {
    require(path[path.length - 1] == WETH, "SummitswapRouter02: INVALID_PATH");
    amounts = SummitswapLibrary.getAmountsOut(factory, amountIn, path);
    require(amounts[amounts.length - 1] >= amountOutMin, "SummitswapRouter02: INSUFFICIENT_OUTPUT_AMOUNT");
    TransferHelper.safeTransferFrom(
      path[0],
      msg.sender,
      SummitswapLibrary.pairFor(factory, path[0], path[1]),
      amounts[0]
    );
    _swap(factory, amounts, path, address(this));
    IWETH(WETH).withdraw(amounts[amounts.length - 1]);
    TransferHelper.safeTransferBNB(to, amounts[amounts.length - 1]);
  }

  function swapETHForExactTokens(
    address factory,
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

  // **** SWAP (supporting fee-on-transfer tokens) ****
  function _swapSupportingFeeOnTransferTokens(
    address factory,
    address[] memory path,
    address _to
  ) internal virtual {
    for (uint256 i; i < path.length - 1; i++) {
      (address input, address output) = (path[i], path[i + 1]);
      (address token0, ) = SummitswapLibrary.sortTokens(input, output);
      ISummitswapPair pair = ISummitswapPair(SummitswapLibrary.pairFor(factory, input, output));
      uint256 amountInput;
      uint256 amountOutput;
      {
        // scope to avoid stack too deep errors
        (uint256 reserve0, uint256 reserve1, ) = pair.getReserves();
        (uint256 reserveInput, uint256 reserveOutput) = input == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
        amountInput = IERC20(input).balanceOf(address(pair)).sub(reserveInput);
        amountOutput = SummitswapLibrary.getAmountOut(amountInput, reserveInput, reserveOutput);
      }
      if (summitReferral != address(0)) {
        ISummitReferral(summitReferral).swap(msg.sender, input, output, amountInput, amountOutput);
      }
      (uint256 amount0Out, uint256 amount1Out) = input == token0
        ? (uint256(0), amountOutput)
        : (amountOutput, uint256(0));
      address to = i < path.length - 2 ? SummitswapLibrary.pairFor(factory, output, path[i + 2]) : _to;
      pair.swap(amount0Out, amount1Out, to, new bytes(0));
    }
  }

  function swapExactTokensForTokensSupportingFeeOnTransferTokens(
    address factory,
    uint256 amountIn,
    uint256 amountOutMin,
    address[] calldata path,
    address to,
    uint256 deadline
  ) external virtual ensure(deadline) {
    TransferHelper.safeTransferFrom(
      path[0],
      msg.sender,
      SummitswapLibrary.pairFor(factory, path[0], path[1]),
      amountIn
    );
    uint256 balanceBefore = IERC20(path[path.length - 1]).balanceOf(to);
    _swapSupportingFeeOnTransferTokens(factory, path, to);
    require(
      IERC20(path[path.length - 1]).balanceOf(to).sub(balanceBefore) >= amountOutMin,
      "SummitswapRouter02: INSUFFICIENT_OUTPUT_AMOUNT"
    );
  }

  function swapExactETHForTokensSupportingFeeOnTransferTokens(
    address factory,
    uint256 amountOutMin,
    address[] calldata path,
    address to,
    uint256 deadline
  ) external payable virtual ensure(deadline) {
    require(path[0] == WETH, "SummitswapRouter02: INVALID_PATH");
    uint256 amountIn = msg.value;
    IWETH(WETH).deposit{value: amountIn}();
    assert(IWETH(WETH).transfer(SummitswapLibrary.pairFor(factory, path[0], path[1]), amountIn));
    uint256 balanceBefore = IERC20(path[path.length - 1]).balanceOf(to);
    _swapSupportingFeeOnTransferTokens(factory, path, to);
    require(
      IERC20(path[path.length - 1]).balanceOf(to).sub(balanceBefore) >= amountOutMin,
      "SummitswapRouter02: INSUFFICIENT_OUTPUT_AMOUNT"
    );
  }

  function swapExactTokensForETHSupportingFeeOnTransferTokens(
    address factory,
    uint256 amountIn,
    uint256 amountOutMin,
    address[] calldata path,
    address to,
    uint256 deadline
  ) external virtual ensure(deadline) {
    require(path[path.length - 1] == WETH, "SummitswapRouter02: INVALID_PATH");
    TransferHelper.safeTransferFrom(
      path[0],
      msg.sender,
      SummitswapLibrary.pairFor(factory, path[0], path[1]),
      amountIn
    );
    _swapSupportingFeeOnTransferTokens(factory, path, address(this));
    uint256 amountOut = IERC20(WETH).balanceOf(address(this));
    require(amountOut >= amountOutMin, "SummitswapRouter02: INSUFFICIENT_OUTPUT_AMOUNT");
    IWETH(WETH).withdraw(amountOut);
    TransferHelper.safeTransferBNB(to, amountOut);
  }
}
