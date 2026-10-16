"use client";

import { Activity, BarChart3, CheckCircle2, Cpu, Database, Search, Target } from "lucide-react";
import FeatureImportanceChart from "@/components/feature-importance-chart";
import { Badge, Card, CardHeader, DataStateNotice, MetricCard, MockNotice } from "@/components/ui";
import { formatPercent, formatTimestamp } from "@/lib/format";
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
    <div className="research-banner"><div><Badge tone="purple">RESEARCH EVALUATION</Badge><h2>{metrics?.modelName ?? "Random Forest Classifier"}</h2><p>Binary classification model for distinguishing normal network flows from reconnaissance activity.</p></div><div className="model-live"><span>Model status</span><Badge tone={result?.source === "mock" ? "warning" : "success"} dot>{result?.source ?? "unavailable"} · {metrics?.version ?? "—"}</Badge></div></div>
    <div className="metrics-grid four">
      <MetricCard title="Accuracy" value={metrics ? formatPercent(metrics.accuracy) : "—"} detail="Overall correct predictions" icon={<CheckCircle2 size={20} />} />
      <MetricCard title="Precision" value={metrics ? formatPercent(metrics.precision) : "—"} detail="Positive prediction quality" icon={<Target size={20} />} tone="purple" />
      <MetricCard title="Recall" value={metrics ? formatPercent(metrics.recall) : "—"} detail="Threat detection sensitivity" icon={<Search size={20} />} tone="cyan" />
      <MetricCard title="F1-Score" value={metrics ? formatPercent(metrics.f1Score) : "—"} detail="Balanced model performance" icon={<BarChart3 size={20} />} tone="green" />
    </div>
    <div className="ml-grid">
      <Card>
        <CardHeader title="Confusion Matrix" subtitle="Classification outcomes on the evaluation dataset" />
        <div className="matrix-wrap"><div className="matrix-axis top">Predicted class</div><div className="matrix-axis side">Actual class</div><div className="matrix-labels top-label"><span>Normal</span><span>Reconnaissance</span></div><div className="matrix-labels side-label"><span>Normal</span><span>Reconnaissance</span></div><div className="matrix"><div className="matrix-cell strong"><b>{(confusion?.trueNormal ?? 0).toLocaleString("en-US")}</b><span>True Normal</span><small>TN</small></div><div className="matrix-cell light"><b>{(confusion?.falseThreat ?? 0).toLocaleString("en-US")}</b><span>False Threat</span><small>FP</small></div><div className="matrix-cell light"><b>{(confusion?.missedThreat ?? 0).toLocaleString("en-US")}</b><span>Missed Threat</span><small>FN</small></div><div className="matrix-cell strong purple"><b>{(confusion?.trueThreat ?? 0).toLocaleString("en-US")}</b><span>True Threat</span><small>TP</small></div></div></div>
      </Card>
      <Card>
        <CardHeader title="Feature Importance" subtitle="Relative contribution to model decisions" />
        {metrics && metrics.featureImportance.length > 0 ? <FeatureImportanceChart data={metrics.featureImportance} /> : <div className="empty-table">No feature importance reported by the active source.</div>}
        <div className="chart-footnote"><Activity size={15} /> Gini importance · higher values indicate stronger predictive influence</div>
      </Card>
    </div>
    <Card>
      <CardHeader title="Evaluation Context" subtitle="Dataset and experiment metadata for research auditability" />
      <div className="metadata-grid">
        <div><span><Database size={17} />Dataset</span><b>{metrics?.dataset ?? "—"}</b><small>NetFlow/IPFIX labeled dataset</small></div>
        <div><span><Activity size={17} />Evaluation date</span><b>{metrics?.evaluatedAt ? formatTimestamp(metrics.evaluatedAt) : "—"}</b><small>Latest recorded evaluation</small></div>
        <div><span><BarChart3 size={17} />Number of samples</span><b>{samples !== null ? `${samples.toLocaleString("en-US")} flows` : "—"}</b><small>Sum of confusion-matrix outcomes</small></div>
        <div><span><Cpu size={17} />Model configuration</span><b>100 estimators</b><small>max_depth=12 · random_state=42</small></div>
      </div>
    </Card>
  </div>;
}
