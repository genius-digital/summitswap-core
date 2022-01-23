pragma solidity =0.6.6;

import "./libraries/SummitswapLibrary.sol";

import "./interfaces/IRouter.sol";
import "./interfaces/ISummitswapRouter02.sol";
import "./interfaces/ISummitReferral.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/ISummitswapFactory.sol";
import "./interfaces/ISummitswapPair.sol";

import "./libraries/SafeMath2.sol";

import "./shared/Ownable.sol";

contract SummitswapMiddleman is Ownable {
  using SafeMath for uint256;

  address public summitReferral;

  modifier ensure(uint256 deadline) {
    require(deadline >= block.timestamp, "SummitswapMiddleman: EXPIRED");
    _;
  }

  function setSummitReferral(address _summitReferral) public onlyOwner {
    summitReferral = _summitReferral;
  }

  // **** Pancake SWAP ****
  // requires the initial amount to have already been sent to the first pair
  function _swap(uint256[] memory amounts, address[] memory path) internal virtual {
    for (uint256 i; i < path.length - 1; i++) {
      (address input, address output) = (path[i], path[i + 1]);
      uint256 amountOut = amounts[i + 1];
      if (summitReferral != address(0)) {
        ISummitReferral(summitReferral).swap(msg.sender, input, output, amounts[i], amountOut);
      }
    }
  }

  function swapExactTokensForTokens(
    address factory,
    uint256 amountIn,
    uint256 amountOutMin,
    address[] calldata path,
    address to,
    uint256 deadline
  ) external returns (uint256[] memory amounts) {
    amounts = IRouter(factory).swapExactTokensForTokens(amountIn, amountOutMin, path, to, deadline);
    _swap(amounts, path);
  }

  function swapTokensForExactTokens(
    address factory,
    uint256 amountOut,
    uint256 amountInMax,
    address[] calldata path,
    address to,
    uint256 deadline
  ) external virtual returns (uint256[] memory amounts) {
    amounts = IRouter(factory).swapTokensForExactTokens(amountOut, amountInMax, path, to, deadline);
    _swap(amounts, path);
  }

  function swapExactETHForTokens(
    address factory,
    uint256 amountOutMin,
    address[] calldata path,
    address to,
    uint256 deadline
  ) external payable virtual returns (uint256[] memory amounts) {
    amounts = IRouter(factory).swapExactETHForTokens{value: msg.value}(amountOutMin, path, to, deadline);
    _swap(amounts, path);
  }

  function swapTokensForExactETH(
    address factory,
    uint256 amountOut,
    uint256 amountInMax,
    address[] calldata path,
    address to,
    uint256 deadline
  ) external virtual returns (uint256[] memory amounts) {
    amounts = IRouter(factory).swapTokensForExactTokens(amountOut, amountInMax, path, to, deadline);
    _swap(amounts, path);
  }

  function swapExactTokensForETH(
    address factory,
    uint256 amountIn,
    uint256 amountOutMin,
    address[] calldata path,
    address to,
    uint256 deadline
  ) external virtual returns (uint256[] memory amounts) {
    amounts = IRouter(factory).swapExactTokensForETH(amountIn, amountOutMin, path, to, deadline);
    _swap(amounts, path);
  }

  function swapETHForExactTokens(
    address factory,
    uint256 amountOut,
    address[] calldata path,
    address to,
    uint256 deadline
  ) external payable virtual returns (uint256[] memory amounts) {
    amounts = IRouter(factory).swapETHForExactTokens{value: msg.value}(amountOut, path, to, deadline);
    _swap(amounts, path);
  }

  // **** SWAP (supporting fee-on-transfer tokens) ****
  // requires the initial amount to have already been sent to the first pair
  function _swapSupportingFeeOnTransferTokens(address factory, address[] memory path) internal virtual {
    for (uint256 i; i < path.length - 1; i++) {
      (address input, address output) = (path[i], path[i + 1]);
      (address token0, ) = SummitswapLibrary.sortTokens(input, output);
      address pancakeFactory = IRouter(factory).factory();
      address pairAddress = ISummitswapFactory(pancakeFactory).getPair(input, output);
      ISummitswapPair pair = ISummitswapPair(pairAddress);
      uint256 amountInput;
      uint256 amountOutput;
      {
        // scope to avoid stack too deep errors
        (uint256 reserve0, uint256 reserve1, ) = pair.getReserves();
        (uint256 reserveInput, uint256 reserveOutput) = input == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
        amountInput = IERC20(input).balanceOf(address(pair)).sub(reserveInput);
        amountOutput = IRouter(factory).getAmountOut(amountInput, reserveInput, reserveOutput);
      }
      if (summitReferral != address(0)) {
        ISummitReferral(summitReferral).swap(msg.sender, input, output, amountInput, amountOutput);
      }
    }
  }

  function swapExactTokensForTokensSupportingFeeOnTransferTokens(
    address factory,
    uint256 amountIn,
    uint256 amountOutMin,
    address[] calldata path,
    address to,
    uint256 deadline
  ) external virtual {
    IRouter(factory).swapExactTokensForTokensSupportingFeeOnTransferTokens(amountIn, amountOutMin, path, to, deadline);
    _swapSupportingFeeOnTransferTokens(factory, path);
  }

  function swapExactETHForTokensSupportingFeeOnTransferTokens(
    address factory,
    uint256 amountOutMin,
    address[] calldata path,
    address to,
    uint256 deadline
  ) external payable virtual {
    IRouter(factory).swapExactETHForTokensSupportingFeeOnTransferTokens{value: msg.value}(
      amountOutMin,
      path,
      to,
      deadline
    );
    _swapSupportingFeeOnTransferTokens(factory, path);
  }

  function swapExactTokensForETHSupportingFeeOnTransferTokens(
    address factory,
    uint256 amountIn,
    uint256 amountOutMin,
    address[] calldata path,
    address to,
    uint256 deadline
  ) external virtual {
    IRouter(factory).swapExactTokensForETHSupportingFeeOnTransferTokens(amountIn, amountOutMin, path, to, deadline);
    _swapSupportingFeeOnTransferTokens(factory, path);
  }

  // **** LIBRARY FUNCTIONS ****
  function quote(
    uint256 amountA,
    uint256 reserveA,
    uint256 reserveB
  ) public pure virtual returns (uint256 amountB) {
    return SummitswapLibrary.quote(amountA, reserveA, reserveB);
  }

  function getAmountOut(
    uint256 amountIn,
    uint256 reserveIn,
    uint256 reserveOut
  ) public pure virtual returns (uint256 amountOut) {
    return SummitswapLibrary.getAmountOut(amountIn, reserveIn, reserveOut);
  }

  function getAmountIn(
    uint256 amountOut,
    uint256 reserveIn,
    uint256 reserveOut
  ) public pure virtual returns (uint256 amountIn) {
    return SummitswapLibrary.getAmountIn(amountOut, reserveIn, reserveOut);
  }

  function getAmountsOut(
    address factory,
    uint256 amountIn,
    address[] memory path
  ) public view virtual returns (uint256[] memory amounts) {
    return SummitswapLibrary.getAmountsOut(factory, amountIn, path);
  }

  function getAmountsIn(
    address factory,
    uint256 amountOut,
    address[] memory path
  ) public view virtual returns (uint256[] memory amounts) {
    return SummitswapLibrary.getAmountsIn(factory, amountOut, path);
  }
}
