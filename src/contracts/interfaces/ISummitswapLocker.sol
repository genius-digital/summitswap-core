pragma solidity 0.7.6;

interface ISummitswapLocker {
  function lockTokens(
    address lpToken,
    uint256 amount,
    uint256 unlockTime,
    address payable withdrawer,
    uint8 feePaymentMode
  ) external view returns (uint256 lockId);
}
