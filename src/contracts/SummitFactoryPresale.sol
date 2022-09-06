// SPDX-License-Identifier: UNLICENSED
// Developed by: dxsoftware.net

pragma solidity 0.8.6;

pragma experimental ABIEncoderV2;

import "./interfaces/ISummitCustomPresale.sol";
import "./interfaces/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "../structs/PresaleInfo.sol";
import "../structs/PresaleFeeInfo.sol";

contract SummitFactoryPresale is Ownable {
  mapping(address => bool) public isAdmin;
  mapping(address => address[]) public accountPresales;
  mapping(address => address[]) public tokenPresales; // token => presale
  mapping(address => uint256) private approvedIndex;
  mapping(address => uint256) private pendingIndex;
  mapping(address => uint256) public presaleRequestTime;

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
    PresaleFeeInfo memory feeInfo,
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
      presale.liquidityPercentage >= 250000000 && presale.liquidityPercentage <= 1000000000,
      "Liquidity Percentage should be between 25% & 100%"
    );
    require(
      presale.maxClaimPercentage >= 10000000 && presale.maxClaimPercentage <= 1000000000,
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

    ISummitCustomPresale(presaleClone).initialize(projectDetails, presale, feeInfo, serviceFeeReceiver, msg.sender);

    presaleRequestTime[presaleClone] = block.timestamp;
    tokenPresales[presale.presaleToken].push(address(presaleClone));
    accountPresales[msg.sender].push(address(presaleClone));
    pendingIndex[address(presaleClone)] = pendingPresales.length;
    pendingPresales.push(address(presaleClone));
    if (serviceFeeReceiver != address(this)) {
      address payable feeReceiver = payable(serviceFeeReceiver);
      feeReceiver.transfer(preSaleFee);
    }

    IERC20(presale.presaleToken).transferFrom(msg.sender, address(presaleClone), tokenAmount);
  }

  function removeFromPending(address _address) private {
    approvedIndex[_address] = approvedPresales.length;
    approvedPresales.push(_address);
    uint256 index = pendingIndex[_address];
    if (pendingPresales[index] == _address) {
      pendingIndex[pendingPresales[index]] = 0;
      pendingPresales[index] = pendingPresales[pendingPresales.length - 1];
      pendingIndex[pendingPresales[index]] = index == (pendingPresales.length - 1) ? 0 : index;
      pendingPresales.pop();
    }
  }

  function approvePresale(address _address) external isAdminOrOwner presalePending(_address) {
    if (approvedPresales.length == 0 || (approvedIndex[_address] == 0 && _address != approvedPresales[0])) {
      removeFromPending(_address);
      ISummitCustomPresale(_address).approvePresale();
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

  function updatePresaleAndApprove(
    PresaleInfo memory _presale,
    PresaleFeeInfo memory _feeInfo,
    string[8] memory _projectDetails,
    address _presaleAddress
  ) external isAdminOrOwner presalePending(_presaleAddress) {
    PresaleInfo memory presale = ISummitCustomPresale(_presaleAddress).getPresaleInfo();
    require(!presale.isApproved, "Presale is approved");
    require(_presale.presaleToken == presale.presaleToken, "Presale token should be same");
    require(_presale.presalePrice == presale.presalePrice, "Presale price should be same");
    require(_presale.listingPrice == presale.listingPrice, "listingPrice should be same");
    require(_presale.hardCap == presale.hardCap, "hardCap should be same");
    require(_presale.liquidityPercentage == presale.liquidityPercentage, "liquidityPercentage should be same");
    require(_presale.startPresaleTime >= presale.startPresaleTime, "startPresaleTime >= set startPresaleTime");
    require(_presale.endPresaleTime > _presale.startPresaleTime, "endPresaleTime >= startPresaleTime");
    require(
      _presale.softCap >= (presale.hardCap * 50) / 100 && _presale.softCap <= presale.hardCap,
      "50% of hardcap <= softcap <= hardcap"
    );
    require(
      _presale.claimIntervalDay >= 1 && _presale.claimIntervalDay <= 31,
      "claimIntervalDay should be between 1 & 31"
    );
    require(_presale.minBuy < _presale.maxBuy, "MinBuy should be less than maxBuy");
    require(_presale.maxBuy <= _presale.hardCap, "maxBuy should be less than hardCap");
    require(_presale.claimIntervalHour <= 23, "claimIntervalHour should be between 0 & 23");
    require(
      _presale.maxClaimPercentage >= 10000000 && _presale.maxClaimPercentage <= 1000000000,
      "maxClaimPercentage should be between 1% & 100%"
    );
    require(
      _feeInfo.feeEmergencyWithdraw >= 10000000 && _feeInfo.feeEmergencyWithdraw <= 1000000000,
      "feeEmergencyWithdraw should be between 1% & 100%"
    );
    require(
      _feeInfo.feePresaleToken < _presale.liquidityPercentage,
      "fee presale Token should be less than liquidityPercentage"
    );
    require(
      _feeInfo.feePaymentToken < _presale.liquidityPercentage,
      "fee payment Token should be less than liquidityPercentage"
    );
    require(_presale.refundType <= 1, "refundType should be between 0 or 1");
    require(_presale.listingChoice <= 3, "listingChoice should be between 0 & 3");

    ISummitCustomPresale(_presaleAddress).updatePresaleAndApprove(_presale, _feeInfo, _projectDetails);
    removeFromPending(_presaleAddress);
  }

  function assignAdminsPresale(address[] calldata _admins, address _presale) external onlyOwner {
    require(
      (pendingPresales.length > 0 && pendingPresales[pendingIndex[_presale]] == _presale) ||
        (approvedPresales.length > 0 && approvedPresales[approvedIndex[_presale]] == _presale),
      "Presale does not exist"
    );
    ISummitCustomPresale(_presale).assignAdmins(_admins);
  }

  function revokeAdminsPresale(address[] calldata _admins, address _presale) external onlyOwner {
    require(
      (pendingPresales.length > 0 && pendingPresales[pendingIndex[_presale]] == _presale) ||
        (approvedPresales.length > 0 && approvedPresales[approvedIndex[_presale]] == _presale),
      "Presale does not exist"
    );
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
