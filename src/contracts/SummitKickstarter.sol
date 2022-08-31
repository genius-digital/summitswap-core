// SPDX-License-Identifier: MIT
// Developed by: dxsoftware.net

pragma solidity ^0.8.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/ISummitKickstarter.sol";
import "./interfaces/ISummitKickstarterFactory.sol";

contract SummitKickstarter is Ownable {
  address public factory;
  mapping(address => bool) public isAdmin;

  mapping(address => uint256) public contributions;
  mapping(address => uint256) public contributorIndexes;

  address[] public contributors;

  uint256 public totalContribution;

  // ProjectInfo
  string public title;
  string public creator;
  string public imageUrl;

  ISummitKickstarter.Status public status = ISummitKickstarter.Status.PENDING;

  string public projectDescription;
  string public rewardDescription;

  uint256 public minContribution;
  uint256 public projectGoals;

  uint256 public rewardDistributionTimestamp;
  uint256 public startTimestamp;
  uint256 public endTimestamp;

  event Contribute(address indexed contributor, uint256 amount, uint256 timestamp);
  event KickstarterUpdated(
    string newTitle,
    string newCreator,
    string newImageUrl,
    string newProjectDescription,
    string newRewardDescription,
    uint256 newMinContribution,
    uint256 newProjectGoals,
    uint256 newRewardDistributionTimestamp,
    uint256 newStartTimestamp,
    uint256 newEndTimestamp
  );

  event TitleUpdated(string newTitle);
  event CreatorUpdated(string newCreator);
  event ImageUrlUpdated(string newImageUrl);
  event ProjectDescriptionUpdated(string newProjectDescription);
  event RewardDescriptionUpdated(string newRewardDescription);
  event MinContributionUpdated(uint256 newMinContribution);
  event ProjectGoalsUpdated(uint256 newProjectGoals);
  event RewardDistributionTimestampUpdated(uint256 newRewardDistributionTimestamp);
  event StartTimestampUpdated(uint256 newStartTimestamp);
  event EndTimestampUpdated(uint256 newEndTimestamp);

  event StatusUpdated(ISummitKickstarter.Status status);

  constructor(
    address _owner,
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
  ) {
    transferOwnership(_owner);

    factory = msg.sender;

    title = _title;
    creator = _creator;
    imageUrl = _imageUrl;

    projectDescription = _projectDescription;
    rewardDescription = _rewardDescription;

    minContribution = _minContribution;
    projectGoals = _projectGoals;

    rewardDistributionTimestamp = _rewardDistributionTimestamp;
    startTimestamp = _startTimestamp;
    endTimestamp = _endTimestamp;
  }

  receive() external payable {}

  modifier onlyFactoryAdmin() {
    require(
      ISummitKickstarterFactory(factory).owner() == msg.sender ||
        ISummitKickstarterFactory(factory).isAdmin(msg.sender),
      "Only factory admin can call this function"
    );
    _;
  }

  modifier onlyFactoryAdminAndAdmin() {
    require(
      ISummitKickstarterFactory(factory).owner() == msg.sender ||
        ISummitKickstarterFactory(factory).isAdmin(msg.sender) ||
        isAdmin[msg.sender],
      "Only admin can call this function"
    );
    _;
  }

  function getContributors() external view returns (address[] memory) {
    return contributors;
  }

  function contribute() external payable {
    require(msg.value >= minContribution, "Contribution must be greater than or equal to minContribution");
    require(block.timestamp >= startTimestamp, "You can contribute only after start time");
    require(block.timestamp <= endTimestamp, "You can contribute only before end time");

    totalContribution += msg.value;

    contributions[msg.sender] += msg.value;
    contributorIndexes[msg.sender] = contributors.length;
    contributors.push(msg.sender);

    emit Contribute(msg.sender, msg.value, block.timestamp);
  }

  // ** Factory And Admin FUNCTIONS **

  function setTitle(string memory _title) external onlyFactoryAdminAndAdmin {
    require(bytes(_title).length > 0, "Title cannot be empty");
    title = _title;

    emit TitleUpdated(_title);
  }

  function setCreator(string memory _creator) external onlyFactoryAdminAndAdmin {
    require(bytes(_creator).length > 0, "Creator cannot be empty");
    creator = _creator;

    emit CreatorUpdated(_creator);
  }

  function setImageUrl(string memory _imageUrl) external onlyFactoryAdminAndAdmin {
    require(bytes(_imageUrl).length > 0, "Image URL cannot be empty");
    imageUrl = _imageUrl;

    emit ImageUrlUpdated(_imageUrl);
  }

  function setProjectDescription(string memory _projectDescription) external onlyFactoryAdminAndAdmin {
    require(bytes(_projectDescription).length > 0, "Project description cannot be empty");
    projectDescription = _projectDescription;

    emit ProjectDescriptionUpdated(_projectDescription);
  }

  function setRewardDescription(string memory _rewardDescription) external onlyFactoryAdminAndAdmin {
    require(bytes(_rewardDescription).length > 0, "Reward description cannot be empty");
    rewardDescription = _rewardDescription;

    emit RewardDescriptionUpdated(_rewardDescription);
  }

  function setMinContribution(uint256 _minContribution) external onlyFactoryAdminAndAdmin {
    minContribution = _minContribution;

    emit MinContributionUpdated(_minContribution);
  }

  function setProjectGoals(uint256 _projectGoals) external onlyFactoryAdminAndAdmin {
    require(_projectGoals > 0, "Project goals must be greater than 0");
    projectGoals = _projectGoals;

    emit ProjectGoalsUpdated(_projectGoals);
  }

  function setRewardDistributionTimestamp(uint256 _rewardDistributionTimestamp) external onlyFactoryAdminAndAdmin {
    rewardDistributionTimestamp = _rewardDistributionTimestamp;

    emit RewardDistributionTimestampUpdated(_rewardDistributionTimestamp);
  }

  function setStartTimestamp(uint256 _startTimestamp) external onlyFactoryAdminAndAdmin {
    require(_startTimestamp < endTimestamp, "Start timestamp must be before end timestamp");
    startTimestamp = _startTimestamp;

    emit StartTimestampUpdated(_startTimestamp);
  }

  function setEndTimestamp(uint256 _endTimestamp) external onlyFactoryAdminAndAdmin {
    require(_endTimestamp > startTimestamp, "End timestamp must be after start timestamp");
    endTimestamp = _endTimestamp;

    emit EndTimestampUpdated(_endTimestamp);
  }

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
  ) external onlyFactoryAdminAndAdmin {
    require(_startTimestamp < endTimestamp, "Start timestamp must be before end timestamp");

    title = _title;
    creator = _creator;
    imageUrl = _imageUrl;

    projectDescription = _projectDescription;
    rewardDescription = _rewardDescription;

    minContribution = _minContribution;
    projectGoals = _projectGoals;

    rewardDistributionTimestamp = _rewardDistributionTimestamp;
    startTimestamp = _startTimestamp;
    endTimestamp = _endTimestamp;

    emit KickstarterUpdated(
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
  }

  function withdrawBNB(uint256 _amount, address _receiver) external onlyOwner {
    require(address(this).balance >= _amount, "You cannot withdraw more than you have");

    payable(_receiver).transfer(_amount);
  }

  // ** FACTORY ADMIN FUNCTIONS **

  function setKickstarterStatus(ISummitKickstarter.Status _status) external onlyFactoryAdmin {
    status = _status;
    emit StatusUpdated(status);
  }

  function setAdmins(address[] calldata _walletsAddress, bool _isAdmin) external onlyFactoryAdmin {
    for (uint256 i = 0; i < _walletsAddress.length; i++) {
      isAdmin[_walletsAddress[i]] = _isAdmin;
    }
  }
}
