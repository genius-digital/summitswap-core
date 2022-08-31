// SPDX-License-Identifier: Unlisenced
// Developed by: dxsoftware.net

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/ISummitKickstarter.sol";
import "./SummitKickstarter.sol";

pragma solidity ^0.8.6;

contract SummitKickstarterFactory is Ownable {
  mapping(address => bool) public isAdmin;

  address[] public projects;
  mapping(address => address[]) public userProjects;

  uint256 public serviceFee;

  event ProjectCreated(
    address indexed _owner,
    address indexed _kickstarterAddress,
    string _title,
    string _creator,
    string _imageUrl,
    string _projectDescription,
    string _rewardDescription,
    uint256 _minContribution,
    uint256 _projectGoals,
    uint256 _rewardDistributionTimestamp,
    uint256 _startTimestamp,
    uint256 _endTimestamp,
    uint256 timestamp
  );

  constructor(uint256 _serviceFee) {
    serviceFee = _serviceFee;
  }

  receive() external payable {}

  modifier onlyAdminAndOwner() {
    require(isAdmin[msg.sender] || msg.sender == owner(), "Only admin or owner can call this function");
    _;
  }

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
  ) external payable {
    require(msg.value >= serviceFee, "Service Fee is not enough");
    refundExcessiveFee();

    SummitKickstarter project = new SummitKickstarter(
      _msgSender(),
      _title,
      _creator,
      _imageUrl,
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
      _imageUrl,
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

  function getProjects() external view returns (address[] memory) {
    return projects;
  }

  function getProjectsOf(address _walletAddress) external view returns (address[] memory) {
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

  function setAdmins(address[] calldata _walletAddress, bool _isAdmin) external onlyOwner {
    for (uint256 i = 0; i < _walletAddress.length; i++) {
      isAdmin[_walletAddress[i]] = _isAdmin;
    }
  }

  // ** OWNER AND ADMIN FUNCTIONS **

  function setKickstarterStatus(address _kickstarterAddress, ISummitKickstarter.Status status)
    external
    onlyAdminAndOwner
  {
    ISummitKickstarter(_kickstarterAddress).setKickstarterStatus(status);
  }

  function setServiceFee(uint256 _serviceFee) external onlyAdminAndOwner {
    serviceFee = _serviceFee;
  }

  function withdraw(address _receiver) external onlyOwner {
    (bool success, ) = address(_receiver).call{value: address(this).balance}("");
    require(success, "Unable to withdraw Ether");
  }
}
