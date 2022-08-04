// SPDX-License-Identifier: Unlisenced
// Developed by: dxsoftware.net

import "erc721a/contracts/extensions/ERC721AQueryable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "../shared/BaseTokenURI.sol";

pragma solidity ^0.8.6;

enum Phase {
  Paused,
  Whitelist,
  Public
}

struct TokenInfo {
  string name;
  string symbol;
  uint256 maxSupply;
  uint256 whitelistMintPrice;
  uint256 publicMintPrice;
  uint8 startTokenId;
  address signer;
  Phase phase;
}

contract SummitWhitelabelNft is ERC721AQueryable, BaseTokenURI {
  using Strings for uint256;
  using ECDSA for bytes32;

  mapping(address => bool) public isWithdrawOperator;

  TokenInfo public tokenInfo;

  modifier canWithdraw(address operator) {
    require(isWithdrawOperator[operator], "Not a withdraw operator");
    _;
  }

  constructor(
    TokenInfo memory _tokenInfo,
    string memory _initialURI,
    address _owner
  ) ERC721A(_tokenInfo.name, _tokenInfo.symbol) BaseTokenURI(_initialURI) {
    tokenInfo = _tokenInfo;

    transferOwnership(_owner);
  }

  function _baseURI() internal view override(BaseTokenURI, ERC721A) returns (string memory) {
    return BaseTokenURI._baseURI();
  }

  function _startTokenId() internal view virtual override returns (uint256) {
    return tokenInfo.startTokenId;
  }

  function mint(uint256 _mintAmount, bytes memory _signature) external payable {
    require(isSignatureValid(_msgSender(), _signature), "Invalid signature");
    require(balanceOf(_msgSender()) + _mintAmount <= tokenInfo.maxSupply, "Purchase would exceed max supply");

    mintX(_msgSender(), _mintAmount);
  }

  function mintX(address _to, uint256 _mintAmount) private {
    require(tokenInfo.phase != Phase.Paused, "Minting is paused");
    require(_mintAmount > 0, "_mintAmount can not be 0");
    if (_to != owner() && _msgSender() != owner()) {
      uint256 price = tokenInfo.phase == Phase.Whitelist ? tokenInfo.whitelistMintPrice : tokenInfo.publicMintPrice;
      require(msg.value >= price * _mintAmount, "Ether sent is less than minting cost");

      if (msg.value > price * _mintAmount) {
        uint256 excessETH = msg.value - (price * _mintAmount);
        (bool success, ) = address(msg.sender).call{value: excessETH}("");
        require(success, "Unable to refund excess Ether");
      }
    }
    _safeMint(_to, _mintAmount);
  }

  function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
    require(_exists(tokenId), "tokenId not exists");
    string memory currentBaseURI = _baseURI();
    return
      bytes(currentBaseURI).length > 0 ? string(abi.encodePacked(currentBaseURI, tokenId.toString(), ".json")) : "";
  }

  function isSignatureValid(address _whitelistAddress, bytes memory signature) private view returns (bool) {
    bytes32 hash = keccak256(abi.encodePacked(address(this), _whitelistAddress));
    hash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    return tokenInfo.signer == hash.recover(signature);
  }

  // Owner function
  function devMints(address[] calldata _tos, uint256 _mintAmount) external onlyOwner {
    for (uint256 i; i < _tos.length; i++) {
      mintX(_tos[i], _mintAmount);
    }
  }

  function setSigner(address _signer) external onlyOwner {
    tokenInfo.signer = _signer;
  }

  function setWhitelistMintPrice(uint256 _whitelistMintPrice) external onlyOwner {
    tokenInfo.whitelistMintPrice = _whitelistMintPrice;
  }

  function setPublicMintPrice(uint256 _publicMintPrice) external onlyOwner {
    tokenInfo.publicMintPrice = _publicMintPrice;
  }

  function withdraw(address _receipient) external canWithdraw(_msgSender()) {
    (bool sent, ) = payable(_receipient).call{value: address(this).balance}("");
    require(sent, "Failed to send Ether");
  }
}
