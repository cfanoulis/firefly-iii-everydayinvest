import { FastifyPluginAsync } from "fastify";
import { randomUUID } from "node:crypto";
import createClient from "openapi-fetch";
import { components, paths } from "../../types/firefly";

const client = createClient<paths>({
	baseUrl: `${process.env.FIREFLY_URL}/api/`,
});

const webhook: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.get(
		"/hook",
		{
			schema: {
				response: {
					200: {
						type: "object",
						properties: {
							ack: { type: "boolean" },
						},
					},
					403: {
						type: "object",
						properties: {
							error: { type: "string" },
						},
					},
					503: {
						type: "object",
						properties: {
							error: { type: "string" },
						},
					},
				},
			},
		},
		async function (request, reply) {
			//todo: signature verification

			const trace = randomUUID();
			fastify.log.info(
				`Webhook received at ${new Date().toISOString()} with trace ID: ${trace}`
			);

			const body = request.body as components["schemas"]["Transaction"];

			const transactionAmount = parseFloat(body.transactions[0].amount);
			const rounding = Math.ceil(transactionAmount) - transactionAmount;

			try {
				const roundingTx = await client.POST("/v1/transactions", {
					headers: {
						Authorization: `Bearer ${process.env.WEBHOOK_TOKEN}`,
						"X-Trace-ID": trace,
					},

					body: {
						error_if_duplicate_hash: false,
						apply_rules: false,
						fire_webhooks: false,
						group_title: `EverydayInvest transfer for "${body.transactions[0].description}"`,
						transactions: [
							{
								type: "withdrawal",
								date: body.transactions[0].date,
								amount: rounding.toFixed(2).toString(),
								description: "EverydayInvest rounding",
								order: 0,
								source_id: body.transactions[0].source_id,
								destination_id:
									process.env.FIREFLY_EI_ID || "0",
								reconciled: false,
								tags: ["everydayinvest", "auto"],
							},
						],
					},
				});

				if (roundingTx.error) throw new Error(roundingTx.error.message);
			} catch (error) {
				fastify.log.error(
					`Failed to process the rounding transaction: ${error}`
				);

				return reply.status(503).send({
					error:
						"Failed to process the rounding transaction. Error: " +
						error,
				});
			}

			return { ack: true };
		}
	);
};

export default webhook;
