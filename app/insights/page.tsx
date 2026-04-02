"use client"

import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Lightbulb,
  BarChart3,
  TreeDeciduous,
  Target,
  TrendingUp,
  Info,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"

const featureImportance = [
  { feature: "Chi7", importance: 0.004747 },
  { feature: "bcutm1", importance: 0.004386 },
  { feature: "LogP", importance: 0.004264 },
  { feature: "Chi9", importance: 0.003757 },
  { feature: "bcutm2", importance: 0.003687 },
  { feature: "Chiv8", importance: 0.003646 },
  { feature: "bcutp2", importance: 0.003573 },
  { feature: "Chi8", importance: 0.003549 },
]

const performanceMetrics = [
  { metric: "Mean Accuracy", value: 0.9331 },
  { metric: "Mean Balanced Acc.", value: 0.5855 },
  { metric: "Mean Precision", value: 0.4719 },
  { metric: "Mean Recall", value: 0.1853 },
  { metric: "Mean F1", value: 0.2529 },
  { metric: "Mean ROC AUC", value: 0.8153 },
]

const assayDistribution = [
  { name: "Higher Activity", value: 5, color: "var(--destructive)" },
  { name: "Lower Activity", value: 7, color: "var(--success)" },
]

const rocAucByAssay = [
  { assay: "SR.MMP", rocAuc: 0.9291 },
  { assay: "NR.AhR", rocAuc: 0.9103 },
  { assay: "SR.p53", rocAuc: 0.8338 },
  { assay: "SR.HSE", rocAuc: 0.8179 },
  { assay: "NR.Aromatase", rocAuc: 0.8144 },
]

const descriptorGroups = [
  {
    name: "Dense descriptors",
    description: "801 continuous cheminformatics descriptors such as LogP, Chi indices, BCUT metrics, and topology-derived features.",
  },
  {
    name: "Sparse fingerprints",
    description: "843 retained binary fingerprint bits selected from the sparse Tox21 matrix using a 5% training-set prevalence cutoff.",
  },
  {
    name: "Assay labels",
    description: "12 Tox21 endpoints covering nuclear receptor and stress response assays with missing labels preserved per compound.",
  },
  {
    name: "Metadata lookup",
    description: "Compound IDs, split membership, fold information, and lookup metadata from tox21_compoundData.csv.",
  },
]

export default function InsightsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-12">
          <div className="mb-10 text-center">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Lightbulb className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Model Insights</h1>
            <p className="mx-auto mt-2 max-w-2xl text-muted-foreground">
              Training and feature-importance highlights from the verified Tox21 multi-assay pipeline.
            </p>
          </div>

          <div className="mb-10 grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Model Type</CardDescription>
                <CardTitle className="flex items-center gap-2">
                  <TreeDeciduous className="h-5 w-5 text-primary" />
                  Per-Assay Forests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Twelve Random Forest classifiers trained independently over 1,644 processed Tox21 features.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Verified Mean ROC AUC</CardDescription>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  81.5%
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Based on the current trained bundle saved in `models/random_forest.pkl`.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Feature Space</CardDescription>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  1,644 Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  801 dense descriptors plus 843 retained sparse fingerprint bits.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mb-10 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Global Feature Importance
                </CardTitle>
                <CardDescription>
                  Top features averaged across all 12 assay-specific models
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={featureImportance}
                      layout="vertical"
                      margin={{ top: 10, right: 30, left: 80, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
                      <XAxis type="number" domain={[0, 0.005]} />
                      <YAxis type="category" dataKey="feature" width={70} tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(value: number) => [value.toFixed(6), "Importance"]}
                        contentStyle={{
                          backgroundColor: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius)",
                        }}
                      />
                      <Bar dataKey="importance" fill="var(--primary)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Endpoint Activity Mix</CardTitle>
                <CardDescription>
                  A simple view of endpoints with relatively higher versus lower positive rates in the held-out test split
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={assayDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={110}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {assayDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [value, "Endpoints"]}
                        contentStyle={{
                          backgroundColor: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius)",
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mb-10 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Average Model Metrics</CardTitle>
                <CardDescription>
                  Mean performance across all assay-specific evaluation runs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {performanceMetrics.map((metric) => (
                    <div key={metric.metric} className="flex items-center justify-between gap-4">
                      <span className="font-medium">{metric.metric}</span>
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${metric.value * 100}%` }}
                          />
                        </div>
                        <Badge variant="secondary" className="w-20 justify-center font-mono">
                          {(metric.value * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Best Test ROC AUC Assays</CardTitle>
                <CardDescription>
                  Strongest held-out endpoint results from the current trained model bundle
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rocAucByAssay} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="assay" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0.7, 1]} tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(value: number) => [`${(value * 100).toFixed(2)}%`, "ROC AUC"]}
                        contentStyle={{
                          backgroundColor: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius)",
                        }}
                      />
                      <Bar dataKey="rocAuc" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Cross-validation mean ROC AUC:</span>
                  <Badge variant="outline" className="font-mono">
                    86.3%
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Feature Space Notes
              </CardTitle>
              <CardDescription>
                What the updated pipeline is actually modeling after the dataset migration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {descriptorGroups.map((group) => (
                  <div key={group.name} className="rounded-lg border p-4">
                    <h4 className="text-sm font-semibold">{group.name}</h4>
                    <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}
