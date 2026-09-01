import {
  createPublicClient,
  encodePacked,
  getAddress,
  http,
  isAddress,
  keccak256,
  parseAbi,
  toHex,
  type Account,
  type Address,
  type Hash,
  type WalletClient,
} from "viem";
import {
  SHANNON_HTTP_RPC_URL,
  somniaShannon,
} from "@/lib/dreamdex/config";

const receiptAbi = parseAbi([
  "function createShield(bytes32 shieldId, bytes32 exposureHash, bytes32 marketId, bytes32 protectionOrderTxHash, uint128 exposureUsdMicros, uint128 maximumCostUsdMicros, uint128 protectedSharesMicros, uint128 maximumPayoutUsdMicros, uint64 eventContractExpiry)",
  "function attestSettlement(bytes32 shieldId, bytes32 settlementReferenceHash)",
  "function finalizeShield(bytes32 shieldId, uint8 winningOutcome, bool voided, uint128 payoutUsdMicros, bytes32 redemptionTxHash)",
]);

const publicClient = createPublicClient({
  chain: somniaShannon,
  transport: http(SHANNON_HTTP_RPC_URL),
});

export interface CreateShieldInput {
  settlementType: "invoice" | "bridge";
  externalReference: string;
  marketId: Hash;
  protectionOrderTxHash: Hash;
  exposureUsdMicros: bigint;
  maximumCostUsdMicros: bigint;
  protectedSharesMicros: bigint;
  maximumPayoutUsdMicros: bigint;
  eventContractExpiry: number;
}

export interface ReceiptWrite {
  shieldId: Hash;
  transactionHash: Hash;
}

export function configuredReceiptAddress(): `0x${string}` | null {
  const value = process.env.NEXT_PUBLIC_SETTLESHIELD_RECEIPT_ADDRESS;
  return value && isAddress(value) ? getAddress(value) : null;
}

async function writerAccount(wallet: WalletClient): Promise<Account | Address> {
  if (wallet.account) return wallet.account;
  const accounts = await wallet.getAddresses();
  const account = accounts[0];
  if (!account) throw new Error("Connect a wallet before writing a receipt.");
  return getAddress(account);
}

function accountAddress(account: Account | Address): Address {
  return typeof account === "string" ? getAddress(account) : getAddress(account.address);
}

async function confirm(hash: Hash, label: string): Promise<void> {
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error(`${label} reverted onchain.`);
  }
}

export async function createShieldReceipt(
  wallet: WalletClient,
  input: CreateShieldInput,
): Promise<ReceiptWrite> {
  const address = configuredReceiptAddress();
  if (!address) {
    throw new Error("Deploy the Shannon receipt registry and configure NEXT_PUBLIC_SETTLESHIELD_RECEIPT_ADDRESS first.");
  }
  const account = await writerAccount(wallet);
  const owner = accountAddress(account);
  const shieldId = keccak256(
    encodePacked(
      ["address", "bytes32"],
      [owner, input.protectionOrderTxHash],
    ),
  );
  const exposureHash = keccak256(
    toHex(
      [
        input.settlementType,
        input.externalReference.trim(),
        input.exposureUsdMicros.toString(),
        input.marketId,
      ].join("|"),
    ),
  );

  const transactionHash = await wallet.writeContract({
    account,
    address,
    abi: receiptAbi,
    functionName: "createShield",
    args: [
      shieldId,
      exposureHash,
      input.marketId,
      input.protectionOrderTxHash,
      input.exposureUsdMicros,
      input.maximumCostUsdMicros,
      input.protectedSharesMicros,
      input.maximumPayoutUsdMicros,
      BigInt(input.eventContractExpiry),
    ],
    chain: somniaShannon,
  });
  await confirm(transactionHash, "Receipt creation");
  return { shieldId, transactionHash };
}

export async function attestSettlementReceipt(
  wallet: WalletClient,
  shieldId: Hash,
  externalSettlementReference: string,
): Promise<Hash> {
  const address = configuredReceiptAddress();
  if (!address) throw new Error("Receipt registry is not configured.");
  const reference = externalSettlementReference.trim();
  if (!reference) throw new Error("Enter the external settlement transaction or attestation reference.");
  const account = await writerAccount(wallet);
  const hash = await wallet.writeContract({
    account,
    address,
    abi: receiptAbi,
    functionName: "attestSettlement",
    args: [shieldId, keccak256(toHex(reference))],
    chain: somniaShannon,
  });
  await confirm(hash, "Settlement attestation");
  return hash;
}

export async function finalizeShieldReceipt(
  wallet: WalletClient,
  shieldId: Hash,
  winningOutcome: 0 | 1,
  voided: boolean,
  payoutUsdMicros: bigint,
  redemptionTxHash: Hash,
): Promise<Hash> {
  const address = configuredReceiptAddress();
  if (!address) throw new Error("Receipt registry is not configured.");
  const account = await writerAccount(wallet);
  const hash = await wallet.writeContract({
    account,
    address,
    abi: receiptAbi,
    functionName: "finalizeShield",
    args: [shieldId, winningOutcome, voided, payoutUsdMicros, redemptionTxHash],
    chain: somniaShannon,
  });
  await confirm(hash, "Receipt finalization");
  return hash;
}
