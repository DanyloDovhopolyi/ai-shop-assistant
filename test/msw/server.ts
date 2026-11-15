import { setupServer } from "msw/node";

// No default handlers: each test declares the network it expects via server.use().
export const server = setupServer();
