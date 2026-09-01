import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createPublicClient,
  http,
  parseAbiItem,
  type Hash,
} from "viem";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import { SHANNON_HTTP_RPC_URL } from "@/lib/dreamdex/config";

const address = "0xd64b02dDd9d088FA8547F9740B841BEd056bDD2D" as const;
const shieldId = "0x83ee536847a3e15657f006d6ff8a6f85c9a4378df47d884f07209c95c93e8cb7" as Hash;
const artifact = JSON.parse(
  readFileSync(
    resolve("contracts/out/SettleShieldReceipt.sol/SettleShieldReceipt.json"),
    "utf8",
  ),
) as { abi: readonly unknown[] };
const client = createPublicClient({
  chain: somniaShannon,
  transport: http(SHANNON_HTTP_RPC_URL),
});

async function main() {
  const orderReceipt = await client.getTransactionReceipt({
    hash: "0x2683372fa36bdeb2ddfd33661636abf79203632484942a9481477c0038242c0e",
  });
  const latestBlock = await client.getBlockNumber();
  const eventToBlock =
    latestBlock < orderReceipt.blockNumber + 999n
      ? latestBlock
      : orderReceipt.blockNumber + 999n;
  const shield = (await client.readContract({
    address,
    abi: artifact.abi,
    functionName: "getShield",
    args: [shieldId],
  })) as {
    owner: string;
    protectionOrderTxHash: Hash;
    settlementReferenceHash: Hash;
    status: number;
  };
  const [created, attested] = await Promise.all([
    client.getLogs({
      address,
      event: parseAbiItem(
        "event ShieldCreated(bytes32 indexed shieldId,address indexed owner,bytes32 indexed marketId,bytes32 protectionOrderTxHash,uint128 maximumCostUsdMicros,uint128 maximumPayoutUsdMicros)",
      ),
      args: { shieldId },
      fromBlock: orderReceipt.blockNumber,
      toBlock: eventToBlock,
    }),
    client.getLogs({
      address,
      event: parseAbiItem(
        "event SettlementAttested(bytes32 indexed shieldId,bytes32 indexed settlementReferenceHash)",
      ),
      args: { shieldId },
      fromBlock: orderReceipt.blockNumber,
      toBlock: eventToBlock,
    }),
  ]);
  console.log(
    JSON.stringify({
      owner: shield.owner,
      status: Number(shield.status),
      orderTx: shield.protectionOrderTxHash,
      settlementReferenceHash: shield.settlementReferenceHash,
      createdTx: created[0]?.transactionHash ?? null,
      attestedTx: attested[0]?.transactionHash ?? null,
      createdBlock: created[0]?.blockNumber?.toString() ?? null,
      attestedBlock: attested[0]?.blockNumber?.toString() ?? null,
    }),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Receipt verification failed.");
  process.exit(1);
});
