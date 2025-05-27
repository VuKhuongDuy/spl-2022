import {
  sendAndConfirmTransaction,
  Keypair,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

import {
  ExtensionType,
  createInitializeMintInstruction,
  mintTo,
  getMintLen,
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountIdempotent,
  createInitializeTransferFeeConfigInstruction,
  createInitializeInstruction,
  createInitializeMetadataPointerInstruction
} from "@solana/spl-token";

import {
  connection,
  generateExplorerTxUrl,
  payer,
} from "./utils";
import supportedExtensions from "../configs/spl-extension-config.json";
import deployConfig from "../configs/deploy.json";
import metadata from "../configs/metadata.json";

const mintAuthority = payer;
const mintKeypair = Keypair.generate();
const mint = mintKeypair.publicKey;
const transferFeeConfigAuthority = Keypair.generate();
const withdrawWithheldAuthority = Keypair.generate();
const extensions = supportedExtensions.extensions.map(extension => ExtensionType[extension.name]);
const mintLen = getMintLen(extensions);

const decimals = 9;
const feeBasisPoints = 100; // 1%
const maxFee = BigInt(9 * Math.pow(10, decimals)); // 9 tokens
const mintAmount = BigInt(deployConfig.amount * Math.pow(10, decimals)); // Mint 1,000,000 tokens


const transferAmount = BigInt(1_000 * Math.pow(10, decimals)); // Transfer 1,000 tokens
// Calculate the fee for the transfer
const calcFee = (transferAmount * BigInt(feeBasisPoints)) / BigInt(10_000); // expect 10 fee
const fee = calcFee > maxFee ? maxFee : calcFee; // expect 9 fee


async function main() {
  // Step 2 - Create a New Token
  const mintLamports = await connection.getMinimumBalanceForRentExemption(
    mintLen
  );
  const mintTransaction = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mint,
      space: mintLen,
      lamports: mintLamports,
      programId: TOKEN_2022_PROGRAM_ID,
    })
  );

  extensions.forEach(extension => {
    switch (extension) {
      case ExtensionType.TransferFeeConfig:
        mintTransaction.add(
          createInitializeTransferFeeConfigInstruction(
            mint,
            transferFeeConfigAuthority.publicKey,
            withdrawWithheldAuthority.publicKey,
            feeBasisPoints,
            maxFee,
            TOKEN_2022_PROGRAM_ID
          )
        )
        break;
      default:
        break;
    }
  })

  mintTransaction.add(
    createInitializeMetadataPointerInstruction(mint, payer.publicKey, mint, TOKEN_2022_PROGRAM_ID),
    createInitializeMintInstruction(mint, decimals, payer.publicKey, null, TOKEN_2022_PROGRAM_ID),
    createInitializeInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      mint: mint,
      metadata: mint,
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.url,
      mintAuthority: payer.publicKey,
      updateAuthority: payer.publicKey,
    }),
  );

  const newTokenTx = await sendAndConfirmTransaction(
    connection,
    mintTransaction,
    [payer, mintKeypair],
    undefined
  );
  console.log("New Token Created:", generateExplorerTxUrl(newTokenTx));
  console.log("Mint: ", mintKeypair.publicKey.toString());

  // Step 3 - Mint tokens to Owner
  // const owner = Keypair.generate();
  const owner = payer; // currently the payer is the token owner
  const sourceAccount = await createAssociatedTokenAccountIdempotent(
    connection,
    payer,
    mint,
    owner.publicKey,
    {},
    TOKEN_2022_PROGRAM_ID
  );
  const mintSig = await mintTo(
    connection,
    payer,
    mint,
    sourceAccount,
    mintAuthority,
    mintAmount,
    [],
    undefined,
    TOKEN_2022_PROGRAM_ID
  );
  console.log("Tokens Minted:", generateExplorerTxUrl(mintSig));

  // Step 4 - Send Tokens from Owner to a New Account
  // const destinationOwner = Keypair.generate();
  // const destinationAccount = await createAssociatedTokenAccountIdempotent(
  //   connection,
  //   payer,
  //   mint,
  //   destinationOwner.publicKey,
  //   {},
  //   TOKEN_2022_PROGRAM_ID
  // );
  // const transferSig = await transferCheckedWithFee(
  //   connection,
  //   payer,
  //   sourceAccount,
  //   mint,
  //   destinationAccount,
  //   owner,
  //   transferAmount,
  //   decimals,
  //   fee,
  //   []
  // );
  // console.log("Tokens Transfered:", generateExplorerTxUrl(transferSig));

  // // Step 5 - Fetch Fee Accounts
  // const allAccounts = await connection.getProgramAccounts(TOKEN_2022_PROGRAM_ID, {
  //   commitment: "confirmed",
  //   filters: [
  //     {
  //       memcmp: {
  //         offset: 0,
  //         bytes: mint.toString(),
  //       },
  //     },
  //   ],
  // });

  // const accountsToWithdrawFrom: PublicKey[] = [];
  // for (const accountInfo of allAccounts) {
  //   const account = unpackAccount(accountInfo.pubkey, accountInfo.account, TOKEN_2022_PROGRAM_ID);
  //   const transferFeeAmount = getTransferFeeAmount(account);
  //   if (transferFeeAmount !== null && transferFeeAmount.withheldAmount > BigInt(0)) {
  //     accountsToWithdrawFrom.push(accountInfo.pubkey);
  //   }
  // }

  /**
  // Step 6 - Harvest Fees
  const feeVault = Keypair.generate();
  const feeVaultAccount = await createAssociatedTokenAccountIdempotent(
    connection,
    payer,
    mint,
    feeVault.publicKey,
    {},
    TOKEN_2022_PROGRAM_ID
  );

  const withdrawSig1 = await withdrawWithheldTokensFromAccounts(
    connection,
    payer,
    mint,
    feeVaultAccount,
    withdrawWithheldAuthority,
    [],
    accountsToWithdrawFrom
  );
  console.log("Withdraw from Accounts:", generateExplorerTxUrl(withdrawSig1));
  */

  // Step 7 - revoke freeze authority
  // revokeFreezeAuthority(payer, TOKEN_2022_PROGRAM_ID);
}

// Execute the main function
main();
