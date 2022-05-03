const lcdEndpoint = "https://api.sifchain.finance";
const rpcEndpoint = "https://rpc.sifchain.finance";
const { request } = require("undici");
const fs = require("fs");
const { DirectSecp256k1HdWallet } = require("@cosmjs/proto-signing");
const { stringToPath } = require("@cosmjs/crypto");
const { SigningStargateClient, StargateClient } = require("@cosmjs/stargate");
(async () => {
	const mnemonic =
		fs.readFileSync("./mnemonic.txt", "utf8").split("\n")[0] || "";
	const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
		prefix: "sif",
	});
	const [firstAccount] = await wallet.getAccounts();

	const client = await SigningStargateClient.connectWithSigner(
		rpcEndpoint,
		wallet
	);

	let rewards = await getRewardsFor(
		firstAccount.address,
		"sifvaloper1sz4vscgjuqqntt2pjs65u96mhy5tu5qw958nxt"
	);

	console.log(uRowanToRowan(rewards));
	// console.log(uRowanToRowan(urowan));
})();

function uRowanToRowan(uRowan) {
	uRowan = BigInt(uRowan);
	return parseInt(uRowan / 1000000000000n) / 1000000;
}
async function getRewardsFor(delegator, validator) {
	let rewards = await (
		await request(
			lcdEndpoint +
				"/cosmos/distribution/v1beta1/delegators/" +
				delegator +
				"/rewards",
			{ method: "GET", maxRedirections: 3 }
		)
	).body.json();
	let reward = rewards.rewards.find(
		(reward) => reward.validator_address === validator
	);
	let rewardNum = 0n;

	if (reward && reward.reward && reward.reward[0] && reward.reward[0].amount) {
		rewardNum = BigInt(reward.reward[0].amount.split(".")[0]);
	}
	return rewardNum;
}
