import { FastifyPluginAsync } from "fastify";

const webhook: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get("/hook", async function (request, reply) {
    return "I'm still standing!";
  });
};

export default webhook;
