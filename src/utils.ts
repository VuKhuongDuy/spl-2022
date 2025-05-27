// Import necessary functions and constants from the Solana web3.js and SPL Token packages
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { setAuthority } from "@solana/spl-token";
import * as web3 from "@solana/web3.js";
import * as bs58 from "bs58";
import dotenv from "dotenv";
dotenv.config();

export const RPC_URL =
  process.env.PRODUCTION === "true"
    ? "https://api.mainnet-beta.solana.com	"
    : "https://api.devnet.solana.com";
// Initialize connection to local Solana node
export const connection = new web3.Connection(RPC_URL, "confirmed");
// Generate keys for payer, mint authority, and mint
export const payer = web3.Keypair.fromSecretKey(Uint8Array.from(bs58.decode(process.env.PRIVATE_KEY)));

export const mint = new web3.PublicKey(
  process.env.TOKEN_TYPE === "spl22" ? process.env.SPL_TOKEN_2022_MINT : process.env.SPL_TOKEN_MINT
);

// Helper function to generate Explorer URL
export function generateExplorerTxUrl(txId: string) {
  if (process.env.PRODUCTION === "true") {
    return `https://explorer.solana.com/tx/${txId}`;
  }
  return `https://explorer.solana.com/tx/${txId}?cluster=devnet`;
}


export async function revokeFreezeAuthority(payer, tokenProgram) {
  // Revoke the freeze authority
  const signature = await setAuthority(
    connection,
    payer,
    mint,
    payer.publicKey,
    1,
    null,
    [],
    undefined,
    tokenProgram
  );

  console.log("txHash: ", signature);
}