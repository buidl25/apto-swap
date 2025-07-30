const { AptosAccount, HexString } = require("aptos");

const privateKey = process.env.APTOS_PRIVATE_KEY;
const account = new AptosAccount(HexString.ensure(privateKey).toUint8Array());

console.log("Aptos Address:", account.address().hex());