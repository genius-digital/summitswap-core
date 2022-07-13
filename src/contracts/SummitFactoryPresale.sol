// SPDX-License-Identifier: UNLICENSED
// Developed by: dxsoftware.net

pragma solidity 0.7.6;

import "./SummitCustomPresale.sol";
import "./interfaces/ISummitCustomPresale.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SummitFactoryPresale is Ownable {
  mapping(address => address[]) public accountPresales;
  mapping(address => address[]) public tokenPresales; // token => presale

  address[] public presaleAddresses;
  address public serviceFeeReceiver;
  uint256 public preSaleFee = 0.001 ether;

  constructor(uint256 _preSaleFee, address _feeReceiver) {
    preSaleFee = _preSaleFee;
    serviceFeeReceiver = _feeReceiver;
  }

  function createPresale(
    address[3] memory _addresses, // tokenAdress, routerAddress, raisedTokenAddress
    uint256[4] memory _tokenDetails, // _tokenAmount, _presalePrice, _listingPrice, liquidityPercent
    uint256[4] memory _bnbAmounts, // minBuy, maxBuy, softcap, hardcap
    uint256 _liquidityLockTime,
    uint256 _startPresaleTime,
    uint256 _endPresaleTime,
    uint8 _refundType, // 0 refund, 1 burn
    bool _isWhiteListPhase
  ) external payable {
    require(msg.value >= preSaleFee, "Not Enough Fee");
    require(_startPresaleTime > block.timestamp, "Presale start time should be greater than block.timestamp");
    require(_endPresaleTime > _startPresaleTime, "Presale End time should be greater than presale start time");
    require(_bnbAmounts[0] <= _bnbAmounts[1], "MinBuybnb should be less than maxBuybnb");
    require(_bnbAmounts[2] >= (_bnbAmounts[3] * 50) / 100, "Softcap should be greater than or equal to 50% of hardcap");
    require(_tokenDetails[3] >= 51, "Liquidity Percentage should be Greater than or equal to 51%");

    if (tokenPresales[_addresses[0]].length > 0) {
      ISummitCustomPresale _presale = ISummitCustomPresale(
        tokenPresales[_addresses[0]][tokenPresales[_addresses[0]].length - 1]
      );
      require(_presale.isPresaleCancelled(), "Presale Already Exists");
    }

    SummitCustomPresale presale = new SummitCustomPresale(
      [msg.sender, _addresses[0], _addresses[1], _addresses[2], serviceFeeReceiver],
      [_tokenDetails[1], _tokenDetails[2], _tokenDetails[3]],
      _bnbAmounts,
      _liquidityLockTime,
      _startPresaleTime,
      _endPresaleTime,
      _refundType,
      _isWhiteListPhase
    );
    tokenPresales[_addresses[0]].push(address(presale));
    accountPresales[msg.sender].push(address(presale));
    presaleAddresses.push(address(presale));
    if (serviceFeeReceiver != address(this)) {
      address payable feeReceiver = payable(serviceFeeReceiver);
      feeReceiver.transfer(preSaleFee);
    }

    IERC20(_addresses[0]).transferFrom(msg.sender, address(presale), _tokenDetails[0]);
  }

  function getPresaleAddresses() external view returns (address[] memory) {
    return presaleAddresses;
  }

  function getTokenPresales(address _address) external view returns (address[] memory) {
    return tokenPresales[_address];
  }

  function getAccountPresales(address _address) external view returns (address[] memory) {
    return accountPresales[_address];
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
