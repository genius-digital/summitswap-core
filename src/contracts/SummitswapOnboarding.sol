// SPDX-License-Identifier: MIT
// Developed by: dxsoftware.net

pragma solidity 0.7.6;

import "./interfaces/ISummitswapRouter02.sol"; // for swap, for add liquidity
import "./interfaces/ISummitswapLocker.sol"; // for locking (lockTokens)
import "./interfaces/ISummitswapFactory.sol";
import "./interfaces/IERC20.sol"; // for token functions

contract SummitswapOnboarding {
  ISummitswapRouter02 public summitswapRouter02;
  ISummitswapLocker public summitswapLocker;
  ISummitswapFactory public summitswapFactory;

  address public kodaAddress;
  address public summitswapReferralAddress;
  address[] public pathForBnbToKoda;

  constructor(
    ISummitswapRouter02 _summitswapRouter02,
    ISummitswapLocker _summitswapLocker,
    ISummitswapFactory _summitswapFactory,
    address _bnbAddress,
    address _kodaAddress,
    address _summitswapReferralAddress
  ) public {
    summitswapRouter02 = _summitswapRouter02;
    summitswapLocker = _summitswapLocker;
    summitswapFactory = _summitswapFactory;
    kodaAddress = _kodaAddress;
    summitswapReferralAddress = _summitswapReferralAddress;
    pathForBnbToKoda = [_bnbAddress, _kodaAddress];
  }

  function onboardToken(
    uint256 bnbAmount,
    uint256 deadline, // now + 20 minutes
    uint256 amountOutMin,
    address userTokenAddress,
    uint256 kodaAmountDesired,
    uint256 userTokenAmountDesired,
    uint256 amountForLockTokens,
    uint256 unlockTime,
    address payable withdrawer,
    uint256 amountForTransfer
  ) public {
    uint256 _deadline = deadline;
    IERC20 kodaToken = IERC20(kodaAddress);
    IERC20 userToken = IERC20(userTokenAddress);
    summitswapRouter02.swapExactETHForTokens{value: bnbAmount}(amountOutMin, pathForBnbToKoda, msg.sender, _deadline);
    kodaToken.approve(address(summitswapRouter02), 2**256 - 1);
    userToken.approve(address(summitswapRouter02), 2**256 - 1);
    summitswapRouter02.addLiquidity(
      kodaAddress,
      userTokenAddress,
      kodaAmountDesired,
      userTokenAmountDesired,
      0,
      0,
      address(this),
      _deadline
    );
    address pairAddress = summitswapFactory.getPair(kodaAddress, userTokenAddress);
    summitswapLocker.lockTokens(pairAddress, amountForLockTokens, unlockTime, withdrawer, 2);
    userToken.transfer(summitswapReferralAddress, amountForTransfer);
  }
}
