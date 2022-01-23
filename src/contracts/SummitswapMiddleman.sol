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

  // **** SWAP ****
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
    address router,
    uint256 amountIn,
    uint256 amountOutMin,
    address[] calldata path,
    address to,
    uint256 deadline
  ) external returns (uint256[] memory amounts) {
    amounts = IRouter(router).swapExactTokensForTokens(amountIn, amountOutMin, path, to, deadline);
    _swap(amounts, path);
  }

  function swapTokensForExactTokens(
    address router,
    uint256 amountOut,
    uint256 amountInMax,
    address[] calldata path,
    address to,
    uint256 deadline
  ) external virtual returns (uint256[] memory amounts) {
    amounts = IRouter(router).swapTokensForExactTokens(amountOut, amountInMax, path, to, deadline);
    _swap(amounts, path);
  }

  function swapExactETHForTokens(
    address router,
    uint256 amountOutMin,
    address[] calldata path,
    address to,
    uint256 deadline
  ) external payable virtual returns (uint256[] memory amounts) {
    amounts = IRouter(router).swapExactETHForTokens{value: msg.value}(amountOutMin, path, to, deadline);
    _swap(amounts, path);
  }

  function swapTokensForExactETH(
    address router,
    uint256 amountOut,
    uint256 amountInMax,
    address[] calldata path,
    address to,
    uint256 deadline
  ) external virtual returns (uint256[] memory amounts) {
    amounts = IRouter(router).swapTokensForExactTokens(amountOut, amountInMax, path, to, deadline);
    _swap(amounts, path);
  }

  function swapExactTokensForETH(
    address router,
    uint256 amountIn,
    uint256 amountOutMin,
    address[] calldata path,
    address to,
    uint256 deadline
  ) external virtual returns (uint256[] memory amounts) {
    amounts = IRouter(router).swapExactTokensForETH(amountIn, amountOutMin, path, to, deadline);
    _swap(amounts, path);
  }

  function swapETHForExactTokens(
    address router,
    uint256 amountOut,
    address[] calldata path,
    address to,
    uint256 deadline
  ) external payable virtual returns (uint256[] memory amounts) {
    amounts = IRouter(router).swapETHForExactTokens{value: msg.value}(amountOut, path, to, deadline);
    _swap(amounts, path);
  }

  // **** SWAP (supporting fee-on-transfer tokens) ****
  // requires the initial amount to have already been sent to the first pair
  function _swapSupportingFeeOnTransferTokens(address router, address[] memory path) internal virtual {
    for (uint256 i; i < path.length - 1; i++) {
      (address input, address output) = (path[i], path[i + 1]);
      (address token0, ) = SummitswapLibrary.sortTokens(input, output);
      address factory = IRouter(router).factory();
      address pairAddress = ISummitswapFactory(factory).getPair(input, output);
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
    address router,
    uint256 amountIn,
    uint256 amountOutMin,
    address[] calldata path,
    address to,
    uint256 deadline
  ) external virtual {
    IRouter(router).swapExactTokensForTokensSupportingFeeOnTransferTokens(amountIn, amountOutMin, path, to, deadline);
    _swapSupportingFeeOnTransferTokens(router, path);
  }

  function swapExactETHForTokensSupportingFeeOnTransferTokens(
    address router,
    uint256 amountOutMin,
    address[] calldata path,
    address to,
    uint256 deadline
  ) external payable virtual {
    IRouter(router).swapExactETHForTokensSupportingFeeOnTransferTokens{value: msg.value}(
      amountOutMin,
      path,
      to,
      deadline
    );
    _swapSupportingFeeOnTransferTokens(router, path);
  }

  function swapExactTokensForETHSupportingFeeOnTransferTokens(
    address router,
    uint256 amountIn,
    uint256 amountOutMin,
    address[] calldata path,
    address to,
    uint256 deadline
  ) external virtual {
    IRouter(router).swapExactTokensForETHSupportingFeeOnTransferTokens(amountIn, amountOutMin, path, to, deadline);
    _swapSupportingFeeOnTransferTokens(router, path);
  }
}
