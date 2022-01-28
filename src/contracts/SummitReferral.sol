pragma solidity =0.6.6;
pragma experimental ABIEncoderV2;

import "./libraries/SafeMath2.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/ISummitswapRouter02.sol";

import "./shared/Ownable.sol";

import "hardhat/console.sol";

// TODO: Explain scheme - and maybe simplify a little bit
// TODO: Ask - promotions only work for noninfluencers
// TODO: Add functions to simply set 1 field in feeInfo
struct FeeInfo {
  address tokenR;
  uint256 refFee;
  uint256 devFee;
  uint256 promRefFee;
  uint256 promStart;
  uint256 promEnd;
}

struct InfInfo {
  address lead;
  uint256 leadFee;
  uint256 refFee;
  bool isActive;
  bool isLead;
}

// We don't consider refferee first time fees in totalReward to notify project owner
contract SummitReferral is Ownable {
  using SafeMath for uint256;

  uint256 public feeDenominator = 1000000000;

  address public summitswapRouter;
  address public pancakeswapRouter;
  address public devAddr;
  address public kapex;
  address public busd;
  address public wbnb;

  mapping(address => mapping(address => bool)) public isManager; // output token => manager => is manager

  mapping(address => FeeInfo) public feeInfo; // output token => fee info
  mapping(address => uint256) public firstBuyRefereeFee; // output token => first buy referee fee
  mapping(address => mapping(address => bool)) public isFirstBuy; // output token => referee => is first buy

  mapping(address => mapping(address => InfInfo)) public influencers; // output token token => influencer => influencer info
  mapping(address => mapping(address => address)) public subInfluencerAcceptedLead; // output token token => sub influencer => lead influencer
  mapping(address => mapping(address => address)) public referrers; // output token => referee => referrer

  mapping(address => mapping(address => uint256)) public balances; // reward token => user => amount
  mapping(address => address[]) public hasBalance; // user => list of reward tokens he has balance on
  mapping(address => mapping(address => uint256)) public hasBalanceIndex; // reward token => user => array index in hasBalance
  mapping(address => mapping(address => bool)) public isBalanceIndex; // reward token => user => has array index in hasBalance or not

  mapping(address => uint256) public totalReward; // reward token => total reward

  mapping(address => uint256) public claimingFee; // claim token => claiming fee

  // Removed maps
  // mapping(address => uint256) public referralsCount; // referrer address => referrals count
  // mapping(address => bool) private rewardEnabled;
  // address[] private rewardTokens;

  // TODO: Add ReferralRecorded into unit tests
  event ReferralRecorded(address indexed referee, address indexed referrer, address indexed outputToken);

  // TODO: Add ReferralReward into unit tests
  event ReferralReward(
    address indexed referrer,
    address indexed lead,
    uint256 timestamp,
    address inputToken,
    address outputToken,
    uint256 inputTokenAmount,
    uint256 outputTokenAmount,
    uint256 referrerReward,
    uint256 leadReward,
    uint256 devReward
  );

  constructor(
    address _devAddr,
    address _summitswapRouter,
    address _pancakeswapRouter,
    address _kapex,
    address _busd
  ) public {
    devAddr = _devAddr;
    summitswapRouter = _summitswapRouter;
    pancakeswapRouter = _pancakeswapRouter;
    kapex = _kapex;
    busd = _busd;
    wbnb = ISummitswapRouter02(_summitswapRouter).WETH();
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

  function getBalancesLength(address _user) external view returns (uint256) {
    return hasBalance[_user].length;
  }

  function setClaimingFee(address _claimToken, uint256 _fee) external onlyOwner {
    claimingFee[_claimToken] = _fee;
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

  // Don't use WBNB as a outputToken
  function setFeeInfo(
    address _outputToken,
    address _rewardToken,
    uint256 _refFee,
    uint256 _devFee,
    uint256 _promRefFee,
    uint256 _promStart,
    uint256 _promEnd
  ) external onlyManager(_outputToken) {
    require(_refFee + _devFee <= feeDenominator, "Wrong Fee");

    feeInfo[_outputToken].tokenR = _rewardToken;
    feeInfo[_outputToken].refFee = _refFee;
    feeInfo[_outputToken].devFee = _devFee;
    feeInfo[_outputToken].promRefFee = _promRefFee;
    feeInfo[_outputToken].promStart = _promStart;
    feeInfo[_outputToken].promEnd = _promEnd;
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

  function claimRewardIn(address _outputToken, address _claimToken) public {
    require(
      _claimToken == _outputToken ||
        _claimToken == busd ||
        _claimToken == wbnb ||
        _claimToken == feeInfo[_outputToken].tokenR,
      "You can't claim in that token"
    );

    uint256 balance = balances[_outputToken][msg.sender];

    require(balance > 0, "Insufficient balance");

    balances[_outputToken][msg.sender] = 0;
    isBalanceIndex[_outputToken][msg.sender] = false;
    uint256 rewardTokenIndex = hasBalanceIndex[_outputToken][msg.sender];
    address lastToken = hasBalance[msg.sender][hasBalance[msg.sender].length - 1];
    hasBalanceIndex[lastToken][msg.sender] = rewardTokenIndex;
    hasBalance[msg.sender][rewardTokenIndex] = lastToken;
    hasBalance[msg.sender].pop();
    totalReward[_outputToken] -= balance;

    // TODO: Test claiming fee
    uint256 rewardInClaimingTokenAmount = convertOutputToReward(_outputToken, balance, _claimToken);
    uint256 rewardInClaimingTokenAmountWithFees = rewardInClaimingTokenAmount.sub(
      rewardInClaimingTokenAmount.mul(claimingFee[_claimToken]).div(feeDenominator)
    );

    if (_claimToken == ISummitswapRouter02(summitswapRouter).WETH()) {
      payable(msg.sender).transfer(rewardInClaimingTokenAmountWithFees);
    } else {
      IERC20(_claimToken).transfer(msg.sender, rewardInClaimingTokenAmountWithFees);
    }
  }

  function claimAllRewardsIn(address _claimToken) external {
    uint256 hasBalanceLength = hasBalance[msg.sender].length;
    for (uint256 i = 0; i < hasBalanceLength; i++) {
      claimRewardIn(hasBalance[msg.sender][0], _claimToken);
    }
  }

  function claimAllRewardsInOutput() external {
    uint256 hasBalanceLength = hasBalance[msg.sender].length;
    for (uint256 i = 0; i < hasBalanceLength; i++) {
      claimRewardIn(hasBalance[msg.sender][0], hasBalance[msg.sender][0]);
    }
  }

  function convertOutputToReward(
    address _outputToken,
    uint256 _outputTokenAmount,
    address _claimToken
  ) internal returns (uint256) {
    if (_outputToken == _claimToken) {
      return _outputTokenAmount;
    }

    // if (_claimToken == wbnb) {
    //   address[] memory path = new address[](2);

    //   path[0] = _outputToken;
    //   path[1] = wbnb;
    //   uint256 summitswapAmountsOut = ISummitswapRouter02(summitswapRouter).getAmountsOut(_outputTokenAmount, path)[1];

    //   if (summitswapRouter == pancakeswapRouter) {
    //     return summitswapAmountsOut;
    //   }

    //   path[0] = _outputToken;
    //   path[1] = wbnb;
    //   uint256 pancakeswapAmountsOut = ISummitswapRouter02(pancakeswapRouter).getAmountsOut(_outputTokenAmount, path)[1];

    //   return summitswapAmountsOut >= pancakeswapAmountsOut ? summitswapAmountsOut : pancakeswapAmountsOut;
    // }

    address[] memory path = new address[](3);

    path[0] = _outputToken;
    path[1] = wbnb;
    path[2] = _claimToken;
    uint256 summitswapAmountsOut = ISummitswapRouter02(summitswapRouter).getAmountsOut(_outputTokenAmount, path)[2];

    IERC20(_outputToken).approve(summitswapRouter, _outputTokenAmount);

    ISummitswapRouter02(summitswapRouter).swapExactTokensForTokens(
      _outputTokenAmount,
      summitswapAmountsOut,
      path,
      address(this),
      block.timestamp
    );

    if (summitswapRouter == pancakeswapRouter) {
      return summitswapAmountsOut;
    }

    // path[0] = _outputToken;
    // path[1] = wbnb;
    // path[2] = _claimToken;
    // uint256 pancakeswapAmountsOut = ISummitswapRouter02(pancakeswapRouter).getAmountsOut(_outputTokenAmount, path)[2];

    // return summitswapAmountsOut >= pancakeswapAmountsOut ? summitswapAmountsOut : pancakeswapAmountsOut;
  }

  function increaseBalance(
    address _user,
    address _rewardToken,
    uint256 _amount
  ) internal {
    if (_amount == 0) {
      return;
    }

    if (isBalanceIndex[_rewardToken][_user] == false) {
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

    // if (rewardEnabled[rewardToken] == false) {
    //   rewardEnabled[rewardToken] = true;
    //   rewardTokens.push(rewardToken);
    // }

    uint256 amountR;
    uint256 amountL;

    address leadInfluencer = influencers[_outputToken][referrer].lead;

    if (block.timestamp >= feeInfo[_outputToken].promStart && block.timestamp <= feeInfo[_outputToken].promEnd) {
      amountR = _outputTokenAmount.mul(feeInfo[_outputToken].promRefFee).div(feeDenominator);
    } else {
      amountR = _outputTokenAmount.mul(feeInfo[_outputToken].refFee).div(feeDenominator);
    }

    if (influencers[_outputToken][referrer].isActive && influencers[_outputToken][referrer].isLead) {
      uint256 amountI = _outputTokenAmount.mul(influencers[_outputToken][referrer].leadFee).div(feeDenominator);

      amountR += amountI.mul(influencers[_outputToken][referrer].leadFee).div(feeDenominator);
    } else if (influencers[_outputToken][leadInfluencer].isActive && influencers[_outputToken][leadInfluencer].isLead) {
      uint256 amountI = _outputTokenAmount.mul(influencers[_outputToken][leadInfluencer].leadFee).div(feeDenominator);

      amountL = amountI.mul(influencers[_outputToken][referrer].leadFee).div(feeDenominator);
      amountR += amountI.mul(influencers[_outputToken][referrer].refFee).div(feeDenominator);

      increaseBalance(leadInfluencer, _outputToken, amountL);
    }

    if (isFirstBuy[_outputToken][_user] == false) {
      isFirstBuy[_outputToken][_user] = true;
      uint256 amountU = _outputTokenAmount.mul(firstBuyRefereeFee[_outputToken]).div(feeDenominator);
      IERC20(_outputToken).transfer(_user, amountU);
    }

    increaseBalance(referrer, _outputToken, amountR);

    uint256 amountD = _outputTokenAmount.mul(feeInfo[_outputToken].devFee).div(feeDenominator);
    increaseBalance(devAddr, _outputToken, amountD);

    totalReward[_outputToken] += amountL + amountR + amountD;

    emit ReferralReward(
      referrer,
      leadInfluencer,
      block.timestamp,
      _inputToken,
      _outputToken,
      _inputTokenAmount,
      _outputTokenAmount,
      amountR,
      amountL,
      amountD
    );
  }
}
