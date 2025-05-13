import {
  Collection,
  CreateMetadataAccountV3InstructionAccounts,
  CreateMetadataAccountV3InstructionDataArgs,
  Creator,
  UpdateMetadataAccountV2InstructionAccounts,
  UpdateMetadataAccountV2InstructionData,
  Uses,
  createMetadataAccountV3,
  updateMetadataAccountV2,
  findMetadataPda,
} from "@metaplex-foundation/mpl-token-metadata";
import * as web3 from "@solana/web3.js";
import { PublicKey, createSignerFromKeypair, none, signerIdentity, some } from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { fromWeb3JsKeypair, fromWeb3JsPublicKey } from "@metaplex-foundation/umi-web3js-adapters";
import fs from "fs";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import metadataJson from "../metadata/spl.json";
import { mint, payer, RPC_URL } from "./utils";

export function loadWalletKey(keypairFile: string): web3.Keypair {
  const loaded = web3.Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(keypairFile).toString())));
  return loaded;
}

const INITIALIZE = true;

async function main() {
  const keypair = payer;
  const umi = createUmi(RPC_URL);
  const signer = createSignerFromKeypair(umi, fromWeb3JsKeypair(keypair));
  umi.use(signerIdentity(signer, true));

  const ourMetadata = {
    // TODO change those values!
    name: metadataJson.name,
    symbol: metadataJson.symbol,
    uri: "https://your-metadata.json",
  };
  const onChainData = {
    ...ourMetadata,
    // we don't need that
    sellerFeeBasisPoints: 0,
    creators: none<Creator[]>(),
    collection: none<Collection>(),
    uses: none<Uses>(),
  };
  if (INITIALIZE) {
    const accounts: CreateMetadataAccountV3InstructionAccounts = {
      mint: fromWeb3JsPublicKey(mint),
      mintAuthority: signer,
    };
    const data: CreateMetadataAccountV3InstructionDataArgs = {
      isMutable: true,
      collectionDetails: null,
      data: onChainData,
    };
    const txid = await createMetadataAccountV3(umi, { ...accounts, ...data }).sendAndConfirm(umi);
    console.log(txid);
  } else {
    const data: UpdateMetadataAccountV2InstructionData = {
      data: some(onChainData),
      discriminator: 0,
      isMutable: some(true),
      newUpdateAuthority: none<PublicKey>(),
      primarySaleHappened: none<boolean>(),
    };
    const accounts: UpdateMetadataAccountV2InstructionAccounts = {
      metadata: findMetadataPda(umi, { mint: fromWeb3JsPublicKey(mint) }),
      updateAuthority: signer,
    };
    const txid = await updateMetadataAccountV2(umi, { ...accounts, ...data }).sendAndConfirm(umi);
    console.log(txid);
  }
}

main();
