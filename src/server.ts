import { logger } from "@bogeychan/elysia-logger";
import { trpc } from "@elysiajs/trpc";
import { initTRPC } from "@trpc/server";
import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { observable } from "@trpc/server/observable";
import Elysia from "elysia";
import { z } from "zod";

// This is how you initialize a context for the server
function createContext(opts: FetchCreateContextFnOptions) {
  return {};
}
type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();

const publicProcedure = t.procedure;
const router = t.router;

const greetingRouter = router({
  hello: publicProcedure
    .input(
      z.object({
        name: z.string(),
      })
    )
    .query(({ input }) => `Hello, ${input.name}!`),
});

const postRouter = router({
  createPost: publicProcedure
    .input(
      z.object({
        title: z.string(),
        text: z.string(),
      })
    )
    .mutation(({ input }) => {
      // imagine db call here
      return {
        id: `${Math.random()}`,
        ...input,
      };
    }),
  randomNumber: publicProcedure.subscription(() => {
    return observable<{ randomNumber: number }>((emit) => {
      const timer = setInterval(() => {
        // emits a number every second
        emit.next({ randomNumber: Math.random() });
      }, 200);

      return () => {
        clearInterval(timer);
      };
    });
  }),
});

// Merge routers together
const appRouter = router({
  greeting: greetingRouter,
  post: postRouter,
});

export type AppRouter = typeof appRouter;

export const app = new Elysia()
  .use(logger())
  .use(
    trpc(appRouter, {
      endpoint: "/",
      createContext: createContext,
      onError: (err) => {
        console.log(err);
      },
    })
  )
  .listen(2022);
