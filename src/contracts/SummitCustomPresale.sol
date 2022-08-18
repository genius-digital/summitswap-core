// SPDX-License-Identifier: UNLICENSED
// Developed by: dxsoftware.net

pragma solidity 0.8.6;

pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./libraries/BokkyPooBahsDateTimeLibrary.sol";
import "./interfaces/ISummitswapRouter02.sol";
import "./interfaces/IERC20.sol";
import "../structs/PresaleInfo.sol";
import "../structs/PresaleFeeInfo.sol";
import "./shared/Ownable.sol";

contract SummitCustomPresale is Ownable, ReentrancyGuard {
  using BokkyPooBahsDateTimeLibrary for uint256;

  address private constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

  address public serviceFeeReceiver;
  address public defaultAdmin;
  address[] public contributors;
  address[] public whitelist;
  mapping(address => uint256) private contributorIndex;
  mapping(address => uint256) private whitelistIndex;
  mapping(address => uint256) public totalClaimToken;
  mapping(address => uint256) public bought; // account => boughtAmount
  mapping(address => bool) public isAdmin;

  string[8] private projectDetails;

  uint256 public constant FEE_DENOMINATOR = 10**9; // fee denominator
  uint256 public startDateClaim; // Timestamp

  PresaleInfo private presale;
  PresaleFeeInfo private feeInfo;

  function initialize(
    string[8] memory _projectDetails,
    PresaleInfo memory _presale,
    PresaleFeeInfo memory _feeInfo,
    address _serviceFeeReceiver,
    address _owner
  ) external {
    require(presale.startPresaleTime == 0, "Presale is Initialized.");
    projectDetails = _projectDetails;
    presale = _presale;
    feeInfo = _feeInfo;
    serviceFeeReceiver = _serviceFeeReceiver;
    _transferOwnership(_owner);

    presale.totalBought = 0;
    presale.isApproved = false;
    presale.isPresaleCancelled = false;
    presale.isClaimPhase = false;
    presale.isWithdrawCancelledTokens = false;

    isAdmin[msg.sender] = true;
    defaultAdmin = msg.sender;
  }

  modifier canBuy() {
    require(presale.isApproved, "Presale not Approved");
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
    require(isAdmin[msg.sender] || defaultAdmin == msg.sender, "Only admin or defaultAdmin can call this function");
    _;
  }

  modifier onlyDefaultAdmin() {
    require(defaultAdmin == msg.sender, "Only defaultAdmin can call this function");
    _;
  }

  // getters

  function getProjectsDetails() external view returns (string[8] memory) {
    return projectDetails;
  }

  function getFeeInfo() external view returns (PresaleFeeInfo memory) {
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

    uint256 pTDecimals = feeInfo.paymentToken == address(0) ? 18 : uint256(IERC20(feeInfo.paymentToken).decimals());

    uint256 tokens = ((_amount * _price) / 10**pTDecimals);

    return tokens * 10**((IERC20(presale.presaleToken).decimals()) - 18);
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

  function addContributor(address _address) private {
    if (contributors.length == 0 || !(contributors[contributorIndex[_address]] == _address)) {
      contributorIndex[_address] = contributors.length;
      contributors.push(_address);
    }
  }

  function buy() external payable canBuy nonReentrant {
    require(feeInfo.paymentToken == address(0), "Payment token is not native coin");
    require(bought[msg.sender] + msg.value <= presale.hardCap, "Cannot buy more than HardCap amount");
    require(msg.value >= presale.minBuy, "Cannot buy less than minBuy");
    require(msg.value + bought[msg.sender] <= presale.maxBuy, "Cannot buy more than maxBuy");
    presale.totalBought += msg.value;
    bought[msg.sender] += msg.value;

    addContributor(msg.sender);
  }

  function buyCustomCurrency(uint256 contributionAmount) external canBuy nonReentrant {
    require(feeInfo.paymentToken != address(0), "Payment token is native coin");
    require(bought[msg.sender] + contributionAmount <= presale.hardCap, "Cannot buy more than HardCap amount");
    require(contributionAmount >= presale.minBuy, "contributionAmount is less than minBuy");
    require(contributionAmount + bought[msg.sender] <= presale.maxBuy, "contributionAmount is more than maxBuy");
    require(
      IERC20(feeInfo.paymentToken).allowance(msg.sender, address(this)) >= contributionAmount,
      "Increase allowance to contribute"
    );
    IERC20(feeInfo.paymentToken).transferFrom(msg.sender, address(this), contributionAmount);
    presale.totalBought += contributionAmount;
    bought[msg.sender] += contributionAmount;

    addContributor(msg.sender);
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
      if (feeInfo.paymentToken == address(0)) {
        _addLiquidityETH((_amountToken * listingPS) / 100, (_amountRaised * listingPS) / 100, presale.router1);
      } else {
        _addLiquidityTokens(
          (_amountToken * listingPS) / 100,
          (_amountRaised * listingPS) / 100,
          presale.listingToken,
          presale.router1
        );
      }
    }
  }

  function addLiquiditySS(uint256 amountToken, uint256 amountRaised) private {
    if (feeInfo.paymentToken == address(0)) {
      if (presale.listingToken == address(0)) {
        _addLiquidityETH(amountToken, amountRaised, presale.router0);
      } else {
        swapETHForTokenAndLiquify(amountToken, amountRaised);
      }
    } else {
      if (presale.listingToken == address(0)) {
        swapTokenForETHAndLiquify(amountToken, amountRaised);
      } else {
        if (feeInfo.paymentToken == presale.listingToken) {
          _addLiquidityTokens(amountToken, amountRaised, presale.listingToken, presale.router0);
        } else {
          swapTokenForTokenAndLiquify(amountToken, amountRaised);
        }
      }
    }
  }

  function swapETHForTokenAndLiquify(uint256 amountToken, uint256 amountRaised) private {
    address[] memory path = new address[](2);
    path[0] = ISummitswapRouter02(presale.router0).WETH();
    path[1] = presale.listingToken;

    uint256[] memory amounts = ISummitswapRouter02(presale.router0).swapExactETHForTokens{value: amountRaised}(
      0,
      path,
      address(this),
      block.timestamp
    );
    _addLiquidityTokens(amountToken, amounts[1], presale.listingToken, presale.router0);
  }

  function swapTokenForETHAndLiquify(uint256 amountToken, uint256 amountRaised) private {
    address[] memory path = new address[](2);
    path[0] = feeInfo.paymentToken;
    path[1] = ISummitswapRouter02(presale.router0).WETH();

    IERC20(feeInfo.paymentToken).approve(presale.router0, amountRaised);
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
    path[0] = feeInfo.paymentToken;
    path[1] = ISummitswapRouter02(presale.router0).WETH();
    path[2] = presale.listingToken;

    IERC20(feeInfo.paymentToken).approve(presale.router0, amountRaised);
    uint256[] memory amounts = ISummitswapRouter02(presale.router0).swapExactTokensForTokens(
      amountRaised,
      0,
      path,
      address(this),
      block.timestamp
    );
    _addLiquidityTokens(amountToken, amounts[2], presale.listingToken, presale.router0);
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
    address listingToken,
    address router
  ) private {
    IERC20(presale.presaleToken).approve(router, amountToken);
    IERC20(listingToken).approve(router, amountRaised);
    ISummitswapRouter02(router).addLiquidity(
      presale.presaleToken,
      listingToken,
      amountToken,
      amountRaised,
      0,
      0,
      address(this),
      block.timestamp
    );
  }

  function withdrawPaymentToken() external nonReentrant {
    require(presale.isPresaleCancelled, "Presale Not Cancelled");
    require(bought[msg.sender] > 0, "You do not have any contributions");

    if (feeInfo.paymentToken == address(0)) {
      payable(msg.sender).transfer(bought[msg.sender]);
    } else {
      IERC20(feeInfo.paymentToken).transfer(msg.sender, bought[msg.sender]);
    }

    presale.totalBought = presale.totalBought - bought[msg.sender];
    bought[msg.sender] = 0;
    removeContributor(msg.sender);
  }

  function emergencyWithdrawPaymentToken() external nonReentrant {
    require(block.timestamp >= presale.startPresaleTime, "Presale Not started Yet");
    require(block.timestamp < presale.endPresaleTime, "Presale Ended");
    require(bought[msg.sender] > 0, "You do not have any contributions");
    require(!presale.isPresaleCancelled, "Presale has been cancelled");
    require(!presale.isClaimPhase, "Presale claim phase");

    uint256 feeAmount = (bought[msg.sender] * feeInfo.feeEmergencyWithdraw) / FEE_DENOMINATOR;

    if (feeInfo.paymentToken == address(0)) {
      payable(msg.sender).transfer(bought[msg.sender] - feeAmount);
      payable(serviceFeeReceiver).transfer(feeAmount);
    } else {
      IERC20(feeInfo.paymentToken).transfer(msg.sender, bought[msg.sender] - feeAmount);
      IERC20(feeInfo.paymentToken).transfer(serviceFeeReceiver, feeAmount);
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

    uint256 feePaymentToken = (presale.totalBought * feeInfo.feePaymentToken) / FEE_DENOMINATOR;
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
      ((presale.totalBought * presale.liquidityPercentage) / FEE_DENOMINATOR) - feePaymentToken
    );

    if (feeInfo.paymentToken == address(0)) {
      payable(serviceFeeReceiver).transfer(feePaymentToken);
    } else {
      IERC20(feeInfo.paymentToken).transfer(serviceFeeReceiver, feePaymentToken);
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

  function withdrawLpTokens(address[2] memory addresses, address _receiver) external onlyOwner {
    require(startDateClaim != 0, "Claim phase has not started");
    require(startDateClaim + presale.liquidityLockTime < block.timestamp, "Lp Tokens are locked");
    require(addresses[0] != presale.presaleToken && addresses[1] != presale.presaleToken, "address is presale token");
    require(addresses[0] != feeInfo.paymentToken && addresses[1] != feeInfo.paymentToken, "address is paymentToken");
    uint256 lpBal0 = IERC20(addresses[0]).balanceOf(address(this));
    uint256 lpBal1 = IERC20(addresses[1]).balanceOf(address(this));
    if (lpBal0 > 0) IERC20(addresses[0]).transfer(_receiver, lpBal0);
    if (lpBal1 > 0) IERC20(addresses[1]).transfer(_receiver, lpBal1);
  }

  function toggleWhitelistPhase() external onlyOwner {
    presale.isWhiteListPhase = !presale.isWhiteListPhase;
  }

  function cancelPresale() external onlyOwner {
    presale.isClaimPhase = false;
    presale.isPresaleCancelled = true;
  }

  function withdrawBNBOwner(uint256 _amount, address _receiver) external onlyOwner {
    require(presale.isClaimPhase, "Claim phase has not started");
    payable(_receiver).transfer(_amount);
  }

  function withdrawPaymentTokenOwner(uint256 _amount, address _receiver) external onlyOwner {
    require(presale.isClaimPhase, "Claim phase has not started");
    IERC20(feeInfo.paymentToken).transfer(_receiver, _amount);
  }

  function updatePresaleAndApprove(
    PresaleInfo memory _presale,
    PresaleFeeInfo memory _feeInfo,
    string[8] memory _projectDetails
  ) external onlyAdmin {
    require(!presale.isApproved, "Presale is approved");
    presale = _presale;
    feeInfo = _feeInfo;
    projectDetails = _projectDetails;
    presale.isApproved = true;
    presale.isPresaleCancelled = false;
    presale.isClaimPhase = false;
    presale.isWithdrawCancelledTokens = false;
  }

  function approvePresale() external onlyAdmin {
    presale.isApproved = true;
  }

  function setServiceFeeReceiver(address _feeReceiver) external onlyAdmin {
    serviceFeeReceiver = _feeReceiver;
  }

  function assignAdmins(address[] calldata _admins) external onlyDefaultAdmin {
    for (uint256 i = 0; i < _admins.length; i++) {
      isAdmin[_admins[i]] = true;
    }
  }

  function revokeAdmins(address[] calldata _admins) external onlyDefaultAdmin {
    for (uint256 i = 0; i < _admins.length; i++) {
      isAdmin[_admins[i]] = false;
    }
  }
}
