// SPDX-License-Identifier: UNLICENSED
// Developed by: dxsoftware.net

pragma solidity 0.8.6;

interface ISummitKickstarterFactory {
  function isAdmin(address _address) external view returns (bool);

  function projects() external view returns (address memory);

  function userProjects(address _address) external view returns (address memory);

  function serviceFee() external view returns (uint256);

  function createProject(
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
  ) external payable;

  function getProjects() external view returns (address[] memory);

  function getProjectsOf(address _walletAddress) external view returns (address[] memory);

  function setAdmins(address[] calldata _walletAddress, bool _isAdmin) external;

  function withdraw(address _receiver) external;

  function setKickstarterStatus(address _kickstarterAddress, ISummitKickstarter.Status status) external;

  function setServiceFee(uint256 _serviceFee) external;
}
