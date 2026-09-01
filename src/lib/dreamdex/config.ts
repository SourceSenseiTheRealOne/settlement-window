import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import type { SomniaMarketsAddresses } from "@somnia-chain/markets-sdk";

export const SHANNON_CHAIN_ID = 50_312;
export const SHANNON_INDEXER_URL =
  process.env.DREAMDEX_INDEXER_URL ?? "https://dev.smk.somnia.host/v1/graphql";
export const SHANNON_HTTP_RPC_URL =
  process.env.DREAMDEX_RPC_URL ?? "https://api.infra.testnet.somnia.network";
export const SHANNON_WS_RPC_URL =
  process.env.DREAMDEX_WS_RPC_URL ?? "wss://api.infra.testnet.somnia.network/ws";
export const SHANNON_EXPLORER_URL = "https://shannon-explorer.somnia.network";

/** Current DreamDEX Bot Kit venue value. Runtime discovery still refuses ambiguity. */
export const BOT_KIT_TESTNET_VENUE_ID =
  "0x679795a0195a1b76cdebb7c51d74e058aee92919b8c3389af86ef24535e8a28c";

export const SHANNON_MARKETS_ADDRESSES: SomniaMarketsAddresses = {
  collateral: "0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E",
  testUsdc: "0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E",
  binaryModule: "0x3ecC694Cef705358864a646142ac17A90E29e388",
  marketsCore: "0x2802504314685D89bF6C992CA5a8e7cC78bc0294",
  marketCreator: "0x5Ce69567dB39C8fBAd7e048bEfdbcCdfE67B44e6",
  clobFactory: "0xb2BE8EE02F96379DB75f01802384593EBa9bfF04",
  binaryPoolImpl: "0x82A1FcdaA2daC2fC7D5f9909D43E68021eE966FD",
  binarySettlement: "0xbF4a49e0Dfd092e5FBE8E5761064C49533e6Ed23",
  collateralRouter: "0xbC0C9834B15ACE38bB50dDaa7d7f7C7CC4DC183C",
  marketCreatorFactory: "0xE6bEE93cE87c9E6e62aCb621caa7832EE47b4F6B",
  oracleHub: "0xe40db387cC98601Dd11bd634fF2f3AD5686dE32b",
};

export { somniaShannon };
