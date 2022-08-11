// SPDX-License-Identifier: MIT
// Developed by: dxsoftware.net

pragma solidity ^0.8.6;

import "@openzeppelin/contracts/access/Ownable.sol";

contract SummitKickstarter is Ownable {
  mapping(address => uint256) public contributions;
  mapping(address => uint256) public contributorIndexes;

  address[] public contributors;

  uint256 public totalContribution;

  // ProjectInfo
  string public title;
  string public creator;
  string public projectDescription;
  string public rewardDescription;

  uint256 public minContribution;
  uint256 public projectGoals;

  uint256 public rewardDistributionTimestamp;
  uint256 public startTimestamp;
  uint256 public endTimestamp;

  bool public hasDistributedRewards = false;

  event Contribute(address indexed contributor, uint256 amount, uint256 timestamp);
  event KickstarterUpdated(
    string newTitle,
    string newCreator,
    string newProjectDescription,
    string newRewardDescription,
    uint256 newMinContribution,
    uint256 newProjectGoals,
    uint256 newRewardDistributionTimestamp,
    uint256 newStartTimestamp,
    uint256 newEndTimestamp,
    bool newHasDistributedRewards
  );

  event TitleUpdated(string newTitle);
  event CreatorUpdated(string newCreator);
  event ProjectDescriptionUpdated(string newProjectDescription);
  event RewardDescriptionUpdated(string newRewardDescription);
  event MinContributionUpdated(uint256 newMinContribution);
  event ProjectGoalsUpdated(uint256 newProjectGoals);
  event RewardDistributionTimestampUpdated(uint256 newRewardDistributionTimestamp);
  event StartTimestampUpdated(uint256 newStartTimestamp);
  event EndTimestampUpdated(uint256 newEndTimestamp);
  event HasDistributedRewardsUpdated(bool newHasDistributedRewards);

  constructor(
    address _owner,
    string memory _title,
    string memory _creator,
    string memory _projectDescription,
    string memory _rewardDescription,
    uint256 _minContribution,
    uint256 _projectGoals,
    uint256 _rewardDistributionTimestamp,
    uint256 _startTimestamp,
    uint256 _endTimestamp
  ) {
    transferOwnership(_owner);

    title = _title;
    creator = _creator;
    projectDescription = _projectDescription;
    rewardDescription = _rewardDescription;

    minContribution = _minContribution;
    projectGoals = _projectGoals;

    rewardDistributionTimestamp = _rewardDistributionTimestamp;
    startTimestamp = _startTimestamp;
    endTimestamp = _endTimestamp;
  }

  receive() external payable {}

  function setTitle(string memory _title) external onlyOwner {
    require(bytes(_title).length > 0, "Title cannot be empty");
    title = _title;

    emit TitleUpdated(_title);
  }

  function setCreator(string memory _creator) external onlyOwner {
    require(bytes(_creator).length > 0, "Creator cannot be empty");
    creator = _creator;

    emit CreatorUpdated(_creator);
  }

  function setProjectDescription(string memory _projectDescription) external onlyOwner {
    require(bytes(_projectDescription).length > 0, "Project description cannot be empty");
    projectDescription = _projectDescription;

    emit ProjectDescriptionUpdated(_projectDescription);
  }

  function setRewardDescription(string memory _rewardDescription) external onlyOwner {
    require(bytes(_rewardDescription).length > 0, "Reward description cannot be empty");
    rewardDescription = _rewardDescription;

    emit RewardDescriptionUpdated(_rewardDescription);
  }

  function setMinContribution(uint256 _minContribution) external onlyOwner {
    minContribution = _minContribution;

    emit MinContributionUpdated(_minContribution);
  }

  function setProjectGoals(uint256 _projectGoals) external onlyOwner {
    require(_projectGoals > 0, "Project goals must be greater than 0");
    projectGoals = _projectGoals;

    emit ProjectGoalsUpdated(_projectGoals);
  }

  function setRewardDistributionTimestamp(uint256 _rewardDistributionTimestamp) external onlyOwner {
    rewardDistributionTimestamp = _rewardDistributionTimestamp;

    emit RewardDistributionTimestampUpdated(_rewardDistributionTimestamp);
  }

  function setStartTimestamp(uint256 _startTimestamp) external onlyOwner {
    require(_startTimestamp < endTimestamp, "Start timestamp must be before end timestamp");
    startTimestamp = _startTimestamp;

    emit StartTimestampUpdated(_startTimestamp);
  }

  function setEndTimestamp(uint256 _endTimestamp) external onlyOwner {
    require(_endTimestamp > startTimestamp, "End timestamp must be after start timestamp");
    endTimestamp = _endTimestamp;

    emit EndTimestampUpdated(_endTimestamp);
  }

  function setHasDistributedRewards(bool _hasDistributedRewards) external onlyOwner {
    hasDistributedRewards = _hasDistributedRewards;

    emit HasDistributedRewardsUpdated(_hasDistributedRewards);
  }

  function configProjectInfo(
    string memory _title,
    string memory _creator,
    string memory _projectDescription,
    string memory _rewardDescription,
    uint256 _minContribution,
    uint256 _projectGoals,
    uint256 _rewardDistributionTimestamp,
    uint256 _startTimestamp,
    uint256 _endTimestamp,
    bool _hasDistributedRewards
  ) external onlyOwner {
    require(_startTimestamp < endTimestamp, "Start timestamp must be before end timestamp");

    title = _title;
    creator = _creator;
    projectDescription = _projectDescription;
    rewardDescription = _rewardDescription;

    minContribution = _minContribution;
    projectGoals = _projectGoals;

    rewardDistributionTimestamp = _rewardDistributionTimestamp;
    startTimestamp = _startTimestamp;
    endTimestamp = _endTimestamp;

    hasDistributedRewards = _hasDistributedRewards;

    emit KickstarterUpdated(
      _title,
      _creator,
      _projectDescription,
      _rewardDescription,
      _minContribution,
      _projectGoals,
      _rewardDistributionTimestamp,
      _startTimestamp,
      _endTimestamp,
      _hasDistributedRewards
    );
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

  function withdrawBNB(uint256 _amount, address _receiver) external onlyOwner {
    require(address(this).balance >= _amount, "You cannot withdraw more than you have");

    payable(_receiver).transfer(_amount);
  }

  function removeContributor(address _address) private {
    uint256 index = contributorIndexes[_address];
    if (contributors[index] == _address) {
      contributorIndexes[_address] = 0;

      uint256 lastIndex = contributors.length - 1;
      address lastContributor = contributors[lastIndex];

      contributors[index] = lastContributor;
      contributorIndexes[lastContributor] = index == lastIndex ? 0 : index;
      contributors.pop();
    }
  }
}
