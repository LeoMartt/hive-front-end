import { z } from "zod";
import { httpClient } from "../client";
import { sharedRead } from "../sharedRead";

const currentUserSchema = z.object({
  id: z.string(),
  nome: z.string(),
  email: z.string(),
  iniciais: z.string().nullable().optional(),
  entra_object_id: z.string().nullable().optional(),
});

export type CurrentUserApi = z.infer<typeof currentUserSchema>;

export const accountsApi = {
  async me(): Promise<CurrentUserApi> {
    return sharedRead("accounts:me", async () => {
      const { data } = await httpClient.get("/accounts/me/");
      return currentUserSchema.parse(data);
    });
  },
};
