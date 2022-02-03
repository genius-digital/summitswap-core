pragma solidity =0.6.6;

interface ISummitReferral {
  function swap(
    address account,
    address input,
    address output,
    uint256 amountInput,
    uint256 amountOutput
  ) external;

  function recordReferral(address _outputToken, address _referrer) external;
}
