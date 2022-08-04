// SPDX-License-Identifier: Unlisenced
// Developed by: dxsoftware.net

import "@openzeppelin/contracts/access/Ownable.sol";
import "./SummitswapKickstarter.sol";

pragma solidity ^0.8.6;

contract SummitswapKickstarterFactory is Ownable {
  address[] public projects;
  mapping(address => address[]) public userProjects;

  uint256 public serviceFee;
  address public serviceFeeReceiver;

  event ProjectCreated(
    address indexed _owner,
    address indexed _projectAddress,
    string _title,
    string _creator,
    string _projectDescription,
    string _rewardDescription,
    uint256 _minContribution,
    uint256 _projectGoals,
    uint256 _rewardDistributionTimestamp,
    uint256 _startTimestamp,
    uint256 _endTimestamp,
    uint256 timestamp
  );

  constructor(uint256 _serviceFee, address _serviceFeeReceiver) {
    serviceFee = _serviceFee;
    serviceFeeReceiver = _serviceFeeReceiver;
  }

  receive() external payable {}

  function createProject(
    string _title,
    string _creator,
    string _projectDescription,
    string _rewardDescription,
    uint256 _minContribution,
    uint256 _projectGoals,
    uint256 _rewardDistributionTimestamp,
    uint256 _startTimestamp,
    uint256 _endTimestamp
  ) external payable {
    require(msg.value >= serviceFee, "Not enough serviceFee sent");
    refundExcessiveFee();

    SummitswapKickstarter project = new SummitswapKickstarter(
      _title,
      _creator,
      _projectDescription,
      _rewardDescription,
      _minContribution,
      _projectGoals,
      _rewardDistributionTimestamp,
      _startTimestamp,
      _endTimestamp
    );

    address projectAddress = address(project);

    projects.push(projectAddress);
    userProjects[_msgSender()].push(projectAddress);

    emit ProjectCreated(
      _msgSender(),
      projectAddress,
      _title,
      _creator,
      _projectDescription,
      _rewardDescription,
      _minContribution,
      _projectGoals,
      _rewardDistributionTimestamp,
      _startTimestamp,
      _endTimestamp,
      block.timestamp
    );
  }

  function getProjects() external view returns (address[]) {
    return projects;
  }

  function getProjectsOf(address _walletAddress) external view returns (SummitswapKickstarter[] memory) {
    return userProjects[_walletAddress];
  }

  function refundExcessiveFee() internal virtual {
    uint256 refund = msg.value - serviceFee;
    if (refund > 0) {
      (bool success, ) = address(_msgSender()).call{value: refund}("");
      require(success, "Unable to refund excess Ether");
    }
  }

  // ** OWNER FUNCTIONS **

  function setServiceFee(uint256 _serviceFee) onlyOwner {
    serviceFee = _serviceFee;
  }

  function setServiceFeeReceiver(address _serviceFeeReceiver) onlyOwner {
    serviceFeeReceiver = _serviceFeeReceiver;
  }

  function withdraw(address _receiver) external onlyOwner {
    (bool success, ) = address(_receiver).call{value: address(this).balance}("");
    require(success, "Unable to withdraw Ether");
  }
}
