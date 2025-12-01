import { FastifyPluginAsync } from "fastify";

const healthcheck: FastifyPluginAsync = async (
	fastify,
	opts
): Promise<void> => {
	fastify.get(
		"/health",
		{
			schema: {
				response: {
					200: {
						type: "string",
					},
				},
			},
		},
		async function () {
			return "I'm still standing!";
		}
	);
};

export default healthcheck;
