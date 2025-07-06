const hre = require("hardhat");

async function main() {
  const FHEVoting = await hre.ethers.getContractFactory("FHEVoting");
  const fhevoting = await FHEVoting.deploy();
  await fhevoting.waitForDeployment();

  console.log("FHEVoting deployed to:", await fhevoting.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});