import {
  createTRPCClient,
  createWSClient,
  httpLink,
  splitLink,
  wsLink,
} from "@trpc/client";
import { WebSocket } from "ws";
import type { AppRouter } from "./server";

globalThis.WebSocket = WebSocket as any;

const wsClient = createWSClient({
  url: `ws://localhost:2022`,
  onOpen() {
    console.log("ws connected");
  },
  onClose() {
    console.log("ws disconnected");
  },
});

console.log("init trpc client");
const trpc = createTRPCClient<AppRouter>({
  links: [
    // call subscriptions through websockets and the rest over http
    splitLink({
      condition(op) {
        return op.type === "subscription";
      },
      true: wsLink({
        client: wsClient,
      }),
      false: httpLink({
        url: `http://localhost:2022`,
      }),
    }),
  ],
});
console.log("init trpc client done");

async function main() {
  console.log("start");
  const helloResponse = await trpc.greeting.hello.query({
    name: "world",
  });

  console.log("helloResponse", helloResponse);

  const createPostRes = await trpc.post.createPost.mutate({
    title: "hello world",
    text: "check out https://tRPC.io",
  });
  console.log("createPostResponse", createPostRes);

  let count = 0;
  await new Promise<void>((resolve) => {
    const subscription = trpc.post.randomNumber.subscribe(undefined, {
      onData(data) {
        // ^ note that `data` here is inferred
        console.log("received", data);
        count++;
        if (count > 3) {
          // stop after 3 pulls
          subscription.unsubscribe();
          resolve();
        }
      },
      onStarted() {
        console.log("subscription started");
      },
      onComplete() {
        console.log("subscription completed");
      },
      onStopped() {
        console.log("subscription stopped");
      },
      onError(err) {
        console.error("error", err);
      },
    });
  });
  console.log("done");
  wsClient.close();
}

void main();
