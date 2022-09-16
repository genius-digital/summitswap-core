// SPDX-License-Identifier: UNLICENSED
// Developed by: dxsoftware.net

pragma solidity 0.8.6;

import "../../structs/KickstarterInfo.sol";

interface ISummitKickstarter {
  function isAdmin(address _address) external view returns (bool);

  function contributions(address _walletAddress) external view returns (uint256);

  function contributorIndexes(address _walletAddress) external view returns (uint256);

  function contributors() external view returns (address[] memory);

  function factory() external view returns (address);

  function kickstarter() external view returns (Kickstarter calldata);

  function approvalStatus() external view returns (ApprovalStatus);

  function totalContribution() external view returns (uint256);

  function percentageFeeAmount() external view returns (uint256);

  function fixFeeAmount() external view returns (uint256);

  function rejectedReason() external view returns (string memory);

  function getContributors() external view returns (address[] memory);

  function contribute(uint256 _amount) external payable;

  function setTitle(string memory _title) external;

  function setCreator(string memory _creator) external;

  function setImageUrl(string memory _imageUrl) external;

  function setProjectDescription(string memory _projectDescription) external;

  function setRewardDescription(string memory _rewardDescription) external;

  function setMinContribution(uint256 _minContribution) external;

  function setProjectGoals(uint256 _projectGoals) external;

  function setRewardDistributionTimestamp(uint256 _rewardDistributionTimestamp) external;

  function setStartTimestamp(uint256 _startTimestamp) external;

  function setEndTimestamp(uint256 _endTimestamp) external;

  function configProjectInfo(Kickstarter calldata _kickstarter) external;

  function withdraw(uint256 _amount, address _receiver) external;

  function configProjectInfo(
    Kickstarter calldata _kickstarter,
    ApprovalStatus _approvalStatus,
    uint256 _percentageFeeAmount,
    uint256 _fixFeeAmount
  ) external;

  function approve(uint256 _percentageFeeAmount, uint256 _fixFeeAmount) external;

  function reject(string memory _rejectedReason) external;

  function setApprovalStatus(ApprovalStatus _status) external;

  function setAdmins(address[] calldata _walletsAddress, bool _isAdmin) external;

  function setPercentageFeeAmount(uint256 _percentageFeeAmount) external;

  function setFixFeeAmount(uint256 _fixFeeAmount) external;
}
