// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

// =============================================================
// CertificateVerification — Decentralized Academic Certificate
//
// FEATURES (v2):
//   1. On-chain certificate registry (certId → Certificate)
//   2. College whitelist (onlyWhitelistedCollege modifier)
//   3. Per-file SHA-256 hash stored on-chain for tamper detection
//   4. Soulbound ERC-721 NFT minted for each certificate —
//      non-transferable so degrees can't be sold or faked
// =============================================================
contract CertificateVerification is Ownable, ERC721 {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    // Each certificate record stored on-chain.
    struct Certificate {
        string  studentName;   // Full name of the student
        string  collegeName;   // Name of the issuing college
        string  ipfsCID;       // IPFS CID of the certificate PDF
        string  certId;        // Unique certificate ID
        string  fileHash;      // SHA-256 hash of the PDF (browser-computed)
        address issuedBy;      // College wallet that issued it
        uint256 issuedAt;      // Unix timestamp
        bool    isValid;       // false = revoked
        uint256 tokenId;       // Soulbound NFT token ID
    }

    mapping(string  => Certificate) private certificates;
    mapping(address => bool)        private whitelistedColleges;
    mapping(uint256 => string)      private tokenToCertId;

    // ---- Events ----
    event CertificateIssued(
        string          certId,
        string          studentName,
        string          collegeName,
        address indexed issuedBy,
        uint256         issuedAt,
        uint256         tokenId
    );
    event CertificateRevoked(
        string          certId,
        address indexed revokedBy,
        uint256         revokedAt
    );
    event CollegeWhitelisted(address indexed college);
    event CollegeRemovedFromWhitelist(address indexed college);

    modifier onlyWhitelistedCollege() {
        require(
            whitelistedColleges[msg.sender],
            "Access denied: Your wallet is not a whitelisted college."
        );
        _;
    }

    // ERC721 constructor sets the NFT name and symbol.
    constructor() ERC721("CertChain Degree", "CERT") {}

    // ---------------------------------------------------------------
    // SOULBOUND: block all transfers except minting (from == 0x0).
    // Degrees cannot be sold, gifted, or forged by wallet transfer.
    // ---------------------------------------------------------------
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 firstTokenId,
        uint256 batchSize
    ) internal override {
        require(
            from == address(0),
            "Soulbound: certificate NFTs are non-transferable."
        );
        super._beforeTokenTransfer(from, to, firstTokenId, batchSize);
    }

    // ---------------------------------------------------------------
    // ADMIN: add / remove a college from the whitelist
    // ---------------------------------------------------------------
    function addCollege(address _collegeAddress) external onlyOwner {
        require(_collegeAddress != address(0), "Invalid address.");
        require(!whitelistedColleges[_collegeAddress], "Already whitelisted.");
        whitelistedColleges[_collegeAddress] = true;
        emit CollegeWhitelisted(_collegeAddress);
    }

    function removeCollege(address _collegeAddress) external onlyOwner {
        require(whitelistedColleges[_collegeAddress], "Not in whitelist.");
        whitelistedColleges[_collegeAddress] = false;
        emit CollegeRemovedFromWhitelist(_collegeAddress);
    }

    // ---------------------------------------------------------------
    // ISSUE: record a new certificate and mint a soulbound NFT.
    //
    // Parameters:
    //   _certId        → unique certificate ID
    //   _studentName   → student full name
    //   _collegeName   → college name
    //   _ipfsCID       → IPFS CID of the PDF
    //   _fileHash      → SHA-256 hex hash of the PDF (0x...)
    //   _studentWallet → student wallet to receive the NFT
    //                    (pass address(0) to mint to the college)
    // ---------------------------------------------------------------
    function issueCertificate(
        string  memory _certId,
        string  memory _studentName,
        string  memory _collegeName,
        string  memory _ipfsCID,
        string  memory _fileHash,
        address        _studentWallet
    ) external onlyWhitelistedCollege {
        require(bytes(_certId).length      > 0, "Certificate ID cannot be empty.");
        require(bytes(_studentName).length > 0, "Student name cannot be empty.");
        require(bytes(_collegeName).length > 0, "College name cannot be empty.");
        require(bytes(_ipfsCID).length     > 0, "IPFS CID cannot be empty.");
        require(certificates[_certId].issuedAt == 0, "Certificate ID already exists.");

        // Mint the soulbound NFT
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        address mintTo = (_studentWallet != address(0)) ? _studentWallet : msg.sender;
        _safeMint(mintTo, newTokenId);
        tokenToCertId[newTokenId] = _certId;

        // Store the record on-chain
        certificates[_certId] = Certificate({
            studentName : _studentName,
            collegeName : _collegeName,
            ipfsCID     : _ipfsCID,
            certId      : _certId,
            fileHash    : _fileHash,
            issuedBy    : msg.sender,
            issuedAt    : block.timestamp,
            isValid     : true,
            tokenId     : newTokenId
        });

        emit CertificateIssued(
            _certId, _studentName, _collegeName,
            msg.sender, block.timestamp, newTokenId
        );
    }

    // ---------------------------------------------------------------
    // VERIFY: free read-only lookup — returns all certificate fields.
    // ---------------------------------------------------------------
    function verifyCertificate(string memory _certId)
        external view
        returns (
            string  memory studentName,
            string  memory collegeName,
            string  memory ipfsCID,
            string  memory fileHash,
            address        issuedBy,
            uint256        issuedAt,
            bool           isValid,
            uint256        tokenId
        )
    {
        require(certificates[_certId].issuedAt != 0, "No certificate found with this ID.");
        Certificate memory c = certificates[_certId];
        return (c.studentName, c.collegeName, c.ipfsCID, c.fileHash,
                c.issuedBy, c.issuedAt, c.isValid, c.tokenId);
    }

    // ---------------------------------------------------------------
    // REVOKE: mark a certificate invalid.
    // Only the college that issued it can revoke it.
    // ---------------------------------------------------------------
    function revokeCertificate(string memory _certId) external onlyWhitelistedCollege {
        require(certificates[_certId].issuedAt != 0, "No certificate found.");
        require(certificates[_certId].isValid,        "Already revoked.");
        require(certificates[_certId].issuedBy == msg.sender,
                "Only the issuing college can revoke.");
        certificates[_certId].isValid = false;
        emit CertificateRevoked(_certId, msg.sender, block.timestamp);
    }

    // ---- Helpers ----
    function isCollegeWhitelisted(address _addr) external view returns (bool) {
        return whitelistedColleges[_addr];
    }

    function totalIssued() external view returns (uint256) {
        return _tokenIds.current();
    }

    function getCertIdByTokenId(uint256 _tokenId) external view returns (string memory) {
        return tokenToCertId[_tokenId];
    }
}
