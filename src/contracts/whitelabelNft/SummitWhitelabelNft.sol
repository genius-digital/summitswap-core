// SPDX-License-Identifier: Unlisenced
// Developed by: dxsoftware.net

import "erc721a/contracts/extensions/ERC721AQueryable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "../shared/BaseTokenURI.sol";

pragma solidity ^0.8.6;

enum Phase {
  Pause,
  Whitelist,
  Public
}

struct TokenInfo {
  string name;
  string symbol;
  uint256 maxSupply;
  uint256 whitelistMintPrice;
  uint256 publicMintPrice;
  Phase phase;
  bool isReveal;
}

contract SummitWhitelabelNft is ERC721AQueryable, BaseTokenURI {
  using Strings for uint256;
  using ECDSA for bytes32;

  TokenInfo public tokenInfo;

  address public immutable signer;

  event Mint(address indexed recipient, uint256 mintCount, uint256 price, Phase phase, uint256 timestamp);
  event PhaseUpdated(Phase phase);
  event WhitelistMintPriceUpdated(uint256 price);
  event PublicMintPriceUpdated(uint256 price);
  event Reveal(bool isReveal);

  constructor(
    TokenInfo memory _tokenInfo,
    string memory _initialURI,
    address _owner,
    address _signer
  ) ERC721A(_tokenInfo.name, _tokenInfo.symbol) BaseTokenURI(_initialURI) {
    tokenInfo = _tokenInfo;

    signer = _signer;

    transferOwnership(_owner);
  }

  function _baseURI() internal view override(BaseTokenURI, ERC721A) returns (string memory) {
    return BaseTokenURI._baseURI();
  }

  function mint(uint256 _mintAmount) external payable {
    require(tokenInfo.phase != Phase.Pause, "Minting is paused");
    require(tokenInfo.phase == Phase.Public, "Please provide signature");

    mintX(_msgSender(), _mintAmount);
  }

  function mint(uint256 _mintAmount, bytes memory _signature) external payable {
    require(tokenInfo.phase != Phase.Pause, "Minting is paused");
    require(tokenInfo.phase == Phase.Whitelist && isSignatureValid(_msgSender(), _signature), "Invalid signature");

    mintX(_msgSender(), _mintAmount);
  }

  function mintX(address _to, uint256 _mintAmount) private {
    require(_mintAmount > 0, "_mintAmount can not be 0");
    require(totalSupply() + _mintAmount <= tokenInfo.maxSupply, "Purchase would exceed max supply");

    uint256 price = tokenInfo.phase == Phase.Whitelist ? tokenInfo.whitelistMintPrice : tokenInfo.publicMintPrice;
    if (_to != owner() && _msgSender() != owner()) {
      require(msg.value >= price * _mintAmount, "Ether sent is less than minting cost");

      if (msg.value > price * _mintAmount) {
        uint256 excessETH = msg.value - (price * _mintAmount);
        (bool success, ) = address(_msgSender()).call{value: excessETH}("");
        require(success, "Unable to refund excess Ether");
      }
    }
    _safeMint(_to, _mintAmount);

    emit Mint(_to, _mintAmount, price, tokenInfo.phase, block.timestamp);
  }

  function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
    require(_exists(tokenId), "tokenId not exists");
    string memory currentBaseURI = _baseURI();
    string memory filename = tokenInfo.isReveal ? tokenId.toString() : "concealed";
    return bytes(currentBaseURI).length > 0 ? string(abi.encodePacked(currentBaseURI, filename, ".json")) : "";
  }

  function isSignatureValid(address _whitelistAddress, bytes memory signature) private view returns (bool) {
    bytes32 hash = keccak256(abi.encodePacked(address(this), _whitelistAddress));
    hash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    return signer == hash.recover(signature);
  }

  // Owner function
  function devMints(address[] calldata _tos, uint256 _mintAmount) external onlyOwner {
    for (uint256 i; i < _tos.length; i++) {
      mintX(_tos[i], _mintAmount);
    }
  }

  function enterPausePhase() external onlyOwner {
    tokenInfo.phase = Phase.Pause;
    emit PhaseUpdated(tokenInfo.phase);
  }

  function enterWhitelistPhase() external onlyOwner {
    tokenInfo.phase = Phase.Whitelist;
    emit PhaseUpdated(tokenInfo.phase);
  }

  function enterPublicPhase() external onlyOwner {
    tokenInfo.phase = Phase.Public;
    emit PhaseUpdated(tokenInfo.phase);
  }

  function setWhitelistMintPrice(uint256 _whitelistMintPrice) external onlyOwner {
    tokenInfo.whitelistMintPrice = _whitelistMintPrice;
    emit WhitelistMintPriceUpdated(_whitelistMintPrice);
  }

  function setPublicMintPrice(uint256 _publicMintPrice) external onlyOwner {
    tokenInfo.publicMintPrice = _publicMintPrice;
    emit PublicMintPriceUpdated(_publicMintPrice);
  }

  function toggleIsReveal() external onlyOwner {
    tokenInfo.isReveal = !tokenInfo.isReveal;
    emit Reveal(tokenInfo.isReveal);
  }

  function withdraw(address _receipient) external onlyOwner {
    (bool sent, ) = payable(_receipient).call{value: address(this).balance}("");
    require(sent, "Failed to send Ether");
  }
}