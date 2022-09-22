// SPDX-License-Identifier: Unlisenced
// Developed by: dxsoftware.net

import "@openzeppelin/contracts/access/Ownable.sol";
import "./SummitWhitelabelNft.sol";

pragma solidity ^0.8.6;

contract SummitWhitelabelNftFactory is Ownable {
  address[] public nfts;
  mapping(address => address[]) public userNfts;
  mapping(address => bool) public isWithdrawOperator;

  uint256 public serviceFee;
  uint256 public withdrawFee;
  address public signer;

  event CreateNft(address indexed owner, address indexed nftAddress, TokenInfo tokenInfo);

  constructor(
    uint256 _serviceFee,
    uint256 _withdrawFee,
    address _signer
  ) {
    serviceFee = _serviceFee;
    withdrawFee = _withdrawFee;
    signer = _signer;
  }

  receive() external payable {}

  function createNft(TokenInfo calldata _tokenInfo, string memory _initialURI) external payable {
    require(msg.value >= serviceFee, "Not enough serviceFee sent");

    address _collectionOwner = _msgSender();

    SummitWhitelabelNft nft = new SummitWhitelabelNft(_tokenInfo, _initialURI, _collectionOwner, signer, address(this));
    address nftAddress = address(nft);

    nfts.push(nftAddress);
    userNfts[_collectionOwner].push(nftAddress);

    refundExcessiveFee();

    emit CreateNft(_collectionOwner, nftAddress, _tokenInfo);
  }

  function getNfts() external view returns (address[] memory) {
    return nfts;
  }

  function nftsOf(address _collectionOwner) external view returns (address[] memory) {
    return userNfts[_collectionOwner];
  }

  function refundExcessiveFee() internal virtual {
    uint256 refund = msg.value - serviceFee;
    if (refund > 0) {
      (bool success, ) = address(_msgSender()).call{value: refund}("");
      require(success, "Unable to refund excess Ether");
    }
  }

  // OWNER FUNCTIONS
  function setSigner(address _signer) external onlyOwner {
    signer = _signer;
  }

  function setServiceFee(uint256 _serviceFee) external onlyOwner {
    serviceFee = _serviceFee;
  }

  function setWithdrawFee(uint256 _withdrawFee) external onlyOwner {
    withdrawFee = _withdrawFee;
  }

  function addWithdrawOperators(address[] calldata _operators) external onlyOwner {
    for (uint256 i = 0; i < _operators.length; i++) {
      isWithdrawOperator[_operators[i]] = true;
    }
  }

  function removeWithdrawOperators(address[] calldata _operators) external onlyOwner {
    for (uint256 i = 0; i < _operators.length; i++) {
      isWithdrawOperator[_operators[i]] = false;
    }
  }

  function withdraw(address _receiver) external {
    require(isWithdrawOperator[_msgSender()] || _msgSender() == owner(), "Not a withdraw operator");

    (bool success, ) = address(_receiver).call{value: address(this).balance}("");
    require(success, "Unable to withdraw Ether");
  }
}
