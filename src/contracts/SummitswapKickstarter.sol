// SPDX-License-Identifier: MIT
// Developed by: dxsoftware.net

pragma solidity 0.7.6;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SummitswapKickstarter is Ownable {
  using SafeMath for uint256;

  mapping(address => uint256) public contributions;
  mapping(address => uint256) public contributorIndexes;

  address[] public contributors;

  uint256 public totalContribution;
  uint256 public minContribution;

  uint256 public startTimestamp;
  uint256 public endTimestamp;

  event Contribute(address indexed contributor, uint256 amount, uint256 timestamp);
  event Refund(address indexed contributor, uint256 amount, uint256 timestamp);

  constructor(
    uint256 _minContribution,
    uint256 _startTimestamp,
    uint256 _endTimestamp
  ) {
    minContribution = _minContribution;
    startTimestamp = _startTimestamp;
    endTimestamp = _endTimestamp;
  }

  receive() external payable {}

  function setMinContribution(uint256 _minContribution) external onlyOwner {
    minContribution = _minContribution;
  }

  function setStartTimestamp(uint256 _startTimestamp) external onlyOwner {
    startTimestamp = _startTimestamp;
  }

  function setEndTimestamp(uint256 _endTimestamp) external onlyOwner {
    endTimestamp = _endTimestamp;
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

  function refund(address _contributor, uint256 _amount) external onlyOwner {
    require(contributions[_contributor] >= _amount, "You cannot refund more than you have contributed");
    require(address(this).balance >= _amount, "You cannot withdraw more than you have");

    totalContribution -= _amount;
    contributions[_contributor] -= _amount;

    if (contributions[_contributor] == 0) {
      removeContributor(_contributor);
    }

    payable(_contributor).transfer(_amount);
    emit Refund(_contributor, _amount, block.timestamp);
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
