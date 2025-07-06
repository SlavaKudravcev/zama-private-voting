import { FHEVoting, FHEVoting__factory } from "../types";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHEVoting")) as FHEVoting__factory;
  const fheVotingContract = (await factory.deploy()) as FHEVoting;
  const fheVotingContractAddress = await fheVotingContract.getAddress();

  return { fheVotingContract, fheVotingContractAddress };
}

describe("FHEVoting", function () {
  let signers: Signers;
  let fheVotingContract: FHEVoting;
  let fheVotingContractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async () => {
    ({ fheVotingContract, fheVotingContractAddress } = await deployFixture());
  });

  it("encrypted votes should be uninitialized after deployment", async function () {
    const [a, b, c] = await fheVotingContract.getVotes();
    expect(a).to.eq(ethers.ZeroHash);
    expect(b).to.eq(ethers.ZeroHash);
    expect(c).to.eq(ethers.ZeroHash);
  });

  it("should allow Alice to vote for option 0 (A)", async function () {
    // Alice encrypts option 0
    const encryptedZero = await fhevm
      .createEncryptedInput(fheVotingContractAddress, signers.alice.address)
      .add32(0)
      .encrypt();

    // Vote
    const tx = await fheVotingContract
      .connect(signers.alice)
      .vote(encryptedZero.handles[0], encryptedZero.inputProof);
    await tx.wait();

    // Get encrypted results
    const [a, b, c] = await fheVotingContract.getVotes();

    // Decrypt Alice's count for A
    const clearA = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      a,
      fheVotingContractAddress,
      signers.alice,
    );
    expect(clearA).to.eq(1);

    // Other counts must be zero
    const clearB = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      b,
      fheVotingContractAddress,
      signers.alice,
    );
    const clearC = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      c,
      fheVotingContractAddress,
      signers.alice,
    );
    expect(clearB).to.eq(0);
    expect(clearC).to.eq(0);
  });

  it("should allow Bob to vote for option 2 (C)", async function () {
    // Bob encrypts option 2
    const encryptedTwo = await fhevm
      .createEncryptedInput(fheVotingContractAddress, signers.bob.address)
      .add32(2)
      .encrypt();

    // Vote
    const tx = await fheVotingContract
      .connect(signers.bob)
      .vote(encryptedTwo.handles[0], encryptedTwo.inputProof);
    await tx.wait();

    // Get encrypted results
    const [a, b, c] = await fheVotingContract.getVotes();

    // Decrypt Bob's count for C
    const clearC = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      c,
      fheVotingContractAddress,
      signers.bob,
    );
    expect(clearC).to.eq(1);

    // Other counts must be zero
    const clearA = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      a,
      fheVotingContractAddress,
      signers.bob,
    );
    const clearB = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      b,
      fheVotingContractAddress,
      signers.bob,
    );
    expect(clearA).to.eq(0);
    expect(clearB).to.eq(0);
  });

  it("should not allow double voting", async function () {
    // Alice votes for option 1 (B)
    const encryptedOne = await fhevm
      .createEncryptedInput(fheVotingContractAddress, signers.alice.address)
      .add32(1)
      .encrypt();
    const tx = await fheVotingContract
      .connect(signers.alice)
      .vote(encryptedOne.handles[0], encryptedOne.inputProof);
    await tx.wait();

    // Alice tries to vote again
    await expect(
      fheVotingContract
        .connect(signers.alice)
        .vote(encryptedOne.handles[0], encryptedOne.inputProof),
    ).to.be.revertedWith("Already voted");
  });
});