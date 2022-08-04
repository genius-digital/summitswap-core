pragma solidity 0.8.6;

struct PresaleFeeInfo {
  address paymentToken; // BNB/BUSD/ | address(0) native coin
  uint256 feePaymentToken; // BNB/BUSD/...
  uint256 feePresaleToken; // presaleToken
  uint256 feeEmergencyWithdraw;
}
