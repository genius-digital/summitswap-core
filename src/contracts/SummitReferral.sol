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
  address leadAddress;
  uint256 refFee;
  uint256 leadFee;
}

struct SwapInfo {
  uint256 timestamp;
  address tokenA;
  address tokenB;
  address tokenR; // reward token
  uint256 amountA; // tokenA amount
  uint256 amountB; // tokenB amount
  uint256 amountR; // Ref amount
  uint256 amountD; // Dev amount
}

contract SummitReferral is Ownable {
  using SafeMath for uint256;

  uint256 public feeDenominator = 1000000000; // fee denominator

  address public router;
  address public devAddr;

  mapping(address => FeeInfo) public pairInfo; // pair address => fee info

  mapping(address => bool) public leadInfluencers;
  mapping(address => uint256) public leadInfFee;
  mapping(address => InfInfo) public influencers;

  mapping(address => SwapInfo[]) private swapList; // refer address => swap info

  mapping(address => bool) private rewardEnabled;

  // TODO: Ask do we need this?
  address[] private rewardTokens;

  mapping(address => mapping(address => uint256)) public _balances; // address => token => amount
  mapping(address => mapping(address => bool)) public firstBuy;
  mapping(address => uint256) public firstBuyFee;
  mapping(address => address) public referrers; // referree => token => referrer
  mapping(address => uint256) public totalSharedReward; // tokenR address => total reward amount

  // TODO: Ask do we need this?
  mapping(address => uint256) public referralsCount; // referrer address => referrals count

  event ReferralRecorded(address indexed user, address indexed referrer);
  event ReferralReward(
    address indexed user,
    address indexed tokenR,
    uint256 amountL,
    uint256 amountS,
    uint256 amountU,
    uint256 amountD
  ); // amountL - LeadInfReward, amountS - SubInfReward, amountU - userReward, amountD - devReward

  modifier onlyRouter() {
    require(msg.sender == router, "caller is not the router");
    _;
  }

  function recordReferral(address _referrer) external {
    if (_referrer != address(0) && msg.sender != _referrer && referrers[msg.sender] == address(0)) {
      referrers[msg.sender] = _referrer;
      referralsCount[_referrer] += 1;
      emit ReferralRecorded(msg.sender, _referrer);
    }
  }

  function addLeadInfluencer(address _user, uint256 _fee) external onlyOwner {
    require(_fee <= feeDenominator, "Wrong Fee");
    require(influencers[_user].leadAddress == address(0), "Not able to add sub influencer as a lead influencer");
    leadInfluencers[_user] = true;
    leadInfFee[_user] = _fee;
  }

  function removeLeadInfluencer(address _influencer) external onlyOwner {
    leadInfluencers[_influencer] = false;
  }

  // TODO: Ask if leadinfluencer could add anyone as their subinfluencer without their consent
  function addSubInfluencer(
    address _user,
    uint256 _leadFee,
    uint256 _infFee
  ) external {
    require(leadInfluencers[msg.sender] == true, "No permission to add influencer");
    require(leadInfluencers[_user] == false, "Not able to add lead influencer as a sub influencer");
    require(
      influencers[_user].leadAddress == address(0) || influencers[_user].leadAddress == msg.sender,
      "This address is already added by another lead"
    );
    require(_leadFee + _infFee == feeDenominator, "Wrong Fee");
    influencers[_user].leadAddress = msg.sender;
    influencers[_user].refFee = _infFee;
    influencers[_user].leadFee = _leadFee;
  }

  function claimReward(address _rewardToken) external {
    uint256 balance = _balances[msg.sender][_rewardToken];
    require(balance > 0, "Insufficient balance");
    _balances[msg.sender][_rewardToken] = 0;
    totalSharedReward[_rewardToken] -= balance;
    IERC20(_rewardToken).transfer(msg.sender, balance);
  }

  function getReward(
    address _tokenA,
    uint256 _amountA,
    address rewardToken
  ) internal view returns (uint256) {
    if (_tokenA == rewardToken) {
      return _amountA;
    }

    address wbnb = ISummitswapRouter02(router).WETH();

    if (_tokenA == wbnb) {
      address[] memory path = new address[](2);
      path[0] = wbnb;
      path[1] = rewardToken;
      uint256[] memory amountsOut = ISummitswapRouter02(router).getAmountsOut(_amountA, path);
      return amountsOut[1];
    }

    address[] memory path = new address[](3);
    path[0] = _tokenA;
    path[1] = wbnb;
    path[2] = rewardToken;
    uint256[] memory amountsOut = ISummitswapRouter02(router).getAmountsOut(_amountA, path);
    return amountsOut[2];
  }

  function swap(
    address user,
    address _tokenA,
    address _tokenB,
    uint256 _amountA,
    uint256 _amountB
  ) external onlyRouter {
    address referrer = referrers[user];
    if (referrer == address(0)) {
      return;
    }

    address factory = ISummitswapRouter02(router).factory();
    address pair = ISummitswapFactory(factory).getPair(_tokenA, _tokenB);

    address rewardToken = pairInfo[pair].tokenR;
    if (rewardToken == address(0)) {
      return;
    }

    if (rewardEnabled[rewardToken] == false) {
      rewardEnabled[rewardToken] = true;
      rewardTokens.push(rewardToken);
    }

    uint256 amountReward = getReward(_tokenA, _amountA, rewardToken);
    uint256 amountR;
    uint256 amountL;
    uint256 amountU;

    if (influencers[referrer].leadAddress != address(0)) {
      uint256 amountI = amountReward.mul(leadInfFee[influencers[referrer].leadAddress]).div(feeDenominator);
      amountL = amountI.mul(influencers[referrer].leadFee).div(feeDenominator);
      _balances[influencers[referrer].leadAddress][rewardToken] += amountL;
      swapList[influencers[referrer].leadAddress].push(
        SwapInfo({
          timestamp: block.timestamp,
          tokenA: _tokenA,
          tokenB: _tokenB,
          tokenR: rewardToken,
          amountA: _amountA,
          amountB: _amountB,
          amountR: amountL,
          amountD: 0 // TODO: Why do we throw this event with amountD: 0, on line 227 we calculate amountD
        })
      );
      amountR = amountI.mul(influencers[referrer].refFee).div(feeDenominator);
    } else {
      amountR = amountReward.mul(pairInfo[pair].refFee).div(feeDenominator);
    }

    if (firstBuy[user][_tokenA] == false) {
      firstBuy[user][_tokenA] = true;
      amountU = amountReward.mul(firstBuyFee[_tokenA]);
      amountU = amountU.div(feeDenominator);
      _balances[user][rewardToken] += amountU;
    }

    uint256 amountD = amountReward.mul(pairInfo[pair].devFee).div(feeDenominator);

    _balances[referrer][rewardToken] += amountR;
    _balances[devAddr][rewardToken] += amountD;

    swapList[referrer].push(
      SwapInfo({
        timestamp: block.timestamp,
        tokenA: _tokenA,
        tokenB: _tokenB,
        tokenR: rewardToken,
        amountA: _amountA,
        amountB: _amountB,
        amountR: amountR,
        amountD: amountD
      })
    );

    totalSharedReward[rewardToken] = totalSharedReward[rewardToken] + amountL + amountR + amountU + amountD;
    emit ReferralReward(user, rewardToken, amountL, amountR, amountU, amountD);
  }

  function getSwapList(address _referrer) external view returns (SwapInfo[] memory result) {
    result = swapList[_referrer];
  }

  function getRewardTokens() external view returns (address[] memory result) {
    result = rewardTokens;
  }

  function setFirstBuyFee(address _token, uint256 _fee) external onlyOwner {
    require(_fee <= feeDenominator, "Wrong Fee");
    firstBuyFee[_token] = _fee;
  }

  function setDevAddress(address _devAddr) external onlyOwner {
    devAddr = _devAddr;
  }

  function setRouter(address _router) external onlyOwner {
    router = _router;
  }

  function setFeeInfo(
    address _pair,
    address _rewardToken,
    uint256 _refFee,
    uint256 _devFee
  ) external onlyOwner {
    require(_refFee + _devFee <= feeDenominator, "Wrong Fee");
    pairInfo[_pair].tokenR = _rewardToken;
    pairInfo[_pair].refFee = _refFee;
    pairInfo[_pair].devFee = _devFee;
  }
}
