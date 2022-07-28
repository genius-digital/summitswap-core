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
    string[8] memory _projectDetails,
    address[6] memory _addresses, // tokenAdress, raisedTokenAddress, pairToken, SS router, PS router, admin
    uint256[5] memory _tokenDetails, // _tokenAmount, _presalePrice, _listingPrice, liquidityPercent, maxClaimPercentage
    uint256[4] memory _bnbAmounts, // minBuy, maxBuy, softcap, hardcap
    uint256[5] memory _presaleTimeDetails, // startPresaleTime, endPresaleTime, claimIntervalDay, claimIntervalHour, liquidityLockTime
    uint8[2] memory _choices, // refund, listing
    bool[2] memory _bools // isWhiteListPhase, isVestingEnabled
  ) external payable {
    require(libraryAddress != address(0), "Set library address first");
    require(msg.value >= preSaleFee, "Not Enough Fee");
    require(_presaleTimeDetails[0] > block.timestamp, "Presale startTime > block.timestamp");
    require(_presaleTimeDetails[1] > _presaleTimeDetails[0], "Presale End time > presale start time");
    require(_presaleTimeDetails[2] >= 1 && _presaleTimeDetails[2] <= 31, "claimIntervalDay should be between 1 & 31");
    require(_presaleTimeDetails[3] <= 23, "claimIntervalHour should be between 0 & 23");
    require(_presaleTimeDetails[4] >= 300, "liquidityLockTime >= 300 seconds");
    require(_bnbAmounts[0] < _bnbAmounts[1], "MinBuy should be less than maxBuy");
    require(
      _bnbAmounts[2] >= (_bnbAmounts[3] * 50) / 100 && _bnbAmounts[2] <= _bnbAmounts[3],
      "Softcap should be greater than or equal to 50% of hardcap"
    );
    require(_tokenDetails[3] >= 25 && _tokenDetails[3] <= 100, "Liquidity Percentage should be between 25% & 100%");
    require(_tokenDetails[4] <= 100, "maxClaimPercentage should be between 0 & 100");
    require(_choices[0] <= 1, "refundType should be between 0 or 1");
    require(_choices[1] <= 3, "listingChoice should be between 0 & 3");

    if (tokenPresales[_addresses[0]].length > 0) {
      ISummitCustomPresale _presale = ISummitCustomPresale(
        tokenPresales[_addresses[0]][tokenPresales[_addresses[0]].length - 1]
      );
      require(_presale.isPresaleCancelled(), "Presale Already Exists");
    }

    address presaleClone = Clones.clone(libraryAddress);

    ISummitCustomPresale(presaleClone).initialize(
      _projectDetails,
      [
        msg.sender,
        _addresses[0],
        _addresses[1],
        _addresses[2],
        _addresses[3],
        _addresses[4],
        serviceFeeReceiver,
        _addresses[5]
      ],
      [_tokenDetails[1], _tokenDetails[2], _tokenDetails[3], _tokenDetails[4]],
      _bnbAmounts,
      _presaleTimeDetails,
      _choices,
      _bools
    );

    tokenPresales[_addresses[0]].push(address(presaleClone));
    accountPresales[msg.sender].push(address(presaleClone));
    pendingPresales.push(address(presaleClone));
    if (serviceFeeReceiver != address(this)) {
      address payable feeReceiver = payable(serviceFeeReceiver);
      feeReceiver.transfer(preSaleFee);
    }

    IERC20(_addresses[0]).transferFrom(msg.sender, address(presaleClone), _tokenDetails[0]);
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

  function setRolesForPresale(
    bytes32 role,
    address presaleAddress,
    address newAdmin
  ) external isAdminOrOwner presalePending(presaleAddress) {
    ISummitCustomPresale(presaleAddress).grantRole(role, newAdmin);
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
