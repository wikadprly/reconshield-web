"use client";

import { Activity, BarChart3, CheckCircle2, Cpu, Database, Search, Target } from "lucide-react";
import FeatureImportanceChart from "@/components/feature-importance-chart";
import { Badge, Card, CardHeader, DataStateNotice, MetricCard, MockNotice } from "@/components/ui";
import { formatPercent, formatTimestamp } from "@/lib/format";
import { labelSource } from "@/lib/labels";
import { useApiResult } from "@/lib/use-api-result";
import type { ModelMetrics } from "@/types/security";

export default function MlPerformanceView() {
  const { result, loading, error } = useApiResult<ModelMetrics>("/api/ml-metrics");
  const metrics = result?.data;
  const confusion = metrics?.confusionMatrix;
  const samples = confusion ? confusion.trueNormal + confusion.falseThreat + confusion.missedThreat + confusion.trueThreat : null;

  return <div className="page-stack">
    <MockNotice source={result?.source} />
    <DataStateNotice loading={loading} error={error} />
    <div className="research-banner"><div><Badge tone="purple">EVALUASI PENELITIAN</Badge><h2>{metrics?.modelName ?? "Classifier Random Forest"}</h2><p>Model klasifikasi biner untuk membedakan flow jaringan normal dari aktivitas reconnaissance.</p></div><div className="model-live"><span>Status model</span><Badge tone={result?.source === "mock" ? "warning" : "success"} dot>{labelSource(result?.source)} · {metrics?.version ?? "—"}</Badge></div></div>
    <div className="metrics-grid four">
      <MetricCard title="Akurasi" value={metrics ? formatPercent(metrics.accuracy) : "—"} detail="Prediksi benar secara keseluruhan" icon={<CheckCircle2 size={20} />} />
      <MetricCard title="Presisi" value={metrics ? formatPercent(metrics.precision) : "—"} detail="Kualitas prediksi positif" icon={<Target size={20} />} tone="purple" />
      <MetricCard title="Recall" value={metrics ? formatPercent(metrics.recall) : "—"} detail="Sensitivitas deteksi ancaman" icon={<Search size={20} />} tone="cyan" />
      <MetricCard title="Skor F1" value={metrics ? formatPercent(metrics.f1Score) : "—"} detail="Kinerja model yang seimbang" icon={<BarChart3 size={20} />} tone="green" />
    </div>
    <div className="ml-grid">
      <Card>
        <CardHeader title="Matriks Konfusi" subtitle="Hasil klasifikasi pada dataset evaluasi" />
        <div className="matrix-wrap"><div className="matrix-axis top">Kelas prediksi</div><div className="matrix-axis side">Kelas aktual</div><div className="matrix-labels top-label"><span>Normal</span><span>Reconnaissance</span></div><div className="matrix-labels side-label"><span>Normal</span><span>Reconnaissance</span></div><div className="matrix"><div className="matrix-cell strong"><b>{(confusion?.trueNormal ?? 0).toLocaleString("id-ID")}</b><span>Normal Benar</span><small>TN</small></div><div className="matrix-cell light"><b>{(confusion?.falseThreat ?? 0).toLocaleString("id-ID")}</b><span>Ancaman Palsu</span><small>FP</small></div><div className="matrix-cell light"><b>{(confusion?.missedThreat ?? 0).toLocaleString("id-ID")}</b><span>Ancaman Terlewat</span><small>FN</small></div><div className="matrix-cell strong purple"><b>{(confusion?.trueThreat ?? 0).toLocaleString("id-ID")}</b><span>Ancaman Benar</span><small>TP</small></div></div></div>
      </Card>
      <Card>
        <CardHeader title="Kepentingan Fitur" subtitle="Kontribusi relatif terhadap keputusan model" />
        {metrics && metrics.featureImportance.length > 0 ? <FeatureImportanceChart data={metrics.featureImportance} /> : <div className="empty-table">Sumber aktif tidak melaporkan kepentingan fitur.</div>}
        <div className="chart-footnote"><Activity size={15} /> Kepentingan Gini · nilai lebih tinggi menunjukkan pengaruh prediktif lebih kuat</div>
      </Card>
    </div>
    <Card>
      <CardHeader title="Konteks Evaluasi" subtitle="Metadata dataset dan eksperimen untuk auditabilitas penelitian" />
      <div className="metadata-grid">
        <div><span><Database size={17} />Dataset</span><b>{metrics?.dataset ?? "—"}</b><small>Dataset berlabel NetFlow/IPFIX</small></div>
        <div><span><Activity size={17} />Tanggal evaluasi</span><b>{metrics?.evaluatedAt ? formatTimestamp(metrics.evaluatedAt) : "—"}</b><small>Evaluasi terakhir yang tercatat</small></div>
        <div><span><BarChart3 size={17} />Jumlah sampel</span><b>{samples !== null ? `${samples.toLocaleString("id-ID")} flow` : "—"}</b><small>Jumlah hasil matriks konfusi</small></div>
        <div><span><Cpu size={17} />Konfigurasi model</span><b>100 estimator</b><small>max_depth=12 · random_state=42</small></div>
      </div>
    </Card>
  </div>;
}
