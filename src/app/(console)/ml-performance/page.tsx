import type { Metadata } from "next";
import { Activity, BarChart3, CheckCircle2, Cpu, Database, Search, Target } from "lucide-react";
import FeatureImportanceChart from "@/components/feature-importance-chart";
import { Badge, Card, CardHeader, MetricCard, MockNotice } from "@/components/ui";

export const metadata: Metadata = { title: "ML Performance" };

export default function MlPerformancePage() {
  return <div className="page-stack">
    <MockNotice />
    <div className="research-banner"><div><Badge tone="purple">RESEARCH EVALUATION</Badge><h2>Random Forest Classifier</h2><p>Binary classification model for distinguishing normal network flows from reconnaissance activity.</p></div><div className="model-live"><span>Model status</span><Badge tone="success" dot>Mock online · v1.4.2</Badge></div></div>
    <div className="metrics-grid four"><MetricCard title="Accuracy" value="97.84%" detail="Overall correct predictions" icon={<CheckCircle2 size={20} />} /><MetricCard title="Precision" value="96.72%" detail="Positive prediction quality" icon={<Target size={20} />} tone="purple" /><MetricCard title="Recall" value="95.91%" detail="Threat detection sensitivity" icon={<Search size={20} />} tone="cyan" /><MetricCard title="F1-Score" value="96.31%" detail="Balanced model performance" icon={<BarChart3 size={20} />} tone="green" /></div>
    <div className="ml-grid"><Card><CardHeader title="Confusion Matrix" subtitle="Classification outcomes on the evaluation dataset" /><div className="matrix-wrap"><div className="matrix-axis top">Predicted class</div><div className="matrix-axis side">Actual class</div><div className="matrix-labels top-label"><span>Normal</span><span>Reconnaissance</span></div><div className="matrix-labels side-label"><span>Normal</span><span>Reconnaissance</span></div><div className="matrix"><div className="matrix-cell strong"><b>9,541</b><span>True Normal</span><small>TN</small></div><div className="matrix-cell light"><b>117</b><span>False Threat</span><small>FP</small></div><div className="matrix-cell light"><b>48</b><span>Missed Threat</span><small>FN</small></div><div className="matrix-cell strong purple"><b>1,125</b><span>True Threat</span><small>TP</small></div></div></div></Card><Card><CardHeader title="Feature Importance" subtitle="Relative contribution to model decisions" /><FeatureImportanceChart /><div className="chart-footnote"><Activity size={15} /> Gini importance · higher values indicate stronger predictive influence</div></Card></div>
    <Card><CardHeader title="Evaluation Context" subtitle="Dataset and experiment metadata for research auditability" /><div className="metadata-grid"><div><span><Database size={17} />Dataset</span><b>ReconFlow-2026 v2</b><small>NetFlow/IPFIX labeled dataset</small></div><div><span><Activity size={17} />Evaluation period</span><b>01 Feb – 28 Feb 2026</b><small>28-day validation window</small></div><div><span><BarChart3 size={17} />Number of samples</span><b>10,831 flows</b><small>80/20 stratified test split</small></div><div><span><Cpu size={17} />Model configuration</span><b>100 estimators</b><small>max_depth=12 · random_state=42</small></div></div></Card>
  </div>;
}
