pragma solidity 0.7.6;
pragma experimental ABIEncoderV2;

import "./shared/Ownable.sol";

pragma experimental ABIEncoderV2;

contract SummitCustomPresale is Ownable {
  address private burnAddress = 0x000000000000000000000000000000000000dEaD;

  address public serviceFeeReciever;
  address[] public contributors;
  address[] public whitelist;
  mapping(address => uint256) private contributorIndex;
  mapping(address => uint256) private whitelistIndex;
  mapping(address => uint256) public bought; // account => boughtAmount
  mapping(address => bool) public isTokenClaimed; // if account has claimed the tokens

  uint256 public constant FEE_DENOMINATOR = 10**9; // fee denominator
  uint256 public bnbFeeType0 = 50000000; // 5%
  uint256 public bnbFeeType1 = 20000000; //2 %
  uint256 public tokenFeeType1 = 20000000; // 2%
  uint256 public emergencyWithdrawFee = 100000000; // 10%
  uint256 public liquidity;

  struct PresaleInfo {
    address presaleToken;
    address router;
    uint256 presalePrice; // in wei
    uint256 listingPrice; // in wei
    uint256 liquidityLockTime; // in seconds
    uint256 minBuyBnb; // in wei
    uint256 maxBuyBnb; // in wei
    uint256 softCap; // in wei
    uint256 hardCap; // in wei
    uint256 liquidityPercentage;
    uint256 startPresaleTime;
    uint256 endPresaleTime;
    uint256 totalBought; // in wei
    uint8 feeType; // 0 == 5% raised Bnb || 1 == 2% raised Bnb and 2% raised tokens
    uint8 refundType; // 0 refund, 1 burn
    bool isWhiteListPhase;
    bool isClaimPhase;
    bool isPresaleCancelled;
    bool isWithdrawCancelledTokens;
  }
  PresaleInfo presale;

  constructor(
    address[4] memory _addresses, // owner, token, router, serviceFeeReciever
    uint256[4] memory _tokenDetails, // _tokenAmount, _presalePrice, _listingPrice, liquidityPercent
    uint256[4] memory _bnbAmounts, // minBuyBnb, maxBuyBnb, softcap, hardcap, _liquidityPercent
    uint256 _liquidityLockTime,
    uint256 _startPresaleTime,
    uint256 _endPresaleTime,
    uint8 _feeType,
    uint8 _refundType,
    bool _isWhiteListPhase
  ) {
    transferOwnership(_addresses[0]);
    serviceFeeReciever = _addresses[3];
    presale.presaleToken = _addresses[1];
    presale.router = _addresses[2];
    presale.presalePrice = _tokenDetails[1];
    presale.listingPrice = _tokenDetails[2];
    presale.liquidityLockTime = _liquidityLockTime;
    presale.minBuyBnb = _bnbAmounts[0];
    presale.maxBuyBnb = _bnbAmounts[1];
    presale.softCap = _bnbAmounts[2];
    presale.hardCap = _bnbAmounts[3];
    presale.liquidityPercentage = (_tokenDetails[3] * FEE_DENOMINATOR) / 100;
    presale.startPresaleTime = _startPresaleTime;
    presale.endPresaleTime = _endPresaleTime;
    presale.feeType = _feeType;
    presale.refundType = _refundType;
    presale.isWhiteListPhase = _isWhiteListPhase;
    presale.totalBought = 0;
    presale.isClaimPhase = false;
    presale.isPresaleCancelled = false;
    presale.isWithdrawCancelledTokens = false;
  }

  // getters

  function getInfo() public view returns (PresaleInfo memory) {
    return presale;
  }

  function showContributors() external view returns (address[] memory) {
    return contributors;
  }

  function getWhitelist() external view returns (address[] memory) {
    return whitelist;
  }

  function calculateBnbToPresaleToken(uint256 _amount, uint256 _price) public view returns (uint256) {
    require(presale.presaleToken != address(0), "Presale token not set");
    uint256 tokens = ((_amount * _price) / 10**18) / (10**(18 - uint256(IERC20(presale.presaleToken).decimals())));
    return tokens;
  }

  function buy() external payable {
    require(block.timestamp >= presale.startPresaleTime, "Presale Not started Yet");
    require(block.timestamp < presale.endPresaleTime, "Presale Ended");

    require(!presale.isClaimPhase, "Claim Phase has started");
    require(
      !presale.isWhiteListPhase || (whitelist[whitelistIndex[msg.sender]] == msg.sender),
      "Address not Whitelisted"
    );

    require(bought[msg.sender] + msg.value <= presale.hardCap, "Cannot buy more than HardCap amount");
    require(msg.value >= presale.minBuyBnb, "msg.value is less than minBuyBnb");
    require(msg.value + bought[msg.sender] <= presale.maxBuyBnb, "msg.value is great than maxBuyBnb");
    isTokenClaimed[msg.sender] = false;
    presale.totalBought += msg.value;
    bought[msg.sender] += msg.value;

    if (contributors.length == 0 || !(contributors[contributorIndex[msg.sender]] == msg.sender)) {
      contributorIndex[msg.sender] = contributors.length;
      contributors.push(msg.sender);
    }
  }

  function claim() external payable {
    require(!presale.isPresaleCancelled, "Presale Cancelled");
    require(
      block.timestamp > presale.endPresaleTime || presale.hardCap == presale.totalBought,
      "Claim hasn't started yet"
    );
    require(presale.isClaimPhase, "Not Claim Phase");
    require(presale.presaleToken != address(0), "Presale token not set");
    require(!isTokenClaimed[msg.sender], "Tokens already Claimed");
    require(presale.totalBought >= presale.softCap, "Total Bought less than softcap");

    uint256 userTokens = calculateBnbToPresaleToken(bought[msg.sender], presale.presalePrice);
    isTokenClaimed[msg.sender] = true;

    require(
      IERC20(presale.presaleToken).balanceOf(address(this)) >= userTokens,
      "Contract doesn't have enough presale tokens. Please contact owner to add more supply"
    );
    IERC20(presale.presaleToken).transfer(msg.sender, userTokens);
  }

  function removeContributor(address _address) internal {
    uint256 index = contributorIndex[_address];
    if (contributors[index] == _address) {
      contributorIndex[contributors[index]] = 0;
      contributors[index] = contributors[contributors.length - 1];
      contributorIndex[contributors[index]] = index == (contributors.length - 1) ? 0 : index;
      contributors.pop();
    }
  }

  function addWhiteList(address[] memory addresses) external {
    for (uint256 index = 0; index < addresses.length; index++) {
      if (whitelist.length == 0 || whitelistIndex[addresses[index]] == 0) {
        whitelistIndex[addresses[index]] = whitelist.length;
        whitelist.push(addresses[index]);
      }
    }
  }

  function removeWhiteList(address[] memory addresses) external {
    for (uint256 index = 0; index < addresses.length; index++) {
      uint256 _whitelistIndex = whitelistIndex[addresses[index]];
      if (whitelist[_whitelistIndex] == addresses[index]) {
        whitelistIndex[whitelist[_whitelistIndex]] = 0;
        whitelist[_whitelistIndex] = whitelist[whitelist.length - 1];
        whitelistIndex[whitelist[_whitelistIndex]] = _whitelistIndex == (whitelist.length - 1) ? 0 : _whitelistIndex;
        whitelist.pop();
      }
    }
  }

  function widhrawBnb() external payable {
    require(presale.isPresaleCancelled, "Presale Not Cancelled");
    require(bought[msg.sender] > 0, "You Dont have any contributions");
    address payable msgSender = payable(msg.sender);
    presale.totalBought = presale.totalBought - bought[msg.sender];
    bought[msg.sender] = 0;
    msgSender.transfer(bought[msg.sender]);
    removeContributor(msg.sender);
  }

  function emergencyWithdraw() external payable {
    require(block.timestamp >= presale.startPresaleTime, "Presale Not started Yet");
    require(block.timestamp < presale.endPresaleTime, "Presale Ended");
    require(bought[msg.sender] > 0, "You Dont have any contributions");
    address payable msgSender = payable(msg.sender);
    uint256 bnbFeeAmount = (bought[msg.sender] * emergencyWithdrawFee) / FEE_DENOMINATOR;

    presale.totalBought = presale.totalBought - bought[msg.sender];
    bought[msg.sender] = 0;
    msgSender.transfer(bought[msg.sender] - bnbFeeAmount);
    payable(serviceFeeReciever).transfer(bnbFeeAmount);
    removeContributor(msg.sender);
  }

  //////////////////
  // Owner functions

  function finalize() external payable onlyOwner {
    require(block.timestamp > presale.endPresaleTime || presale.hardCap == presale.totalBought, "Presale Not Ended");
    require(presale.totalBought >= presale.softCap, "Total bought is less than softCap Presale failed");

    uint256 feeBnb = presale.feeType == 0
      ? ((presale.totalBought * bnbFeeType0) / FEE_DENOMINATOR)
      : ((presale.totalBought * bnbFeeType1) / FEE_DENOMINATOR);
    uint256 feeToken = presale.feeType == 0 ? 0 : calculateBnbToPresaleToken(feeBnb, presale.presalePrice);
    uint256 raisedTokenAmount = calculateBnbToPresaleToken(presale.totalBought, presale.presalePrice);
    // if in future also subtract the tokens for liquidity
    uint256 contractBal = IERC20(presale.presaleToken).balanceOf(address(this));
    require(contractBal > (raisedTokenAmount + feeToken), "Contract does not have enough Tokens");
    uint256 remainingTokenAmount = contractBal - raisedTokenAmount - feeToken;

    presale.isClaimPhase = true;

    payable(serviceFeeReciever).transfer(feeBnb);
    if (feeToken > 0) {
      IERC20(presale.presaleToken).transfer(serviceFeeReciever, feeToken);
    }
    if (remainingTokenAmount > 0) {
      if (presale.refundType == 0) {
        IERC20(presale.presaleToken).transfer(msg.sender, remainingTokenAmount);
      } else {
        IERC20(presale.presaleToken).transfer(burnAddress, remainingTokenAmount);
      }
    }
  }

  function withdrawCancelledTokens() external onlyOwner {
    require(!presale.isWithdrawCancelledTokens, "Cancelled Tokens Already Withdrawn");
    require(presale.isPresaleCancelled, "Presale Not Cancelled");
    require(IERC20(presale.presaleToken).balanceOf(address(this)) > 0, "You Dont have Any Tokens to Withdraw");
    presale.isWithdrawCancelledTokens = true;
    uint256 tokenAmount = IERC20(presale.presaleToken).balanceOf(address(this));
    IERC20(presale.presaleToken).transfer(msg.sender, tokenAmount);
  }

  function enablewhitelist(bool value) external onlyOwner {
    presale.isWhiteListPhase = value;
  }

  function cancelPresale() external onlyOwner {
    presale.isClaimPhase = false;
    presale.isPresaleCancelled = true;
  }

  function setServiceFeeReciver(address _feeReciever) external onlyOwner {
    serviceFeeReciever = _feeReciever;
  }

  function withdrawBnb(uint256 _amount, address _receiver) external payable onlyOwner {
    payable(_receiver).transfer(_amount);
  }

  function setOwner(address _owner) external onlyOwner {
    transferOwnership(_owner);
  }
}
