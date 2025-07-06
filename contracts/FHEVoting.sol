// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint32, externalEuint32 } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title A simple FHE voting contract with 3 options
contract FHEVoting is SepoliaConfig {
    euint32 private votesA;
    euint32 private votesB;
    euint32 private votesC;

    mapping(address => bool) public hasVoted;

    /// @notice Returns the encrypted vote counts for all options
    function getVotes() external view returns (euint32, euint32, euint32) {
        return (votesA, votesB, votesC);
    }

    /// @notice Vote for an option (0, 1, or 2), encrypted
    /// @dev Accepts an encrypted option. Each address can vote once.
    function vote(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        require(!hasVoted[msg.sender], "Already voted");

        euint32 encryptedOption = FHE.fromExternal(inputEuint32, inputProof);
        euint32 one = FHE.asEuint32(1);

        votesA = FHE.select(
            FHE.eq(encryptedOption, FHE.asEuint32(0)),
            FHE.add(votesA, one),
            votesA
        );
        votesB = FHE.select(
            FHE.eq(encryptedOption, FHE.asEuint32(1)),
            FHE.add(votesB, one),
            votesB
        );
        votesC = FHE.select(
            FHE.eq(encryptedOption, FHE.asEuint32(2)),
            FHE.add(votesC, one),
            votesC
        );

        hasVoted[msg.sender] = true;

        FHE.allowThis(votesA);
        FHE.allowThis(votesB);
        FHE.allowThis(votesC);
        FHE.allow(votesA, msg.sender);
        FHE.allow(votesB, msg.sender);
        FHE.allow(votesC, msg.sender);
    }
}
