import z from "zod";
import { publicProcedure, router } from "../trpc";
import { shell } from "electron";

export const systemRouter = router({
   openExternalLink: publicProcedure.input(z.string()).mutation(async ({ input: url }) => {
      await shell.openExternal(url);
   })
})