import { DemoState } from "./storeTypes";

type CaseAccessState = Pick<DemoState, "usuario" | "casos">;

export function hasCaseWriteAccess(state: CaseAccessState, casoId: string) {
  const caso = state.casos.find((item) => item.id === casoId);
  return Boolean(caso && state.usuario.role === "Handler" && caso.claimHandler === state.usuario.nombre);
}

export function canManageMaintainers(state: Pick<DemoState, "usuario">) {
  return state.usuario.role === "Gerente";
}
