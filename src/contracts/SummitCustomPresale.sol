// SPDX-License-Identifier: UNLICENSED
// Developed by: dxsoftware.net

pragma solidity 0.7.6;

import "hardhat/console.sol";

pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./libraries/BokkyPooBahsDateTimeLibrary.sol";
import "./interfaces/ISummitswapRouter02.sol";
import "./interfaces/IERC20.sol";
import "./shared/Ownable.sol";

contract SummitCustomPresale is Ownable, AccessControl, ReentrancyGuard {
  using BokkyPooBahsDateTimeLibrary for uint256;

  bytes32 public constant ADMIN = keccak256("ADMIN");
  address private constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

  address public serviceFeeReceiver;
  address[] public contributors;
  address[] public whitelist;
  mapping(address => uint256) private contributorIndex;
  mapping(address => uint256) private whitelistIndex;
  mapping(address => uint256) public totalClaimToken;
  mapping(address => uint256) public bought; // account => boughtAmount

  uint256 public constant FEE_DENOMINATOR = 10**9; // fee denominator
  uint256 public startDateClaim; // Timestamp

  struct FeeInfo {
    address raisedTokenAddress; // BNB/BUSD/..
    uint256 feeRaisedToken; // BNB/BUSD/...
    uint256 feePresaleToken; // presaleToken
    uint256 emergencyWithdrawFee;
  }

  struct PresaleInfo {
    address presaleToken;
    address router0; // router SummitSwap
    address router1; // router pancakeSwap
    address pairToken;
    uint256 presalePrice; // in wei
    uint256 listingPrice; // in wei
    uint256 liquidityLockTime; // in seconds
    uint256 minBuy; // in wei
    uint256 maxBuy; // in wei
    uint256 softCap; // in wei
    uint256 hardCap; // in wei
    uint256 liquidityPercentage;
    uint256 startPresaleTime;
    uint256 endPresaleTime;
    uint256 claimIntervalDay;
    uint256 claimIntervalHour;
    uint256 totalBought; // in wei
    uint256 maxClaimPercentage;
    uint8 refundType; // 0 refund, 1 burn
    uint8 listingChoice; // 0 100% SS, 1 100% PS, 2 (75% SS & 25% PS), 3 (75% PK & 25% SS)
    bool isWhiteListPhase;
    bool isClaimPhase;
    bool isPresaleCancelled;
    bool isWithdrawCancelledTokens;
    bool isVestingEnabled;
    bool isApproved;
  }

  PresaleInfo private presale;
  FeeInfo private feeInfo;

  constructor(
    address[8] memory _addresses, // owner, token, raisedTokenAddress, pairToken, SummitSwap, PancakeSwap, serviceFeeReceiver, admin
    uint256[3] memory _tokenDetails, // presalePrice, listingPrice, liquidityPercent
    uint256[4] memory _bnbAmounts, // minBuy, maxBuy, softcap, hardcap
    uint256[4] memory _presaleTimeDetails, // startPresaleTime, endPresaleTime, claimIntervalDay, claimIntervalHour
    uint256 _liquidityLockTime,
    uint256 _maxClaimPercentage,
    uint8 _refundType,
    uint8 _listingChoice,
    bool _isWhiteListPhase,
    bool _isVestingEnabled
  ) {
    _transferOwnership(_addresses[0]);
    serviceFeeReceiver = _addresses[6];
    presale.router0 = _addresses[4];
    presale.router1 = _addresses[5];
    presale.presaleToken = _addresses[1];
    presale.pairToken = _addresses[3];
    presale.presalePrice = _tokenDetails[0];
    presale.listingPrice = _tokenDetails[1];
    presale.liquidityPercentage = (_tokenDetails[2] * FEE_DENOMINATOR) / 100;
    presale.liquidityLockTime = _liquidityLockTime;
    presale.minBuy = _bnbAmounts[0];
    presale.maxBuy = _bnbAmounts[1];
    presale.softCap = _bnbAmounts[2];
    presale.hardCap = _bnbAmounts[3];
    presale.startPresaleTime = _presaleTimeDetails[0];
    presale.endPresaleTime = _presaleTimeDetails[1];
    presale.claimIntervalDay = _presaleTimeDetails[2];
    presale.claimIntervalHour = _presaleTimeDetails[3];
    presale.maxClaimPercentage = (_maxClaimPercentage * FEE_DENOMINATOR) / 100;
    presale.refundType = _refundType;
    presale.listingChoice = _listingChoice;
    presale.isWhiteListPhase = _isWhiteListPhase;
    presale.isVestingEnabled = _isVestingEnabled;

    feeInfo.raisedTokenAddress = _addresses[2]; // address(0) native coin
    feeInfo.feeRaisedToken = 50000000; // 5%
    feeInfo.feePresaleToken = 20000000; // 2%
    feeInfo.emergencyWithdrawFee = 100000000; // 10%

    _setupRole(ADMIN, msg.sender);
    _setupRole(ADMIN, _addresses[7]);
    _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
  }

  modifier validContribution() {
    require(block.timestamp >= presale.startPresaleTime, "Presale Not started Yet");
    require(block.timestamp < presale.endPresaleTime, "Presale Ended");

    require(!presale.isClaimPhase, "Claim Phase has started");
    require(
      !presale.isWhiteListPhase || (whitelist.length > 0 && whitelist[whitelistIndex[msg.sender]] == msg.sender),
      "Address not Whitelisted"
    );
    _;
  }

  modifier onlyAdmin() {
    require(hasRole(ADMIN, msg.sender), "msg.sender does not have ADMIN role");
    _;
  }

  // getters

  function getFeeInfo() external view returns (FeeInfo memory) {
    return feeInfo;
  }

  function getPresaleInfo() external view returns (PresaleInfo memory) {
    return presale;
  }

  function getContributors() external view returns (address[] memory) {
    return contributors;
  }

  function getWhitelist() external view returns (address[] memory) {
    return whitelist;
  }

  function isPresaleCancelled() external view returns (bool) {
    return presale.isPresaleCancelled;
  }

  function calculateBnbToPresaleToken(uint256 _amount, uint256 _price) public view returns (uint256) {
    require(presale.presaleToken != address(0), "Presale token not set");

    uint256 raisedTokenDecimals = feeInfo.raisedTokenAddress == address(0)
      ? 18
      : uint256(IERC20(feeInfo.raisedTokenAddress).decimals());

    uint256 tokens = ((_amount * _price) / 10**18) /
      (10**(raisedTokenDecimals - uint256(IERC20(presale.presaleToken).decimals())));

    return tokens;
  }

  function getAvailableTokenToClaim(address _address) public view returns (uint256) {
    uint256 totalToken = calculateBnbToPresaleToken(bought[_address], presale.presalePrice);
    return ((totalToken * getTotalClaimPercentage()) / FEE_DENOMINATOR) - totalClaimToken[_address];
  }

  function getTotalClaimPercentage() private view returns (uint256) {
    uint256 currentClaimDate = block.timestamp;

    if (startDateClaim == 0 || startDateClaim > currentClaimDate) return 0;

    if (!presale.isVestingEnabled) {
      return FEE_DENOMINATOR;
    }

    (, , uint256 startClaimDay, , , ) = BokkyPooBahsDateTimeLibrary.timestampToDateTime(startDateClaim);
    (, , uint256 day, uint256 hour, , ) = BokkyPooBahsDateTimeLibrary.timestampToDateTime(currentClaimDate);
    uint256 interval = BokkyPooBahsDateTimeLibrary.diffMonths(startDateClaim, currentClaimDate);
    if (presale.claimIntervalDay > startClaimDay) {
      interval += 1;
    }
    if (day > presale.claimIntervalDay || (day == presale.claimIntervalDay && hour >= presale.claimIntervalHour)) {
      interval += 1;
    }
    uint256 totalIntervalPercentage = interval * presale.maxClaimPercentage > FEE_DENOMINATOR
      ? FEE_DENOMINATOR
      : interval * presale.maxClaimPercentage;
    return totalIntervalPercentage;
  }

  function buy() external payable validContribution nonReentrant {
    require(feeInfo.raisedTokenAddress == address(0), "Raised token is not native coin");
    require(bought[msg.sender] + msg.value <= presale.hardCap, "Cannot buy more than HardCap amount");
    require(msg.value >= presale.minBuy, "msg.value is less than minBuy");
    require(msg.value + bought[msg.sender] <= presale.maxBuy, "msg.value is great than maxBuy");
    presale.totalBought += msg.value;
    bought[msg.sender] += msg.value;

    if (contributors.length == 0 || !(contributors[contributorIndex[msg.sender]] == msg.sender)) {
      contributorIndex[msg.sender] = contributors.length;
      contributors.push(msg.sender);
    }
  }

  function buyCustomCurrency(uint256 contributionAmount) external validContribution nonReentrant {
    require(feeInfo.raisedTokenAddress != address(0), "Raised token is native coin");
    require(bought[msg.sender] + contributionAmount <= presale.hardCap, "Cannot buy more than HardCap amount");
    require(contributionAmount >= presale.minBuy, "contributionAmount is less than minBuy");
    require(contributionAmount + bought[msg.sender] <= presale.maxBuy, "contributionAmount is great than maxBuy");
    require(
      IERC20(feeInfo.raisedTokenAddress).allowance(msg.sender, address(this)) >= contributionAmount,
      "Increase allowance to contribute"
    );
    IERC20(feeInfo.raisedTokenAddress).transferFrom(msg.sender, address(this), contributionAmount);
    presale.totalBought += contributionAmount;
    bought[msg.sender] += contributionAmount;

    if (contributors.length == 0 || !(contributors[contributorIndex[msg.sender]] == msg.sender)) {
      contributorIndex[msg.sender] = contributors.length;
      contributors.push(msg.sender);
    }
  }

  function claim(uint256 requestedAmount) external nonReentrant {
    require(!presale.isPresaleCancelled, "Presale Cancelled");
    require(
      block.timestamp > presale.endPresaleTime || presale.hardCap == presale.totalBought,
      "Claim hasn't started yet"
    );
    require(presale.isClaimPhase, "Not Claim Phase");
    require(bought[msg.sender] > 0, "You do not have any tokens to claim");

    uint256 remainingToken = calculateBnbToPresaleToken(bought[msg.sender], presale.presalePrice) -
      totalClaimToken[msg.sender];
    require(remainingToken >= requestedAmount, "User don't have enough token to claim");

    require(
      IERC20(presale.presaleToken).balanceOf(address(this)) >= requestedAmount,
      "Contract doesn't have enough presale tokens. Please contact owner to add more supply"
    );

    require(
      (requestedAmount <= getAvailableTokenToClaim(msg.sender)),
      "User claim more than max claim amount in this interval"
    );

    totalClaimToken[msg.sender] += requestedAmount;
    IERC20(presale.presaleToken).transfer(msg.sender, requestedAmount);
  }

  function removeContributor(address _address) private {
    uint256 index = contributorIndex[_address];
    if (contributors[index] == _address) {
      contributorIndex[contributors[index]] = 0;
      contributors[index] = contributors[contributors.length - 1];
      contributorIndex[contributors[index]] = index == (contributors.length - 1) ? 0 : index;
      contributors.pop();
    }
  }

  receive() external payable {}

  function addLiquidity(uint256 _amountToken, uint256 _amountRaised) internal {
    uint256 listingSS = 100; // listing percentage summitswap
    uint256 listingPS = 100; // listing percentage pancake
    if (presale.listingChoice == 0) {
      listingPS = 0;
    } else if (presale.listingChoice == 1) {
      listingSS = 0;
    } else if (presale.listingChoice == 2) {
      listingSS = 75;
      listingPS = 25;
    } else {
      listingSS = 25;
      listingPS = 75;
    }
    if (listingSS > 0) addLiquiditySS((_amountToken * listingSS) / 100, (_amountRaised * listingSS) / 100);
    if (listingPS > 0) {
      if (feeInfo.raisedTokenAddress == address(0)) {
        _addLiquidityETH((_amountToken * listingPS) / 100, (_amountRaised * listingPS) / 100, presale.router1);
      } else {
        _addLiquidityTokens(
          (_amountToken * listingPS) / 100,
          (_amountRaised * listingPS) / 100,
          presale.pairToken,
          presale.router1
        );
      }
    }
  }

  function addLiquiditySS(uint256 amountToken, uint256 amountRaised) private {
    if (feeInfo.raisedTokenAddress == address(0)) {
      if (presale.pairToken == address(0)) {
        _addLiquidityETH(amountToken, amountRaised, presale.router0);
      } else {
        swapETHForTokenAndLiquify(amountToken, amountRaised);
      }
    } else {
      if (presale.pairToken == address(0)) {
        swapTokenForETHAndLiquify(amountToken, amountRaised);
      } else {
        if (feeInfo.raisedTokenAddress == presale.pairToken) {
          _addLiquidityTokens(amountToken, amountRaised, presale.pairToken, presale.router0);
        } else {
          swapTokenForTokenAndLiquify(amountToken, amountRaised);
        }
      }
    }
  }

  function swapETHForTokenAndLiquify(uint256 amountToken, uint256 amountRaised) private {
    address[] memory path = new address[](2);
    path[0] = ISummitswapRouter02(presale.router0).WETH();
    path[1] = presale.pairToken;

    uint256[] memory amounts = ISummitswapRouter02(presale.router0).swapExactETHForTokens{value: amountRaised}(
      0,
      path,
      address(this),
      block.timestamp
    );
    _addLiquidityTokens(amountToken, amounts[1], presale.pairToken, presale.router0);
  }

  function swapTokenForETHAndLiquify(uint256 amountToken, uint256 amountRaised) private {
    address[] memory path = new address[](2);
    path[0] = feeInfo.raisedTokenAddress;
    path[1] = ISummitswapRouter02(presale.router0).WETH();

    IERC20(feeInfo.raisedTokenAddress).approve(presale.router0, amountRaised);
    uint256[] memory amounts = ISummitswapRouter02(presale.router0).swapExactTokensForETH(
      amountRaised,
      0,
      path,
      address(this),
      block.timestamp
    );
    _addLiquidityETH(amountToken, amounts[1], presale.router0);
  }

  function swapTokenForTokenAndLiquify(uint256 amountToken, uint256 amountRaised) private {
    address[] memory path = new address[](3);
    path[0] = feeInfo.raisedTokenAddress;
    path[1] = ISummitswapRouter02(presale.router0).WETH();
    path[2] = presale.pairToken;

    IERC20(feeInfo.raisedTokenAddress).approve(presale.router0, amountRaised);
    uint256[] memory amounts = ISummitswapRouter02(presale.router0).swapExactTokensForTokens(
      amountRaised,
      0,
      path,
      address(this),
      block.timestamp
    );
    _addLiquidityTokens(amountToken, amounts[2], presale.pairToken, presale.router0);
  }

  function _addLiquidityETH(
    uint256 amountToken,
    uint256 amountBNB,
    address router
  ) private {
    IERC20(presale.presaleToken).approve(router, amountToken);
    ISummitswapRouter02(router).addLiquidityETH{value: amountBNB}(
      presale.presaleToken,
      amountToken,
      0,
      0,
      address(this),
      block.timestamp
    );
  }

  function _addLiquidityTokens(
    uint256 amountToken,
    uint256 amountRaised,
    address pairAddress,
    address router
  ) private {
    IERC20(presale.presaleToken).approve(router, amountToken);
    IERC20(pairAddress).approve(router, amountRaised);
    ISummitswapRouter02(router).addLiquidity(
      presale.presaleToken,
      pairAddress,
      amountToken,
      amountRaised,
      0,
      0,
      address(this),
      block.timestamp
    );
  }

  function withdrawRaisedToken() external nonReentrant {
    require(presale.isPresaleCancelled, "Presale Not Cancelled");
    require(bought[msg.sender] > 0, "You do not have any contributions");

    if (feeInfo.raisedTokenAddress == address(0)) {
      payable(msg.sender).transfer(bought[msg.sender]);
    } else {
      IERC20(feeInfo.raisedTokenAddress).transfer(msg.sender, bought[msg.sender]);
    }

    presale.totalBought = presale.totalBought - bought[msg.sender];
    bought[msg.sender] = 0;
    removeContributor(msg.sender);
  }

  function emergencyWithdrawRaisedToken() external nonReentrant {
    require(block.timestamp >= presale.startPresaleTime, "Presale Not started Yet");
    require(block.timestamp < presale.endPresaleTime, "Presale Ended");
    require(bought[msg.sender] > 0, "You do not have any contributions");
    require(!presale.isPresaleCancelled, "Presale has been cancelled");
    require(!presale.isClaimPhase, "Presale claim phase");

    uint256 feeAmount = (bought[msg.sender] * feeInfo.emergencyWithdrawFee) / FEE_DENOMINATOR;

    if (feeInfo.raisedTokenAddress == address(0)) {
      payable(msg.sender).transfer(bought[msg.sender] - feeAmount);
      payable(serviceFeeReceiver).transfer(feeAmount);
    } else {
      IERC20(feeInfo.raisedTokenAddress).transfer(msg.sender, bought[msg.sender] - feeAmount);
      IERC20(feeInfo.raisedTokenAddress).transfer(serviceFeeReceiver, feeAmount);
    }
    presale.totalBought = presale.totalBought - bought[msg.sender];
    bought[msg.sender] = 0;
    removeContributor(msg.sender);
  }

  //////////////////
  // Owner functions

  function addWhiteList(address[] memory addresses) external onlyOwner {
    for (uint256 index = 0; index < addresses.length; index++) {
      if (whitelist.length == 0 || (whitelistIndex[addresses[index]] == 0 && addresses[index] != whitelist[0])) {
        whitelistIndex[addresses[index]] = whitelist.length;
        whitelist.push(addresses[index]);
      }
    }
  }

  function removeWhiteList(address[] memory addresses) external onlyOwner {
    for (uint256 index = 0; index < addresses.length; index++) {
      uint256 _whitelistIndex = whitelistIndex[addresses[index]];
      if (whitelist.length > 0 && whitelist[_whitelistIndex] == addresses[index]) {
        whitelistIndex[whitelist[_whitelistIndex]] = 0;
        whitelist[_whitelistIndex] = whitelist[whitelist.length - 1];
        whitelistIndex[whitelist[_whitelistIndex]] = _whitelistIndex == (whitelist.length - 1) ? 0 : _whitelistIndex;
        whitelist.pop();
      }
    }
  }

  function finalize() external payable onlyOwner nonReentrant {
    require(block.timestamp > presale.endPresaleTime || presale.hardCap == presale.totalBought, "Presale Not Ended");
    require(presale.totalBought >= presale.softCap, "Total bought is less than softCap. Presale failed");

    uint256 feeRaisedToken = (presale.totalBought * feeInfo.feeRaisedToken) / FEE_DENOMINATOR;
    uint256 feePresaleToken = calculateBnbToPresaleToken(
      (presale.totalBought * feeInfo.feePresaleToken) / FEE_DENOMINATOR,
      presale.presalePrice
    );

    uint256 raisedTokenAmount = calculateBnbToPresaleToken(presale.totalBought, presale.presalePrice);
    uint256 liquidityTokens = (
      calculateBnbToPresaleToken(
        (presale.totalBought * presale.liquidityPercentage) / FEE_DENOMINATOR,
        presale.listingPrice
      )
    ) - feePresaleToken;

    uint256 contractBal = IERC20(presale.presaleToken).balanceOf(address(this));
    require(
      contractBal >= (raisedTokenAmount + feePresaleToken + liquidityTokens),
      "Contract does not have enough Tokens"
    );
    uint256 remainingTokenAmount = contractBal - liquidityTokens - raisedTokenAmount - feePresaleToken;
    presale.isClaimPhase = true;
    startDateClaim = block.timestamp;

    addLiquidity(
      liquidityTokens,
      ((presale.totalBought * presale.liquidityPercentage) / FEE_DENOMINATOR) - feeRaisedToken
    );

    if (feeInfo.raisedTokenAddress == address(0)) {
      payable(serviceFeeReceiver).transfer(feeRaisedToken);
    } else {
      IERC20(feeInfo.raisedTokenAddress).transfer(serviceFeeReceiver, feeRaisedToken);
    }

    if (feePresaleToken > 0) {
      IERC20(presale.presaleToken).transfer(serviceFeeReceiver, feePresaleToken);
    }

    if (remainingTokenAmount > 0) {
      if (presale.refundType == 0) {
        IERC20(presale.presaleToken).transfer(msg.sender, remainingTokenAmount);
      } else {
        IERC20(presale.presaleToken).transfer(BURN_ADDRESS, remainingTokenAmount);
      }
    }
  }

  function withdrawCancelledTokens() external onlyOwner {
    require(!presale.isWithdrawCancelledTokens, "Cancelled Tokens Already Withdrawn");
    require(presale.isPresaleCancelled, "Presale Not Cancelled");
    require(IERC20(presale.presaleToken).balanceOf(address(this)) > 0, "You do not have Any Tokens to Withdraw");
    uint256 tokenAmount = IERC20(presale.presaleToken).balanceOf(address(this));
    presale.isWithdrawCancelledTokens = true;
    IERC20(presale.presaleToken).transfer(msg.sender, tokenAmount);
  }

  function withdrawLpTokens(address[2] memory addresses) external onlyOwner {
    require(startDateClaim != 0, "Claim phase has not started");
    require(startDateClaim + presale.liquidityLockTime < block.timestamp, "Lp Tokens are locked");
    require(addresses[0] != presale.presaleToken && addresses[1] != presale.presaleToken, "address is presale token");
    require(
      addresses[0] != feeInfo.raisedTokenAddress && addresses[1] != feeInfo.raisedTokenAddress,
      "address is raisedTokenAddress"
    );
    uint256 lpBal0 = IERC20(addresses[0]).balanceOf(address(this));
    uint256 lpBal1 = IERC20(addresses[1]).balanceOf(address(this));
    if (lpBal0 > 0) IERC20(addresses[0]).transfer(msg.sender, lpBal0);
    if (lpBal1 > 0) IERC20(addresses[1]).transfer(msg.sender, lpBal1);
  }

  function setPresaleInfo(
    address _pairToken,
    uint256[3] memory _tokenDetails, // presalePrice, listingPrice, liquidityPercent
    uint256[4] memory _bnbAmounts, // minBuy, maxBuy, softcap, hardcap
    uint256[4] memory _presaleTimeDetails, // startPresaleTime, endPresaleTime, claimIntervalDay, claimIntervalHour
    uint256 _liquidityLockTime,
    uint256 _maxClaimPercentage,
    uint8 _refundType,
    uint8 _listingChoice,
    bool _isWhiteListPhase,
    bool _isVestingEnabled
  ) external onlyAdmin {
    require(!presale.isApproved, "Presale is Approved");
    require(_presaleTimeDetails[0] > block.timestamp, "Presale startTime > block.timestamp");
    require(_presaleTimeDetails[1] > _presaleTimeDetails[0], "Presale End time > presale start time");
    require(_presaleTimeDetails[2] >= 1 && _presaleTimeDetails[2] <= 31, "claimIntervalDay should be between 1 & 31");
    require(_presaleTimeDetails[3] >= 0 && _presaleTimeDetails[2] <= 23, "claimIntervalHour should be between 0 & 23");
    require(_bnbAmounts[0] < _bnbAmounts[1], "MinBuy should be less than maxBuy");
    require(_bnbAmounts[2] >= (_bnbAmounts[3] * 50) / 100, "Softcap should be greater than or equal to 50% of hardcap");
    require(_tokenDetails[2] >= 25 && _tokenDetails[2] <= 100, "Liquidity Percentage should be between 25% & 100%");
    require(_maxClaimPercentage > 0 && _maxClaimPercentage <= 100, "maxClaimPercentage should be between 0 & 100");
    require(_refundType == 0 || _refundType == 1, "refundType should be between 0 & 100");
    require(_listingChoice >= 0 && _listingChoice <= 3, "listingChoice should be between 0 & 3");

    presale.pairToken = _pairToken;
    presale.presalePrice = _tokenDetails[0];
    presale.listingPrice = _tokenDetails[1];
    presale.liquidityPercentage = (_tokenDetails[2] * FEE_DENOMINATOR) / 100;
    presale.liquidityLockTime = _liquidityLockTime;
    presale.minBuy = _bnbAmounts[0];
    presale.maxBuy = _bnbAmounts[1];
    presale.softCap = _bnbAmounts[2];
    presale.hardCap = _bnbAmounts[3];
    presale.startPresaleTime = _presaleTimeDetails[0];
    presale.endPresaleTime = _presaleTimeDetails[1];
    presale.claimIntervalDay = _presaleTimeDetails[2];
    presale.claimIntervalHour = _presaleTimeDetails[3];
    presale.maxClaimPercentage = (_maxClaimPercentage * FEE_DENOMINATOR) / 100;
    presale.refundType = _refundType;
    presale.listingChoice = _listingChoice;
    presale.isWhiteListPhase = _isWhiteListPhase;
    presale.isVestingEnabled = _isVestingEnabled;
  }

  function setFeeInfo(
    uint256 feeRaisedToken,
    uint256 feePresaleToken,
    uint256 emergencyWithdrawFee,
    address raisedTokenAddress
  ) external onlyAdmin {
    require(!presale.isApproved, "Presale is Approved");
    feeInfo.feeRaisedToken = feeRaisedToken;
    feeInfo.feePresaleToken = feePresaleToken;
    feeInfo.emergencyWithdrawFee = emergencyWithdrawFee;
    feeInfo.raisedTokenAddress = raisedTokenAddress; // address(0) native coin
  }

  function approvePresale() external onlyAdmin {
    presale.isApproved = true;
  }

  function toggleWhitelistPhase() external onlyOwner {
    presale.isWhiteListPhase = !presale.isWhiteListPhase;
  }

  function cancelPresale() external onlyOwner {
    presale.isClaimPhase = false;
    presale.isPresaleCancelled = true;
  }

  function setServiceFeeReceiver(address _feeReceiver) external onlyAdmin {
    serviceFeeReceiver = _feeReceiver;
  }

  function withdrawBNBOwner(uint256 _amount, address _receiver) external onlyOwner {
    require(presale.isClaimPhase, "Claim phase has not started");
    payable(_receiver).transfer(_amount);
  }

  function withdrawRaisedTokenOwner(uint256 _amount, address _receiver) external onlyOwner {
    require(presale.isClaimPhase, "Claim phase has not started");
    IERC20(feeInfo.raisedTokenAddress).transfer(_receiver, _amount);
  }
}
