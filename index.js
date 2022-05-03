const lcdEndpoint = "https://api.sifchain.finance";
const rpcEndpoint = "https://rpc.sifchain.finance";
const { request } = require("undici");
const fs = require("fs");
const {
	DirectSecp256k1HdWallet,
	EncodeObject,
	Registry,
} = require("@cosmjs/proto-signing");
const { stringToPath } = require("@cosmjs/crypto");
const {
	SigningStargateClient,
	StargateClient,
	defaultRegistryTypes,
} = require("@cosmjs/stargate");
let recompound = JSON.parse(fs.readFileSync("./recompound.json"));
const registry = new Registry([...defaultRegistryTypes]);
(async () => {
	const mnemonic =
		fs.readFileSync("./mnemonic.txt", "utf8").split("\n")[0] || "";
	const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
		prefix: "sif",
	});
	const [firstAccount] = await wallet.getAccounts();

	const client = await SigningStargateClient.connectWithSigner(
		rpcEndpoint,
		wallet,
		{ registry: registry }
	);
	const fee = {
		amount: [
			{
				denom: "rowan", // Use the appropriate fee denom for your chain
				amount: "10000000000000",
			},
		],
		gas: "280000",
	};
	console.log("Coded with <3 by @angrymouse_hns, founder of Another.Software");
	recompound.forEach((comp) => {
		setInterval(async () => {
			try {
				let rewards = await getRewardsFor(firstAccount.address, comp.validator);

				if (uRowanToRowan(rewards) >= comp.minAmount) {
					let tx = await client.signAndBroadcast(
						firstAccount.address,
						[
							{
								typeUrl:
									"/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward",

								value: {
									delegatorAddress: firstAccount.address,
									validatorAddress: comp.validator,
								},
							},
							{
								typeUrl: "/cosmos.staking.v1beta1.MsgDelegate",

								amount: {
									denom: "rowan",
									amount: rewards.toString(),
								},
								value: {
									delegatorAddress: firstAccount.address,
									validatorAddress: comp.validator,
									amount: {
										denom: "rowan",
										amount: rewards.toString(),
									},
								},
							},
						],
						fee,
						"SifReCompound rewards recompound. Stake now with Another.Software!\n https://another.software/sifrecompound"
					);

					console.log("Successfully restaked! TX id:" + tx.transactionHash);
				}
			} catch (e) {
				return;
			}
		}, comp.interval);
	});

	// console.log(uRowanToRowan(rewards));s
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
