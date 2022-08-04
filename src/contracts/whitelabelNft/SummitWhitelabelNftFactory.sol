// SPDX-License-Identifier: Unlisenced
// Developed by: dxsoftware.net

import "@openzeppelin/contracts/access/Ownable.sol";
import "./SummitWhitelabelNft.sol";

pragma solidity ^0.8.6;

contract SummitWhitelableNftFactory is Ownable {
  mapping(address => SummitWhitelabelNft[]) private nfts;

  uint256 public serviceFee;
  address public serviceFeeReceiver;

  constructor(uint256 _serviceFee, address _serviceFeeReceiver) {
    serviceFee = _serviceFee;
    serviceFeeReceiver = _serviceFeeReceiver;
  }

  function createNft(TokenInfo calldata _tokenInfo, string memory _initialURI) external payable {
    require(msg.value >= serviceFee, "Not enough serviceFee sent");

    address _collectionOwner = _msgSender();

    nfts[_collectionOwner].push(new SummitWhitelabelNft(_tokenInfo, _initialURI, _collectionOwner));

    refundExcessiveFee();
    sendFee();
  }

  function nftsOf(address _collectionOwner) external view returns (SummitWhitelabelNft[] memory) {
    return nfts[_collectionOwner];
  }

  function sendFee() internal virtual {
    if (serviceFeeReceiver != address(this) && serviceFeeReceiver != address(0)) {
      (bool success, ) = address(serviceFeeReceiver).call{value: serviceFee}("");
      require(success, "Unable to send fee Ether");
    }
  }

  function refundExcessiveFee() internal virtual {
    uint256 refund = msg.value - serviceFee;
    if (refund > 0) {
      (bool success, ) = address(_msgSender()).call{value: refund}("");
      require(success, "Unable to refund excess Ether");
    }
  }

  function setServiceFee(uint256 _serviceFee) external onlyOwner {
    serviceFee = _serviceFee;
  }

  function setServiceFeeReceiver(address _serviceFeeReceiver) external onlyOwner {
    serviceFeeReceiver = _serviceFeeReceiver;
  }

  function withdraw(address _receiver) external onlyOwner {
    (bool success, ) = address(_receiver).call{value: address(this).balance}("");
    require(success, "Unable to withdraw Ether");
  }
}