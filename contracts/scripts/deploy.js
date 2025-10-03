const hre = require("hardhat");

async function main() {
  await hre.run("compile");
  const Contract = await hre.ethers.getContractFactory("PrivacyFootball1X2");
  const contract = await Contract.deploy();
  await contract.waitForDeployment();
  const addr = await contract.getAddress();
  console.log("PrivacyFootball1X2 deployed:", addr);
}

main().catch((e) => { console.error(e); process.exit(1); });


