// SPDX-License-Identifier: Unlisenced
// Developed by: dxsoftware.net

import "@openzeppelin/contracts/access/Ownable.sol";
import "./SummitWhitelabelNft.sol";

pragma solidity ^0.8.6;

contract SummitWhitelableNftFactory is Ownable {
  address[] public nfts;
  mapping(address => address[]) public userNfts;

  uint256 public serviceFee;
  address public serviceFeeReceiver;

  event CreateNft(address indexed owner, address indexed nftAddress, TokenInfo tokenInfo, uint256 timestamp);

  constructor(uint256 _serviceFee, address _serviceFeeReceiver) {
    serviceFee = _serviceFee;
    serviceFeeReceiver = _serviceFeeReceiver;
  }

  function createNft(TokenInfo calldata _tokenInfo, string memory _initialURI) external payable {
    require(msg.value >= serviceFee, "Not enough serviceFee sent");

    address _collectionOwner = _msgSender();

    SummitWhitelabelNft nft = new SummitWhitelabelNft(_tokenInfo, _initialURI, _collectionOwner);
    address nftAddress = address(nft);

    nfts.push(nftAddress);
    userNfts[_collectionOwner].push(nftAddress);

    refundExcessiveFee();
    sendFee();

    emit CreateNft(_collectionOwner, nftAddress, _tokenInfo, block.timestamp);
  }

  function getNfts() external view returns (address[] memory) {
    return nfts;
  }

  function nftsOf(address _collectionOwner) external view returns (address[] memory) {
    return userNfts[_collectionOwner];
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

  // OWNER FUNCTIONS
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
