import { useState } from "react";
import { Save } from "lucide-react";
import { useDemoStore } from "../store/useDemoStore";
import { Caso, DamageAnalysis, Documento } from "../types/domain";
import { documentChecklist, isChecklistItemComplete, suggestDamageMerit } from "../lib/business";
import { Field, ReadonlyBanner } from "./appShared";

export function AnalysisTab({ caso, docs, canWrite }: { caso: Caso; docs: Documento[]; canWrite: boolean }) {
  const { saveAnalysis, usuario } = useDemoStore();
  const thermographItem = documentChecklist(caso, docs).find((item) => item.type === "Registros de termógrafos");
  const hasThermograph = Boolean(thermographItem && isChecklistItemComplete(thermographItem));
  const applies = caso.causaDano?.toLowerCase().includes("temperatura") === true && hasThermograph;
  const extractedThermalData = docs
    .filter((documento) => documento.tipoDocumento === "Registros de termógrafos")
    .map((documento) => documento.datosExtraidos)
    .find((data) => data?.temperaturaRegistrada !== undefined || data?.rangoMinimo !== undefined || data?.rangoMaximo !== undefined);
  const registeredDefault = caso.analisisCausa?.temperaturaRegistrada ?? caso.temperaturaRegistrada ?? extractedThermalData?.temperaturaRegistrada;
  const minDefault = caso.analisisCausa?.rangoMinimo ?? caso.rangoMinimo ?? extractedThermalData?.rangoMinimo;
  const maxDefault = caso.analisisCausa?.rangoMaximo ?? caso.rangoMaximo ?? extractedThermalData?.rangoMaximo;
  const [registered, setRegistered] = useState(registeredDefault?.toString() || "");
  const [min, setMin] = useState(minDefault?.toString() || "");
  const [max, setMax] = useState(maxDefault?.toString() || "");
  const [saveError, setSaveError] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const suggestion = applies && registered && min && max ? suggestDamageMerit(Number(registered), Number(min), Number(max)) : undefined;
  const suggestedText = suggestion
    ? `Los registros muestran ${registered} °C frente al rango indicado en el BL de ${min} °C a ${max} °C. La diferencia estimada es de ${Math.abs(suggestion.deviation).toFixed(1)} °C y el mérito preliminar sugerido es ${suggestion.meritoSugerido}. Confirma o modifica esta conclusión antes de guardar.`
    : "";
  const [conclusion, setConclusion] = useState(caso.analisisCausa?.conclusionFinal || suggestedText || caso.causaPotencial || "");
  const save = () => {
    setSaveError("");
    setSaveNotice("");
    if (conclusion.trim().length < 10) {
      setSaveError("La conclusión debe tener al menos 10 caracteres.");
      return;
    }
    const enteredTemperatureValues = [registered, min, max].filter((value) => value.trim() !== "");
    if (applies && enteredTemperatureValues.length > 0 && enteredTemperatureValues.length < 3) {
      setSaveError("Completa temperatura registrada, rango mínimo y rango máximo para calcular la sugerencia térmica.");
      return;
    }
    if (applies && enteredTemperatureValues.length === 3) {
      const values = [registered, min, max].map(Number);
      if (values.some((value) => !Number.isFinite(value))) {
        setSaveError("Los valores de temperatura deben ser numéricos.");
        return;
      }
      if (values[1] > values[2]) {
        setSaveError("El rango mínimo no puede ser mayor que el rango máximo.");
        return;
      }
    }
    const analysis: DamageAnalysis = {
      temperaturaRegistrada: registered ? Number(registered) : undefined,
      rangoMinimo: min ? Number(min) : undefined,
      rangoMaximo: max ? Number(max) : undefined,
      desviacion: suggestion?.deviation,
      meritoSugerido: suggestion?.meritoSugerido,
      conclusionFinal: conclusion.trim(),
      confirmadoPor: usuario.nombre,
      confirmadoAt: new Date().toISOString()
    };
    saveAnalysis(caso.id, analysis);
    setSaveNotice("Análisis confirmado y registrado en la bitácora del caso.");
  };
  return (
    <section className="panel">
      <div className="panel-title">
        <h3>Análisis de causa de daño</h3>
        <span>Confirmación humana obligatoria</span>
      </div>
      {!canWrite && <ReadonlyBanner />}
      {saveError && <div className="form-error mb-4" role="alert">{saveError}</div>}
      {saveNotice && <div className="notice mb-4" role="status">{saveNotice}</div>}
      {applies ? (
        <>
          {(registered || min || max) && (
            <div className="notice mb-4" role="status">
              Valores precargados desde los documentos del expediente. Revísalos y ajústalos si corresponde antes de confirmar.
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Temperatura registrada">
              <input className="input" disabled={!canWrite} type="number" value={registered} onChange={(event) => setRegistered(event.target.value)} />
            </Field>
            <Field label="Rango mínimo BL">
              <input className="input" disabled={!canWrite} type="number" value={min} onChange={(event) => setMin(event.target.value)} />
            </Field>
            <Field label="Rango máximo BL">
              <input className="input" disabled={!canWrite} type="number" value={max} onChange={(event) => setMax(event.target.value)} />
            </Field>
          </div>
        </>
      ) : (
        <div className="rounded-md border border-line bg-slate-50 p-4 text-sm text-slate-700">
          No hay sugerencia asistida: solo se activa cuando la causa es "Temperatura" y existe un documento de registros de termógrafos.
        </div>
      )}
      {suggestedText && (
        <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-4">
          <p className="font-semibold text-blue-900">{suggestedText}</p>
          {canWrite && (
            <button className="button-secondary small mt-3" type="button" onClick={() => setConclusion(suggestedText)}>
              Usar como base editable
            </button>
          )}
        </div>
      )}
      <Field label="Conclusión final del handler">
        <textarea className="input min-h-36" disabled={!canWrite} value={conclusion} onChange={(event) => setConclusion(event.target.value)} placeholder="El handler debe confirmar o escribir la conclusión final." />
      </Field>
      {canWrite && (
        <button className="button-primary mt-4" type="button" disabled={conclusion.trim().length < 10} onClick={save}>
          <Save size={17} /> Confirmar análisis
        </button>
      )}
    </section>
  );
}
