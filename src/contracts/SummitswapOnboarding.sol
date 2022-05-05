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
  IERC20 public userToken;
  IERC20 public lpToken;
  ISummitswapFactory public summitswapFactory;

  address public kodaAddress = 0x063646d9C4eCB1c341bECdEE162958f072C43561;
  address public summitReferralAddress = 0xDF8b4F4414aeB9598000666eF703E18A9aFfF47b;
  address[] public pathForBnbToKoda = [
    0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd,
    0x063646d9C4eCB1c341bECdEE162958f072C43561
  ]; // bnb to koda
  address[] public pathForUserToken;

  function onboardToken(
    uint256 bnbAmount,
    uint256 deadline, // now + 20 minutes
    uint256 amountOutMin,
    address userTokenAddress,
    uint256 kodaAmountDesired,
    uint256 userTokenAmountDesired,
    uint256 kodaAmountMin,
    uint256 userTokenAmountMin,
    uint256 amountForLockTokens,
    uint256 unlockTime,
    address payable withdrawer,
    uint256 amountForTransfer
  ) public {
    uint256 _deadline = deadline;
    summitswapRouter02.swapExactETHForTokens{value: bnbAmount}(amountOutMin, pathForBnbToKoda, msg.sender, _deadline);
    summitswapRouter02.addLiquidity(
      kodaAddress,
      userTokenAddress,
      kodaAmountDesired,
      userTokenAmountDesired,
      kodaAmountMin,
      userTokenAmountMin,
      address(this),
      _deadline
    );
    address pairAddress = summitswapFactory.getPair(kodaAddress, userTokenAddress);
    summitswapLocker.lockTokens(pairAddress, amountForLockTokens, unlockTime, withdrawer, 2);
    userToken.transfer(summitReferralAddress, amountForTransfer);
  }
}
