import * as umiBundler from "@metaplex-foundation/umi-bundle-defaults";
import * as mpl from "@metaplex-foundation/mpl-token-metadata";
import * as umiLib from "@metaplex-foundation/umi";
import { METADATA_URL, payer, RPC_URL } from "./utils";
import metadataJson from "../metadata/spl.json";

const metadata = {
  name: metadataJson.name,
  symbol: metadataJson.symbol,
  uri: METADATA_URL,
};

async function createTokenAndMint(rpc, wallet, { metadata, amount, decimals }) {
  const umi = umiBundler.createUmi(rpc).use(mpl.mplTokenMetadata());
  const payer = umiLib.createSignerFromKeypair(
    umi,
    umi.eddsa.createKeypairFromSecretKey(wallet.secretKey)
  );
  umi.use(umiLib.keypairIdentity(payer));

  const mint = umiLib.generateSigner(umi);

  await mpl
    .createAndMint(umi, {
      mint,
      authority: umi.identity,
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
      sellerFeeBasisPoints: umiLib.percentAmount(0),
      decimals: decimals,
      amount: BigInt(amount * Math.pow(10, decimals)),
      tokenOwner: umi.identity.publicKey,
      tokenStandard: mpl.TokenStandard.Fungible,
    })
    .sendAndConfirm(umi)
    .then(() => {
      console.log("Token Deployed");
    });

  return { tokenAddress: mint.publicKey, mintSecretKey: mint.secretKey };
}

async function main() {
  createTokenAndMint(RPC_URL, payer, {
    metadata: metadata,
    amount: 1000000000,
    decimals: 9,
  })
    .then(({ tokenAddress, mintSecretKey }) => {
      console.log("Token Address:", tokenAddress);
      console.log("Mint secret key:", mintSecretKey);
    })
    .catch((err) => {
      console.error("Error creating token:", err);
    });
}

main();
