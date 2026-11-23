# ============================================================
# start-demo.ps1 - One-command local demo launcher.
#
# What it does, in order:
#   1. Installs dependencies (first run only)
#   2. Compiles the smart contract
#   3. Starts a local Hardhat blockchain in its own window
#   4. Deploys the contract, whitelists your wallet, and syncs
#      the contract address + ABI into the frontend automatically
#   5. Starts the React app in its own window
#
# Run it from the project root:
#   powershell -ExecutionPolicy Bypass -File start-demo.ps1
#
# Optional - whitelist your own MetaMask address instead of the
# default Hardhat test account:
#   powershell -ExecutionPolicy Bypass -File start-demo.ps1 -CollegeAddress 0xYourAddress
# ============================================================

param(
  [string]$CollegeAddress = ""
)

$ErrorActionPreference = "Stop"

$root        = $PSScriptRoot
$contractDir = Join-Path $root "contract"
$frontendDir = Join-Path $root "frontend"

# Standard, publicly-known Hardhat test account #0 (safe to share - test only).
$DemoAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
$DemoKey     = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

function Write-Step($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Magenta }

# ------------------------------------------------------------
# 1. Install dependencies (only if missing)
# ------------------------------------------------------------
Write-Step "1/5  Checking dependencies"
if (-not (Test-Path (Join-Path $contractDir "node_modules"))) {
  Write-Host "Installing contract dependencies..."
  Push-Location $contractDir; npm install; Pop-Location
} else { Write-Host "Contract deps OK." }

if (-not (Test-Path (Join-Path $frontendDir "node_modules"))) {
  Write-Host "Installing frontend dependencies..."
  Push-Location $frontendDir; npm install; Pop-Location
} else { Write-Host "Frontend deps OK." }

# Warn (but continue) if Pinata keys are still placeholders.
# Everything works except the PDF-to-IPFS upload.
$envFile = Join-Path $frontendDir ".env"
if ((Get-Content $envFile -Raw) -match "your_pinata_api_key_here") {
  Write-Host "`n[!] Pinata keys are still placeholders in frontend/.env." -ForegroundColor Yellow
  Write-Host "    Issuing works up to the IPFS upload step. Add real keys for a full run." -ForegroundColor Yellow
}

# ------------------------------------------------------------
# 2. Compile the contract
# ------------------------------------------------------------
Write-Step "2/5  Compiling smart contract"
Push-Location $contractDir; npx hardhat compile; Pop-Location

# ------------------------------------------------------------
# 3. Start the local Hardhat node in a separate window
# ------------------------------------------------------------
Write-Step "3/5  Starting local blockchain (new window)"
$nodeCmd = "Set-Location -LiteralPath '$contractDir'; Write-Host 'Hardhat node - keep this window open'; npx hardhat node"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $nodeCmd

# Wait for the RPC endpoint to respond
Write-Host "Waiting for the blockchain to be ready..."
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
  try {
    $body = '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
    Invoke-RestMethod -Uri "http://127.0.0.1:8545" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 2 | Out-Null
    $ready = $true; break
  } catch { Start-Sleep -Seconds 1 }
}
if (-not $ready) { Write-Host "Blockchain did not start in time. Aborting." -ForegroundColor Red; exit 1 }
Write-Host "Blockchain is up." -ForegroundColor Green

# ------------------------------------------------------------
# 4. Deploy + whitelist + sync frontend
# ------------------------------------------------------------
Write-Step "4/5  Deploying contract and syncing frontend"
if ($CollegeAddress -ne "") { $env:COLLEGE_ADDRESS = $CollegeAddress }
Push-Location $contractDir
npx hardhat run scripts/deploy.js --network localhost
Pop-Location

# ------------------------------------------------------------
# 5. Start the React app in a separate window
# ------------------------------------------------------------
Write-Step "5/5  Starting the React app (new window)"
$frontCmd = "Set-Location -LiteralPath '$frontendDir'; npm start"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontCmd

# ------------------------------------------------------------
# Final instructions
# ------------------------------------------------------------
Write-Host "`n============================================================" -ForegroundColor Green
Write-Host "  Demo is starting. The app opens at http://localhost:3000" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "ONE-TIME MetaMask setup for the demo:" -ForegroundColor Cyan
Write-Host "  1. Add a network:" -ForegroundColor Cyan
Write-Host "       Name 'Hardhat Localhost', RPC http://127.0.0.1:8545, Chain ID 31337, Symbol ETH" -ForegroundColor Cyan
Write-Host "  2. Import this test account (already whitelisted to issue):" -ForegroundColor Cyan
Write-Host "       Address     : $DemoAddress" -ForegroundColor Cyan
Write-Host "       Private key : $DemoKey" -ForegroundColor Cyan
Write-Host "  3. Select that account and the Hardhat Localhost network in MetaMask." -ForegroundColor Cyan
Write-Host ""
Write-Host "Then: Issue a certificate, copy its ID, and verify it on the Verify page." -ForegroundColor Cyan
Write-Host "To stop the demo: close the Hardhat node and React windows." -ForegroundColor Cyan
