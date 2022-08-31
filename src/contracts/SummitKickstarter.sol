// SPDX-License-Identifier: MIT
// Developed by: dxsoftware.net

pragma solidity ^0.8.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/ISummitKickstarter.sol";
import "./interfaces/ISummitKickstarterFactory.sol";

contract SummitKickstarter is Ownable {
  mapping(address => bool) public isAdmin;
  mapping(address => uint256) public contributions;
  mapping(address => uint256) public contributorIndexes;

  address[] public contributors;
  address public factory;

  Kickstarter public kickstarter;
  Status public status = Status.PENDING;

  uint256 public constant FEE_DENOMINATOR = 10000;
  uint256 public totalContribution;
  uint256 public percentageFeeAmount = 0;
  uint256 public fixFeeAmount = 0;

  string public rejectReason;

  event Contribute(address indexed contributor, uint256 amount, uint256 timestamp);
  event KickstarterUpdated(Kickstarter kickstarter);
  event KickstarterUpdatedByFactoryAdmin(
    Kickstarter kickstarter,
    Status newStatus,
    uint256 newPercentageFeeAmount,
    uint256 newFixFeeAmount
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

  event StatusUpdated(Status status);
  event PercentageFeeAmountUpdated(uint256 newPercentageFeeAmount);
  event FixFeeAmountUpdated(uint256 newFixFeeAmount);

  event Approved(uint256 percentageFeeAmount, uint256 fixFeeAmount);
  event Rejected(string rejectedReason);

  constructor(Kickstarter memory _kickstarter) {
    transferOwnership(_kickstarter.owner);

    factory = msg.sender;
    kickstarter = _kickstarter;
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

  function contribute(uint256 amount) external payable {
    require(msg.value >= kickstarter.minContribution, "Contribution must be greater than or equal to minContribution");
    require(
      msg.value >= amount || kickstarter.paymentToken.balanceOf(msg.sender) >= amount,
      "Insufficient contribution amount"
    );
    require(block.timestamp >= kickstarter.startTimestamp, "You can contribute only after start time");
    require(block.timestamp <= kickstarter.endTimestamp, "You can contribute only before end time");

    totalContribution += amount;

    if (address(kickstarter.paymentToken) != address(0)) {
      kickstarter.paymentToken.transferFrom(msg.sender, address(this), amount);
    } else {
      uint256 refundAmount = msg.value - amount;
      refundExcessiveFee(refundAmount);
    }

    contributions[msg.sender] += amount;

    if ((contributorIndexes[msg.sender] == 0 && contributors.length > 0) || contributors.length == 0) {
      contributorIndexes[msg.sender] = contributors.length;
      contributors.push(msg.sender);
    }

    emit Contribute(msg.sender, amount, block.timestamp);
  }

  function refundExcessiveFee(uint256 _refundAmount) internal virtual {
    if (_refundAmount > 0) {
      (bool success, ) = address(_msgSender()).call{value: _refundAmount}("");
      require(success, "Unable to refund excess Ether");
    }
  }

  // ** Factory And Admin FUNCTIONS **

  function setTitle(string memory _title) external onlyFactoryAdminAndAdmin {
    require(bytes(_title).length > 0, "Title cannot be empty");
    kickstarter.title = _title;

    emit TitleUpdated(_title);
  }

  function setCreator(string memory _creator) external onlyFactoryAdminAndAdmin {
    require(bytes(_creator).length > 0, "Creator cannot be empty");
    kickstarter.creator = _creator;

    emit CreatorUpdated(_creator);
  }

  function setImageUrl(string memory _imageUrl) external onlyFactoryAdminAndAdmin {
    require(bytes(_imageUrl).length > 0, "Image URL cannot be empty");
    kickstarter.imageUrl = _imageUrl;

    emit ImageUrlUpdated(_imageUrl);
  }

  function setProjectDescription(string memory _projectDescription) external onlyFactoryAdminAndAdmin {
    require(bytes(_projectDescription).length > 0, "Project description cannot be empty");
    kickstarter.projectDescription = _projectDescription;

    emit ProjectDescriptionUpdated(_projectDescription);
  }

  function setRewardDescription(string memory _rewardDescription) external onlyFactoryAdminAndAdmin {
    require(bytes(_rewardDescription).length > 0, "Reward description cannot be empty");
    kickstarter.rewardDescription = _rewardDescription;

    emit RewardDescriptionUpdated(_rewardDescription);
  }

  function setMinContribution(uint256 _minContribution) external onlyFactoryAdminAndAdmin {
    kickstarter.minContribution = _minContribution;

    emit MinContributionUpdated(_minContribution);
  }

  function setProjectGoals(uint256 _projectGoals) external onlyFactoryAdminAndAdmin {
    require(_projectGoals > 0, "Project goals must be greater than 0");
    kickstarter.projectGoals = _projectGoals;

    emit ProjectGoalsUpdated(_projectGoals);
  }

  function setRewardDistributionTimestamp(uint256 _rewardDistributionTimestamp) external onlyFactoryAdminAndAdmin {
    kickstarter.rewardDistributionTimestamp = _rewardDistributionTimestamp;

    emit RewardDistributionTimestampUpdated(_rewardDistributionTimestamp);
  }

  function setStartTimestamp(uint256 _startTimestamp) external onlyFactoryAdminAndAdmin {
    require(_startTimestamp < kickstarter.endTimestamp, "Start timestamp must be before end timestamp");
    kickstarter.startTimestamp = _startTimestamp;

    emit StartTimestampUpdated(_startTimestamp);
  }

  function setEndTimestamp(uint256 _endTimestamp) external onlyFactoryAdminAndAdmin {
    require(_endTimestamp > kickstarter.startTimestamp, "End timestamp must be after start timestamp");
    kickstarter.endTimestamp = _endTimestamp;

    emit EndTimestampUpdated(_endTimestamp);
  }

  function configProjectInfo(Kickstarter calldata _kickstarter) external onlyFactoryAdminAndAdmin {
    require(_kickstarter.startTimestamp < _kickstarter.endTimestamp, "Start timestamp must be before end timestamp");
    require(
      status == Status.PENDING || _kickstarter.paymentToken == kickstarter.paymentToken,
      "You can't change payment token after Approval"
    );

    kickstarter = _kickstarter;

    emit KickstarterUpdated(_kickstarter);
  }

  function withdraw(uint256 _amount, address _receiver) external onlyOwner {
    if (address(kickstarter.paymentToken) == address(0)) {
      withdrawBNB(_amount, _receiver);
    } else {
      withdrawToken(_amount, _receiver);
    }
  }

  function withdrawBNB(uint256 _amount, address _receiver) private onlyOwner {
    require(address(this).balance >= _amount, "You cannot withdraw more than you have");

    uint256 withdrawalFee = fixFeeAmount + ((_amount * percentageFeeAmount) / FEE_DENOMINATOR);
    require(address(this).balance > withdrawalFee, "You cannot withraw less than widrawal fee");

    uint256 receiverAmount = _amount - withdrawalFee;

    payable(_receiver).transfer(receiverAmount);
    payable(factory).transfer(withdrawalFee);
  }

  function withdrawToken(uint256 _amount, address _receiver) private onlyOwner {
    require(kickstarter.paymentToken.balanceOf(address(this)) >= _amount, "You cannot withdraw more than you have");

    uint256 withdrawalFee = fixFeeAmount + ((_amount * percentageFeeAmount) / FEE_DENOMINATOR);
    require(
      kickstarter.paymentToken.balanceOf(address(this)) > withdrawalFee,
      "You cannot withraw less than widrawal fee"
    );

    uint256 receiverAmount = _amount - withdrawalFee;

    kickstarter.paymentToken.transfer(_receiver, receiverAmount);
    kickstarter.paymentToken.transfer(factory, withdrawalFee);
  }

  // ** FACTORY ADMIN FUNCTIONS **

  function configProjectInfo(
    Kickstarter calldata _kickstarter,
    Status _status,
    uint256 _percentageFeeAmount,
    uint256 _fixFeeAmount
  ) external onlyFactoryAdmin {
    require(_kickstarter.startTimestamp < _kickstarter.endTimestamp, "Start timestamp must be before end timestamp");
    require(_percentageFeeAmount <= FEE_DENOMINATOR, "percentageFeeAmount should be less than FEE_DENOMINATOR");
    require(
      status == Status.PENDING || _kickstarter.paymentToken == kickstarter.paymentToken,
      "You can't change payment token after Approval"
    );

    kickstarter = _kickstarter;
    status = _status;
    percentageFeeAmount = _percentageFeeAmount;
    fixFeeAmount = _fixFeeAmount;

    emit KickstarterUpdatedByFactoryAdmin(_kickstarter, _status, _percentageFeeAmount, _fixFeeAmount);
  }

  function approve(uint256 _percentageFeeAmount, uint256 _fixFeeAmount) external onlyFactoryAdmin {
    require(_percentageFeeAmount <= FEE_DENOMINATOR, "percentageFeeAmount should be less than FEE_DENOMINATOR");

    percentageFeeAmount = _percentageFeeAmount;
    fixFeeAmount = _fixFeeAmount;

    status = Status.APPROVED;
    rejectReason = "";

    emit Approved(_percentageFeeAmount, _fixFeeAmount);
  }

  function reject(string memory _rejectReason) external onlyFactoryAdmin {
    rejectReason = _rejectReason;
    status = Status.REJECTED;

    emit Rejected(_rejectReason);
  }

  function setKickstarterStatus(Status _status) external onlyFactoryAdmin {
    status = _status;
    emit StatusUpdated(_status);
  }

  function setAdmins(address[] calldata _walletsAddress, bool _isAdmin) external onlyFactoryAdmin {
    for (uint256 i = 0; i < _walletsAddress.length; i++) {
      isAdmin[_walletsAddress[i]] = _isAdmin;
    }
  }

  function setPercentageFeeAmount(uint256 _percentageFeeAmount) external onlyFactoryAdmin {
    require(_percentageFeeAmount <= FEE_DENOMINATOR, "percentageFeeAmount should be less than FEE_DENOMINATOR");
    percentageFeeAmount = _percentageFeeAmount;

    emit PercentageFeeAmountUpdated(_percentageFeeAmount);
  }

  function setFixFeeAmount(uint256 _fixFeeAmount) external onlyFactoryAdmin {
    fixFeeAmount = _fixFeeAmount;

    emit FixFeeAmountUpdated(_fixFeeAmount);
  }
}
