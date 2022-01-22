pragma solidity =0.6.6;
pragma experimental ABIEncoderV2;

import "./interfaces/ISummitswapFactory.sol";
import "./libraries/SafeMath2.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/ISummitswapRouter02.sol";

import "./shared/Ownable.sol";

struct FeeInfo {
  address tokenR;
  uint256 refFee;
  uint256 devFee;
}

struct InfInfo {
  address lead;
  uint256 leadFee;
  uint256 refFee;
  bool isActive;
  bool isLead;
}

struct SwapInfo {
  uint256 timestamp;
  address inputToken;
  address outputToken;
  address rewardToken;
  uint256 inputTokenAmount;
  uint256 outputTokenAmount;
  uint256 referrerReward;
  uint256 devReward;
}

// TODO: I think there was some invalid cases with fee percentages
// TODO: Use plurar names for maps
// TODO: In balances reward token should be first
// TODO: We don't consider amountU in totalSharedRewards to notify project owner
contract SummitReferral is Ownable {
  using SafeMath for uint256;

  uint256 public feeDenominator = 1000000000;

  address public summitswapRouter;
  address public pancakeswapRouter;
  address public devAddr;

  mapping(address => mapping(address => bool)) public isManager; // output token => manager => is manager

  mapping(address => FeeInfo) public feeInfo; // output token => fee info
  mapping(address => uint256) public firstBuyRefereeFee; // output token => first buy referee fee
  mapping(address => mapping(address => bool)) public isFirstBuy; // output token => referee => is first buy

  mapping(address => mapping(address => InfInfo)) public influencers; // output token token => influencer => influencer info
  mapping(address => mapping(address => address)) public subInfluencerAcceptedLead; // output token token => sub influencer => lead influencer
  mapping(address => mapping(address => address)) public referrers; // output token => referee => referrer

  mapping(address => SwapInfo[]) public swapList; // referrer => swap infos

  // mapping(address => address) public preferredToken; // referee => token preferred to withdraw rewards
  // mapping(address => uint256) public preferredTokenFee; // preferred token => fee

  mapping(address => mapping(address => uint256)) public balances; // reward token => user => amount
  mapping(address => address[]) public hasBalance; // user => list of reward tokens he has balance on
  mapping(address => mapping(address => uint256)) public hasBalanceIndex; // reward token => user => array index in hasBalance
  mapping(address => mapping(address => bool)) public isBalanceIndex; // reward token => user => has array index in hasBalance or not

  mapping(address => uint256) public totalReward; // reward token => total reward

  // mapping(address => uint256) public referralsCount; // referrer address => referrals count
  // mapping(address => bool) private rewardEnabled;
  // address[] private rewardTokens;

  event ReferralRecorded(address indexed referee, address indexed referrer, address indexed outputToken);

  event ReferralReward(
    address indexed user,
    address indexed tokenR,
    uint256 amountL,
    uint256 amountS,
    uint256 amountD,
    uint256 amountU
  ); // amountL - LeadInfReward, amountS - SubInfReward, amountU - userReward, amountD - devReward

  constructor(
    address _devAddr,
    address _summitswapRouter,
    address _pancakeswapRouter
  ) public {
    devAddr = _devAddr;
    summitswapRouter = _summitswapRouter;
    pancakeswapRouter = _pancakeswapRouter;
  }

  modifier onlySummitswapRouter() {
    require(msg.sender == summitswapRouter, "Caller is not the router");
    _;
  }

  modifier onlyManager(address _outputToken) {
    require(
      msg.sender == owner() || isManager[_outputToken][msg.sender] == true,
      "Caller is not the manager of specified token"
    );
    _;
  }

  modifier onlyLeadInfluencer(address _outputToken, address _user) {
    require(influencers[_outputToken][msg.sender].isActive == true, "You aren't lead influencer on this output token");
    require(influencers[_outputToken][msg.sender].isLead == true, "You aren't lead influencer on this output token");
    require(
      subInfluencerAcceptedLead[_outputToken][_user] == msg.sender,
      "This user didn't accept you as a lead influencer"
    );
    _;
  }

  function setDevAddress(address _devAddr) external onlyOwner {
    devAddr = _devAddr;
  }

  function setSummitswapRouter(address _summitswapRouter) external onlyOwner {
    summitswapRouter = _summitswapRouter;
  }

  function setPancakeswapRouter(address _pancakeswapRouter) external onlyOwner {
    pancakeswapRouter = _pancakeswapRouter;
  }

  function getSwapListCount(address _referrer) external view returns (uint256) {
    return swapList[_referrer].length;
  }

  function getBalancesLength(address _user) external view returns (uint256) {
    return hasBalance[_user].length;
  }

  function setFirstBuyFee(address _outputToken, uint256 _fee) external onlyManager(_outputToken) {
    require(_fee <= feeDenominator, "Wrong Fee");
    firstBuyRefereeFee[_outputToken] = _fee;
  }

  function setManager(
    address _outputToken,
    address _manager,
    bool _isManager
  ) external onlyOwner {
    isManager[_outputToken][_manager] = _isManager;
  }

  function setFeeInfo(
    address _outputToken,
    address _rewardToken,
    uint256 _refFee,
    uint256 _devFee
  ) external onlyManager(_outputToken) {
    require(_refFee + _devFee <= feeDenominator, "Wrong Fee");
    feeInfo[_outputToken].tokenR = _rewardToken;
    feeInfo[_outputToken].refFee = _refFee;
    feeInfo[_outputToken].devFee = _devFee;
  }

  // Improvement: Revert if some conditions are not met
  function recordReferral(address _outputToken, address _referrer) external {
    require(_referrer != msg.sender, "You can't refer yourself");
    require(_referrer != address(0), "You can't use burn address as a refferer");
    require(referrers[_outputToken][msg.sender] == address(0), "You are already referred on this token");

    referrers[_outputToken][msg.sender] = _referrer;
    // referralsCount[_referrer] += 1;
    emit ReferralRecorded(msg.sender, _referrer, _outputToken);
  }

  // Improvement: In the previous version it was impossible to provote subInfluencer to be leadInfluencer
  function setLeadInfluencer(
    address _outputToken,
    address _user,
    uint256 _leadFee
  ) external onlyManager(_outputToken) {
    require(_leadFee <= feeDenominator, "Wrong Fee");

    influencers[_outputToken][_user].lead = address(0);
    influencers[_outputToken][_user].leadFee = _leadFee;
    influencers[_outputToken][_user].refFee = 0;
    influencers[_outputToken][_user].isActive = true;
    influencers[_outputToken][_user].isLead = true;
  }

  // Improvement: In the previous version we did not even check in swap function if leadInfluencer was active or not
  function removeLeadInfluencer(address _outputToken, address _lead) external onlyManager(_outputToken) {
    influencers[_outputToken][_lead].isLead = false;
    influencers[_outputToken][_lead].isActive = false;
  }

  function acceptLeadInfluencer(address _outputToken, address _leadInfluencer) external {
    subInfluencerAcceptedLead[_outputToken][msg.sender] = _leadInfluencer;
  }

  // Improvement: In the previous version sub influencer wasn't able to change lead influencer
  function setSubInfluencer(
    address _outputToken,
    address _user,
    uint256 _leadFee,
    uint256 _infFee
  ) external onlyLeadInfluencer(_outputToken, _user) {
    require(influencers[_outputToken][_user].isLead == false, "User is already lead influencer on this output token");
    require(_leadFee + _infFee == feeDenominator, "Wrong Fee");

    influencers[_outputToken][_user].isActive = true;
    influencers[_outputToken][_user].lead = msg.sender;
    influencers[_outputToken][_user].refFee = _infFee;
    influencers[_outputToken][_user].leadFee = _leadFee;
  }

  // Improvement: In the previous version we weren't able to remove subInfluencers
  function removeSubInfluencer(address _outputToken, address _user) external {
    require(
      influencers[_outputToken][_user].lead == msg.sender,
      "This user is added by another lead on this output token"
    );

    influencers[_outputToken][_user].isActive = false;
  }

  function claimReward(address _rewardToken) public {
    uint256 balance = balances[_rewardToken][msg.sender];

    require(balance > 0, "Insufficient balance");

    balances[_rewardToken][msg.sender] = 0;
    isBalanceIndex[_rewardToken][msg.sender] = false;
    uint256 rewardTokenIndex = hasBalanceIndex[_rewardToken][msg.sender];
    address lastToken = hasBalance[msg.sender][hasBalance[msg.sender].length - 1];
    hasBalanceIndex[lastToken][msg.sender] = rewardTokenIndex;
    hasBalance[msg.sender][rewardTokenIndex] = lastToken;
    hasBalance[msg.sender].pop();
    totalReward[_rewardToken] -= balance;

    IERC20(_rewardToken).transfer(msg.sender, balance);
  }

  function claimAllRewards() external {
    uint256 hasBalanceLength = hasBalance[msg.sender].length;
    for (uint256 i = 0; i < hasBalanceLength; i++) {
      claimReward(hasBalance[msg.sender][0]);
    }
  }

  // TODO: Add ability to convert automatically to BNB, BUSD
  function getReward(
    address _outputToken,
    uint256 _outputTokenAmount,
    address _rewardToken
  ) internal view returns (uint256) {
    if (_outputToken == _rewardToken) {
      return _outputTokenAmount;
    }

    address[] memory path = new address[](3);

    path[0] = _outputToken;
    path[1] = ISummitswapRouter02(summitswapRouter).WETH();
    path[2] = _rewardToken;
    uint256 summitswapAmountsOut = ISummitswapRouter02(summitswapRouter).getAmountsOut(_outputTokenAmount, path)[2];

    path[0] = _outputToken;
    path[1] = ISummitswapRouter02(pancakeswapRouter).WETH();
    path[2] = _rewardToken;
    uint256 pancakeswapAmountsOut = ISummitswapRouter02(pancakeswapRouter).getAmountsOut(_outputTokenAmount, path)[2];

    return summitswapAmountsOut >= pancakeswapAmountsOut ? summitswapAmountsOut : pancakeswapAmountsOut;
  }

  function increaseBalance(
    address _user,
    address _rewardToken,
    uint256 _amount
  ) internal {
    if (balances[_rewardToken][_user] == 0) {
      hasBalanceIndex[_rewardToken][_user] = hasBalance[_user].length;
      isBalanceIndex[_rewardToken][_user] = true;
      hasBalance[_user].push(_rewardToken);
    }
    balances[_rewardToken][_user] += _amount;
  }

  function swap(
    address _user,
    address _inputToken,
    address _outputToken,
    uint256 _inputTokenAmount,
    uint256 _outputTokenAmount
  ) external onlySummitswapRouter {
    address referrer = referrers[_outputToken][_user];

    if (referrer == address(0)) {
      return;
    }

    address rewardToken = feeInfo[_outputToken].tokenR;

    if (rewardToken == address(0)) {
      return;
    }

    // if (rewardEnabled[rewardToken] == false) {
    //   rewardEnabled[rewardToken] = true;
    //   rewardTokens.push(rewardToken);
    // }

    uint256 rewardAmount = getReward(_outputToken, _outputTokenAmount, rewardToken);
    uint256 amountR;
    uint256 amountL;
    uint256 amountU;

    address leadInfluencer = influencers[_outputToken][referrer].lead;

    if (
      leadInfluencer == address(0) ||
      influencers[_outputToken][leadInfluencer].isActive == false ||
      influencers[_outputToken][leadInfluencer].isLead == false
    ) {
      amountR = rewardAmount.mul(feeInfo[_outputToken].refFee).div(feeDenominator);
    } else {
      uint256 amountI = rewardAmount.mul(influencers[_outputToken][leadInfluencer].leadFee).div(feeDenominator);

      amountL = amountI.mul(influencers[_outputToken][referrer].leadFee).div(feeDenominator);
      amountR = amountI.mul(influencers[_outputToken][referrer].refFee).div(feeDenominator);

      increaseBalance(leadInfluencer, rewardToken, amountL);

      swapList[leadInfluencer].push(
        SwapInfo({
          timestamp: block.timestamp,
          inputToken: _inputToken,
          outputToken: _outputToken,
          rewardToken: rewardToken,
          inputTokenAmount: _inputTokenAmount,
          outputTokenAmount: _outputTokenAmount,
          referrerReward: amountL,
          devReward: 0 // TODO: Why do we throw this event with amountD: 0, on line 227 we calculate amountD
        })
      );
    }

    if (isFirstBuy[_outputToken][_user] == false) {
      isFirstBuy[_outputToken][_user] = true;
      amountU = rewardAmount.mul(firstBuyRefereeFee[_outputToken]).div(feeDenominator);
      IERC20(rewardToken).transfer(_user, amountU);
    }

    increaseBalance(referrer, rewardToken, amountR);

    uint256 amountD = rewardAmount.mul(feeInfo[_outputToken].devFee).div(feeDenominator);
    increaseBalance(devAddr, rewardToken, amountD);

    swapList[referrer].push(
      SwapInfo({
        timestamp: block.timestamp,
        inputToken: _inputToken,
        outputToken: _outputToken,
        rewardToken: rewardToken,
        inputTokenAmount: _inputTokenAmount,
        outputTokenAmount: _outputTokenAmount,
        referrerReward: amountR,
        devReward: amountD
      })
    );

    totalReward[rewardToken] += amountL + amountR + amountD;
    emit ReferralReward(_user, rewardToken, amountL, amountR, amountD, amountU);
  }

  // Improvement: If swapList is big wont be usable
  // function getSwapList(address _referrer) external view returns (SwapInfo[] memory result) {
  //   result = swapList[_referrer];
  // }

  // Improvement: If rewardTokens is big wont be usable
  // function getRewardTokens() external view returns (address[] memory result) {
  //   result = rewardTokens;
  // }
}
