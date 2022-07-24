pragma solidity 0.7.6;

struct FeeInfo {
  address raisedTokenAddress; // BNB/BUSD/..
  uint256 feeRaisedToken; // BNB/BUSD/...
  uint256 feePresaleToken; // presaleToken
  uint256 emergencyWithdrawFee;
}
