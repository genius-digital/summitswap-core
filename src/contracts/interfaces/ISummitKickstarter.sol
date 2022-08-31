// SPDX-License-Identifier: UNLICENSED
// Developed by: dxsoftware.net

pragma solidity 0.8.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

enum Status {
  PENDING,
  APPROVED,
  REJECTED
}

struct Kickstarter {
  IERC20 paymentToken;
  address owner;
  string title;
  string creator;
  string imageUrl;
  string projectDescription;
  string rewardDescription;
  uint256 minContribution;
  uint256 projectGoals;
  uint256 rewardDistributionTimestamp;
  uint256 startTimestamp;
  uint256 endTimestamp;
}

interface ISummitKickstarter {
  function factory() external view returns (address);

  function contributions(address _walletAddress) external returns (uint256);

  function contributorIndexes(address _walletAddress) external returns (uint256);

  function contributors() external view returns (address[] memory);

  function totalContribution() external view returns (uint256);

  function title() external view returns (string memory);

  function creator() external view returns (string memory);

  function imageUrl() external view returns (string memory);

  function status() external view returns (uint256);

  function projectDescription() external view returns (string memory);

  function rewardDescription() external view returns (string memory);

  function minContribution() external view returns (uint256);

  function projectGoals() external view returns (uint256);

  function rewardDistributionTimestamp() external view returns (uint256);

  function startTimestamp() external view returns (uint256);

  function endTimestamp() external view returns (uint256);

  function percentageFeeAmount() external view returns (uint256);

  function fixFeeAmount() external view returns (uint256);

  function getContributors() external view returns (address[] memory);

  function contribute() external payable;

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

  function configProjectInfo(
    string memory _title,
    string memory _creator,
    string memory _imageUrl,
    string memory _projectDescription,
    string memory _rewardDescription,
    uint256 _minContribution,
    uint256 _projectGoals,
    uint256 _rewardDistributionTimestamp,
    uint256 _startTimestamp,
    uint256 _endTimestamp
  ) external;

  function withdrawBNB(uint256 _amount, address _receiver) external;

  function setKickstarterStatus(Status _status) external;

  function setAdmins(address[] calldata _walletsAddress, bool _isAdmin) external;

  function setPercentageFeeAmount(uint256 _percentageFeeAmount) external;

  function setFixFeeAmount(uint256 _fixFeeAmount) external;
}
