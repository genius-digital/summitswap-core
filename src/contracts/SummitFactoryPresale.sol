// SPDX-License-Identifier: UNLICENSED
// Developed by: dxsoftware.net

pragma solidity 0.7.6;

pragma experimental ABIEncoderV2;

import "./interfaces/IAccessControl.sol";
import "./interfaces/ISummitCustomPresale.sol";
import "./interfaces/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "../helpers/PresaleInfo.sol";
import "../helpers/PresaleFee.sol";

contract SummitFactoryPresale is Ownable {
  mapping(address => bool) public isAdmin;
  mapping(address => address[]) public accountPresales;
  mapping(address => address[]) public tokenPresales; // token => presale
  mapping(address => uint256) private approvedIndex;
  mapping(address => uint256) private pendingIndex;

  address[] public approvedPresales;
  address[] public pendingPresales;
  address public serviceFeeReceiver;
  address public libraryAddress;
  uint256 public preSaleFee = 0.001 ether;

  constructor(
    uint256 _preSaleFee,
    address _feeReceiver,
    address _admin
  ) {
    preSaleFee = _preSaleFee;
    serviceFeeReceiver = _feeReceiver;
    isAdmin[_admin] = true;
  }

  modifier isAdminOrOwner() {
    require(isAdmin[msg.sender] || msg.sender == owner(), "Only admin or owner can call this function");
    _;
  }

  modifier presalePending(address _presale) {
    require(
      pendingPresales.length > 0 && pendingPresales[pendingIndex[_presale]] == _presale,
      "Presale not in pending presales."
    );
    _;
  }

  function createPresale(
    string[8] memory projectDetails,
    PresaleInfo memory presale,
    FeeInfo memory feeInfo,
    uint256 tokenAmount
  ) external payable {
    require(libraryAddress != address(0), "Set library address first");
    require(msg.value >= preSaleFee, "Not Enough Fee");
    require(presale.startPresaleTime > block.timestamp, "Presale startTime > block.timestamp");
    require(presale.endPresaleTime > presale.startPresaleTime, "Presale End time > presale start time");
    require(
      presale.claimIntervalDay >= 1 && presale.claimIntervalDay <= 31,
      "claimIntervalDay should be between 1 & 31"
    );
    require(presale.claimIntervalHour <= 23, "claimIntervalHour should be between 0 & 23");
    require(presale.liquidityLockTime >= 300, "liquidityLockTime >= 300 seconds");
    require(presale.minBuy < presale.maxBuy, "MinBuy should be less than maxBuy");
    require(
      presale.softCap >= (presale.hardCap * 50) / 100 && presale.softCap <= presale.hardCap,
      "Softcap should be greater than or equal to 50% of hardcap"
    );
    require(
      presale.liquidityPercentage >= 25 && presale.liquidityPercentage <= 100,
      "Liquidity Percentage should be between 25% & 100%"
    );
    require(
      presale.maxClaimPercentage > 0 && presale.maxClaimPercentage <= 100,
      "maxClaimPercentage should be between 1 & 100"
    );
    require(presale.refundType <= 1, "refundType should be between 0 or 1");
    require(presale.listingChoice <= 3, "listingChoice should be between 0 & 3");

    if (tokenPresales[presale.presaleToken].length > 0) {
      ISummitCustomPresale _presale = ISummitCustomPresale(
        tokenPresales[presale.presaleToken][tokenPresales[presale.presaleToken].length - 1]
      );
      require(_presale.isPresaleCancelled(), "Presale Already Exists");
    }

    address presaleClone = Clones.clone(libraryAddress);

    ISummitCustomPresale(presaleClone).initialize(projectDetails, presale, feeInfo, [serviceFeeReceiver, msg.sender]);

    tokenPresales[presale.presaleToken].push(address(presaleClone));
    accountPresales[msg.sender].push(address(presaleClone));
    pendingPresales.push(address(presaleClone));
    if (serviceFeeReceiver != address(this)) {
      address payable feeReceiver = payable(serviceFeeReceiver);
      feeReceiver.transfer(preSaleFee);
    }

    IERC20(presale.presaleToken).transferFrom(msg.sender, address(presaleClone), tokenAmount);
  }

  function removeFromPending(address _address) private {
    uint256 index = pendingIndex[_address];
    if (pendingPresales[index] == _address) {
      pendingIndex[pendingPresales[index]] = 0;
      pendingPresales[index] = pendingPresales[pendingPresales.length - 1];
      pendingIndex[pendingPresales[index]] = index == (pendingPresales.length - 1) ? 0 : index;
      pendingPresales.pop();
    }
  }

  function approvePresales(address[] memory addresses) external isAdminOrOwner {
    for (uint256 index = 0; index < addresses.length; index++) {
      address _address = addresses[index];
      if (pendingPresales.length > 0 && pendingPresales[pendingIndex[_address]] == _address)
        if (approvedPresales.length == 0 || (approvedIndex[_address] == 0 && _address != approvedPresales[0])) {
          approvedIndex[_address] = approvedPresales.length;
          approvedPresales.push(_address);
          removeFromPending(_address);
          ISummitCustomPresale(_address).approvePresale();
        }
    }
  }

  function getPendingPresales() external view returns (address[] memory) {
    return pendingPresales;
  }

  function getApprovedPresales() external view returns (address[] memory) {
    return approvedPresales;
  }

  function getTokenPresales(address _address) external view returns (address[] memory) {
    return tokenPresales[_address];
  }

  function getAccountPresales(address _address) external view returns (address[] memory) {
    return accountPresales[_address];
  }

  function setLibraryAddress(address _libraryAddress) external isAdminOrOwner {
    libraryAddress = _libraryAddress;
  }

  function setFeeInfo(
    uint256 feeRaisedToken,
    uint256 feePresaleToken,
    uint256 emergencyWithdrawFee,
    address raisedTokenAddress,
    address presaleAddress
  ) external isAdminOrOwner presalePending(presaleAddress) {
    ISummitCustomPresale(presaleAddress).setFeeInfo(
      feeRaisedToken,
      feePresaleToken,
      emergencyWithdrawFee,
      raisedTokenAddress
    );
  }

  function setPresaleInfo(
    address _presale,
    address _pairToken,
    uint256[3] memory _bnbAmounts, // minBuy, maxBuy, softcap
    uint256[4] memory _presaleTimeDetails, // startPresaleTime, endPresaleTime, claimIntervalDay, claimIntervalHour
    uint256 _liquidityLockTime,
    uint256 _maxClaimPercentage,
    uint8 _refundType,
    uint8 _listingChoice,
    bool _isWhiteListPhase,
    bool _isVestingEnabled
  ) external isAdminOrOwner presalePending(_presale) {
    require(_presaleTimeDetails[2] >= 1 && _presaleTimeDetails[2] <= 31, "claimIntervalDay should be between 1 & 31");
    require(_presaleTimeDetails[2] <= 23, "claimIntervalHour should be between 0 & 23");
    require(_bnbAmounts[0] < _bnbAmounts[1], "MinBuy should be less than maxBuy");
    require(_maxClaimPercentage <= 100, "maxClaimPercentage should be between 0 & 100");
    require(_refundType <= 1, "refundType should be between 0 or 1");
    require(_listingChoice <= 3, "listingChoice should be between 0 & 3");

    ISummitCustomPresale(_presale).setPresaleInfo(
      _pairToken,
      _bnbAmounts,
      _presaleTimeDetails,
      _liquidityLockTime,
      _maxClaimPercentage,
      _refundType,
      _listingChoice,
      _isWhiteListPhase,
      _isVestingEnabled
    );
  }

  function assignAdminsPresale(address[] calldata _admins, address _presale)
    external
    onlyOwner
    presalePending(_presale)
  {
    ISummitCustomPresale(_presale).assignAdmins(_admins);
  }

  function revokeAdminsPresale(address[] calldata _admins, address _presale)
    external
    onlyOwner
    presalePending(_presale)
  {
    ISummitCustomPresale(_presale).revokeAdmins(_admins);
  }

  function assignAdmins(address[] calldata _admins) external onlyOwner {
    for (uint256 i = 0; i < _admins.length; i++) {
      isAdmin[_admins[i]] = true;
    }
  }

  function revokeAdmins(address[] calldata _admins) external onlyOwner {
    for (uint256 i = 0; i < _admins.length; i++) {
      isAdmin[_admins[i]] = false;
    }
  }

  function setServiceFeeReceiver(address _feeReceiver) external onlyOwner {
    serviceFeeReceiver = _feeReceiver;
  }

  function withdraw(address _feeReceiver) public onlyOwner {
    address payable to = payable(_feeReceiver);
    to.transfer(address(this).balance);
  }

  function setFee(uint256 _fee) external onlyOwner {
    preSaleFee = _fee;
  }
}
