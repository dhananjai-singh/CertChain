// ============================================================
// deploy.js — Deploys the CertificateVerification smart contract
// to whichever network is specified in the Hardhat command.
//
// Run with:
//   npx hardhat run scripts/deploy.js --network mumbai
//   (or --network hardhat for local testing)
// ============================================================

// ============================================================
// hre = Hardhat Runtime Environment
// It's automatically available in Hardhat scripts — no import needed.
// It gives us tools like ethers.js, network info, and more.
// ============================================================
const { ethers, network } = require("hardhat");

async function main() {

  // ----------------------------------------------------------
  // STEP 1: Get the deployer wallet info.
  // ethers.getSigners() returns all wallet accounts configured
  // in hardhat.config.js under the current network.
  // We take the first one — that's our deployer wallet.
  // ----------------------------------------------------------
  const [deployer] = await ethers.getSigners();

  console.log("============================================================");
  console.log("  Deploying CertificateVerification Contract");
  console.log("============================================================");
  console.log(`  Network       : ${network.name}`);
  console.log(`  Deployer      : ${deployer.address}`);

  // ----------------------------------------------------------
  // STEP 2: Check the deployer's wallet balance.
  // Deploying costs gas (real MATIC on Mumbai, fake MATIC locally).
  // If balance is 0, deployment will fail — good to know early.
  // ----------------------------------------------------------
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`  Wallet Balance: ${ethers.formatEther(balance)} MATIC`);
  console.log("============================================================");

  // ----------------------------------------------------------
  // STEP 3: Get the Contract Factory.
  // A "factory" is a helper object that knows how to deploy
  // a specific contract. We pass the contract name as a string
  // exactly as it appears in the .sol file.
  // ----------------------------------------------------------
  console.log("\n📦 Preparing contract for deployment...");
  const CertificateVerification = await ethers.getContractFactory(
    "CertificateVerification"
  );

  // ----------------------------------------------------------
  // STEP 4: Deploy the contract.
  // .deploy() sends the deployment transaction to the blockchain.
  // This is where gas is spent.
  // Our constructor takes no arguments, so nothing is passed here.
  // ----------------------------------------------------------
  console.log("🚀 Deploying to blockchain... (this may take a moment)");
  const contract = await CertificateVerification.deploy();

  // ----------------------------------------------------------
  // STEP 5: Wait for deployment to be confirmed.
  // waitForDeployment() waits until the transaction is mined
  // and confirmed on the network. Don't skip this step!
  // ----------------------------------------------------------
  await contract.waitForDeployment();

  // ----------------------------------------------------------
  // STEP 6: Get and display the deployed contract address.
  // This address is VERY IMPORTANT — save it somewhere safe!
  // You'll need to paste it into your React frontend later.
  // ----------------------------------------------------------
  const contractAddress = await contract.getAddress();

  console.log("\n============================================================");
  console.log("  ✅ Deployment Successful!");
  console.log("============================================================");
  console.log(`  Contract Address : ${contractAddress}`);
  console.log(`  Network          : ${network.name}`);
  console.log(`  Deployed By      : ${deployer.address}`);
  console.log("============================================================");

  // ----------------------------------------------------------
  // STEP 7: Whitelist the college wallet(s).
  // For the local demo the deployer wallet doubles as the college
  // that issues certificates, so we whitelist it automatically.
  // Set COLLEGE_ADDRESS in the environment to whitelist another wallet.
  // ----------------------------------------------------------
  console.log("\n🏫 Whitelisting college wallet(s)...");

  const toWhitelist = [deployer.address];
  if (process.env.COLLEGE_ADDRESS &&
      process.env.COLLEGE_ADDRESS.toLowerCase() !== deployer.address.toLowerCase()) {
    toWhitelist.push(process.env.COLLEGE_ADDRESS);
  }

  for (const addr of toWhitelist) {
    const already = await contract.isCollegeWhitelisted(addr);
    if (already) {
      console.log(`   • ${addr} — already whitelisted`);
    } else {
      const wtx = await contract.addCollege(addr);
      await wtx.wait();
      console.log(`   • ${addr} — whitelisted ✅`);
    }
  }

  // ----------------------------------------------------------
  // STEP 8: Auto-sync the frontend so nothing is copied by hand.
  //   8a → write the contract address into frontend/.env
  //   8b → copy the compiled ABI into frontend/src/contract-abi.json
  // ----------------------------------------------------------
  try {
    const fs   = require("fs");
    const path = require("path");

    // 8a — update REACT_APP_CONTRACT_ADDRESS in frontend/.env
    const envPath = path.join(__dirname, "../../frontend/.env");
    if (fs.existsSync(envPath)) {
      let env = fs.readFileSync(envPath, "utf8");
      if (/^REACT_APP_CONTRACT_ADDRESS=.*$/m.test(env)) {
        env = env.replace(/^REACT_APP_CONTRACT_ADDRESS=.*$/m,
                          `REACT_APP_CONTRACT_ADDRESS=${contractAddress}`);
      } else {
        env += `\nREACT_APP_CONTRACT_ADDRESS=${contractAddress}\n`;
      }
      fs.writeFileSync(envPath, env);
      console.log("\n🔗 Synced frontend/.env → REACT_APP_CONTRACT_ADDRESS");
    }

    // 8b — copy the ABI into frontend/src/contract-abi.json
    const artifactPath = path.join(
      __dirname,
      "../artifacts/contracts/CertificateVerification.sol/CertificateVerification.json"
    );
    const abiOutPath = path.join(__dirname, "../../frontend/src/contract-abi.json");
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    fs.writeFileSync(abiOutPath, JSON.stringify(artifact.abi, null, 2));
    console.log("📄 Synced ABI       → frontend/src/contract-abi.json");
  } catch (syncErr) {
    console.log(`\n⚠️  Could not auto-sync frontend: ${syncErr.message}`);
    console.log("   Copy the address/ABI manually (see README) if needed.");
  }

  console.log("\n📋 NEXT STEP: start the frontend with `npm start` (in frontend/).");

  // ----------------------------------------------------------
  // OPTIONAL: Verify on Polygonscan automatically after deploy.
  // Uncomment the block below if you want auto-verification.
  // Make sure POLYGONSCAN_KEY is set in your .env file first.
  // ----------------------------------------------------------

  // if (network.name === "mumbai") {
  //   console.log("\n⏳ Waiting 30 seconds before Polygonscan verification...");
  //   await new Promise(resolve => setTimeout(resolve, 30000));
  //
  //   await hre.run("verify:verify", {
  //     address: contractAddress,
  //     constructorArguments: [],
  //   });
  //   console.log("✅ Contract verified on Polygonscan!");
  // }
}

// ============================================================
// Standard Hardhat pattern for running async main().
// If something goes wrong, it logs the error and exits
// with code 1 (signals failure to the terminal).
// ============================================================
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed!");
    console.error(error);
    process.exit(1);
  });
