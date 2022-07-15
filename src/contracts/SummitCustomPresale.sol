// SPDX-License-Identifier: UNLICENSED
// Developed by: dxsoftware.net

pragma solidity 0.7.6;

pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/ISummitswapRouter02.sol";
import "./interfaces/IERC20.sol";

contract SummitCustomPresale is Ownable, ReentrancyGuard {
  address private constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

  address public serviceFeeReceiver;
  address[] public contributors;
  address[] public whitelist;
  mapping(address => uint256) private contributorIndex;
  mapping(address => uint256) private whitelistIndex;
  mapping(address => uint256) public bought; // account => boughtAmount
  mapping(address => bool) public isTokenClaimed; // if account has claimed the tokens

  uint256 public constant FEE_DENOMINATOR = 10**9; // fee denominator
  uint256 public liquidity;

  struct FeeInfo {
    address raisedTokenAddress; // BNB/BUSD/..
    uint256 feeRaisedToken; // BNB/BUSD/...
    uint256 feePresaleToken; // presaleToken
    uint256 emergencyWithdrawFee;
  }

  struct PresaleInfo {
    address presaleToken;
    address router;
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
    uint256 totalBought; // in wei
    uint8 refundType; // 0 refund, 1 burn
    bool isWhiteListPhase;
    bool isClaimPhase;
    bool isPresaleCancelled;
    bool isWithdrawCancelledTokens;
  }

  PresaleInfo private presale;
  FeeInfo private feeInfo;

  constructor(
    address[6] memory _addresses, // owner, token, router, raisedTokenAddress, pairToken, serviceFeeReceiver
    uint256[3] memory _tokenDetails, // _presalePrice, _listingPrice, liquidityPercent
    uint256[4] memory _bnbAmounts, // minBuy, maxBuy, softcap, hardcap
    uint256 _liquidityLockTime,
    uint256 _startPresaleTime,
    uint256 _endPresaleTime,
    uint8 _refundType,
    bool _isWhiteListPhase
  ) {
    transferOwnership(_addresses[0]);
    serviceFeeReceiver = _addresses[5];
    presale.presaleToken = _addresses[1];
    presale.router = _addresses[2];
    presale.pairToken = _addresses[4];
    presale.presalePrice = _tokenDetails[0];
    presale.listingPrice = _tokenDetails[1];
    presale.liquidityPercentage = (_tokenDetails[2] * FEE_DENOMINATOR) / 100;
    presale.liquidityLockTime = _liquidityLockTime;
    presale.minBuy = _bnbAmounts[0];
    presale.maxBuy = _bnbAmounts[1];
    presale.softCap = _bnbAmounts[2];
    presale.hardCap = _bnbAmounts[3];
    presale.startPresaleTime = _startPresaleTime;
    presale.endPresaleTime = _endPresaleTime;
    presale.refundType = _refundType;
    presale.isWhiteListPhase = _isWhiteListPhase;

    feeInfo.raisedTokenAddress = _addresses[3]; // address(0) native coin
    feeInfo.feeRaisedToken = 50000000; // 5%
    feeInfo.feePresaleToken = 20000000; // 2%
    feeInfo.emergencyWithdrawFee = 100000000; // 10%
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

  function claim() external nonReentrant {
    require(!presale.isPresaleCancelled, "Presale Cancelled");
    require(
      block.timestamp > presale.endPresaleTime || presale.hardCap == presale.totalBought,
      "Claim hasn't started yet"
    );
    require(presale.isClaimPhase, "Not Claim Phase");
    require(bought[msg.sender] > 0, "You do not have any tokens to claim");
    require(!isTokenClaimed[msg.sender], "Tokens already Claimed");

    uint256 userTokens = calculateBnbToPresaleToken(bought[msg.sender], presale.presalePrice);
    require(
      IERC20(presale.presaleToken).balanceOf(address(this)) >= userTokens,
      "Contract doesn't have enough presale tokens. Please contact owner to add more supply"
    );
    IERC20(presale.presaleToken).transfer(msg.sender, userTokens);
    isTokenClaimed[msg.sender] = true;
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

  receive() external payable {}

  function addLiquidity(uint256 amountToken, uint256 amountRaised) internal {
    if (feeInfo.raisedTokenAddress == address(0)) {
      if (presale.pairToken == address(0)) {
        _addLiquidityETH(amountToken, amountRaised);
      } else {
        swapETHForTokenAndLiquify(amountToken, amountRaised);
      }
    } else {
      if (presale.pairToken == address(0)) {
        swapTokenForETHAndLiquify(amountToken, amountRaised); // raisedToken == BUSD & liquidity with BNB
      } else {
        if (feeInfo.raisedTokenAddress == presale.pairToken) {
          _addLiquidityTokens(amountToken, amountRaised, presale.pairToken);
        } else {
          swapTokenForTokenAndLiquify(amountToken, amountRaised);
        }
      }
    }
  }

  function swapETHForTokenAndLiquify(uint256 amountToken, uint256 amountRaised) internal {
    ISummitswapRouter02 summitswapV2Router = ISummitswapRouter02(presale.router);
    address[] memory path = new address[](2);
    path[0] = summitswapV2Router.WETH();
    path[1] = presale.pairToken;

    uint256[] memory amounts = summitswapV2Router.swapExactETHForTokens{value: amountRaised}(
      0,
      path,
      address(this),
      block.timestamp
    );
    _addLiquidityTokens(amountToken, amounts[1], presale.pairToken);
  }

  function swapTokenForETHAndLiquify(uint256 amountToken, uint256 amountRaised) internal {
    ISummitswapRouter02 summitswapV2Router = ISummitswapRouter02(presale.router);
    address[] memory path = new address[](2);
    path[0] = feeInfo.raisedTokenAddress;
    path[1] = summitswapV2Router.WETH();

    IERC20(feeInfo.raisedTokenAddress).approve(presale.router, amountRaised);
    uint256[] memory amounts = summitswapV2Router.swapExactTokensForETH(
      amountRaised,
      0,
      path,
      address(this),
      block.timestamp
    );
    _addLiquidityETH(amountToken, amounts[1]);
  }

  function swapTokenForTokenAndLiquify(uint256 amountToken, uint256 amountRaised) internal {
    ISummitswapRouter02 summitswapV2Router = ISummitswapRouter02(presale.router);
    address[] memory path = new address[](3);
    path[0] = feeInfo.raisedTokenAddress;
    path[1] = summitswapV2Router.WETH();
    path[2] = presale.pairToken;

    IERC20(feeInfo.raisedTokenAddress).approve(presale.router, amountRaised);
    uint256[] memory amounts = summitswapV2Router.swapExactTokensForTokens(
      amountRaised,
      0,
      path,
      address(this),
      block.timestamp
    );
    _addLiquidityTokens(amountToken, amounts[2], presale.pairToken);
  }

  function _addLiquidityETH(uint256 amountToken, uint256 amountBNB) internal {
    IERC20(presale.presaleToken).approve(presale.router, amountToken);
    ISummitswapRouter02(presale.router).addLiquidityETH{value: amountBNB}(
      presale.presaleToken,
      amountToken,
      0,
      0,
      owner(),
      block.timestamp
    );
  }

  function _addLiquidityTokens(
    uint256 amountToken,
    uint256 amountRaised,
    address pairAddress
  ) internal {
    IERC20(presale.presaleToken).approve(presale.router, amountToken);
    IERC20(pairAddress).approve(presale.router, amountRaised);
    ISummitswapRouter02(presale.router).addLiquidity(
      presale.presaleToken,
      pairAddress,
      amountToken,
      amountRaised,
      0,
      0,
      owner(),
      block.timestamp
    );
  }

  // function addLiquidity(uint256 amountToken, uint256 amountRaised) internal {
  //   IERC20(presale.presaleToken).approve(presale.router, amountToken);
  //   ISummitswapRouter02 summitswapV2Router = ISummitswapRouter02(presale.router);
  //   if (feeInfo.raisedTokenAddress == address(0)) {
  //     summitswapV2Router.addLiquidityETH{value: amountRaised}(
  //       presale.presaleToken,
  //       amountToken,
  //       0,
  //       0,
  //       owner(),
  //       block.timestamp
  //     );
  //   } else {
  //     IERC20(feeInfo.raisedTokenAddress).approve(presale.router, amountRaised);
  //     summitswapV2Router.addLiquidity(
  //       presale.presaleToken,
  //       feeInfo.raisedTokenAddress,
  //       amountToken,
  //       amountRaised,
  //       0,
  //       0,
  //       owner(),
  //       block.timestamp
  //     );
  //   }
  // }

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

  function setFee(
    uint256 feeRaisedToken,
    uint256 feePresaleToken,
    uint256 emergencyWithdrawFee
  ) external onlyOwner {
    feeInfo.feeRaisedToken = feeRaisedToken;
    feeInfo.feePresaleToken = feePresaleToken;
    feeInfo.emergencyWithdrawFee = emergencyWithdrawFee;
  }

  function toggleWhitelistPhase() external onlyOwner {
    presale.isWhiteListPhase = !presale.isWhiteListPhase;
  }

  function cancelPresale() external onlyOwner {
    presale.isClaimPhase = false;
    presale.isPresaleCancelled = true;
  }

  function setServiceFeeReceiver(address _feeReceiver) external onlyOwner {
    serviceFeeReceiver = _feeReceiver;
  }

  function withdrawBNBOwner(uint256 _amount, address _receiver) external onlyOwner {
    payable(_receiver).transfer(_amount);
  }

  function withdrawRaisedTokenOwner(uint256 _amount, address _receiver) external onlyOwner {
    IERC20(feeInfo.raisedTokenAddress).transfer(_receiver, _amount);
  }
}
