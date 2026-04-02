"use client"

import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  BarChart3,
  Database,
  TrendingUp,
  Activity,
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from "recharts"

const assayMetrics = [
  { assay: "NR.AhR", rocAuc: 0.9103, positiveRate: 0.1197, accuracy: 0.9066 },
  { assay: "NR.AR", rocAuc: 0.7751, positiveRate: 0.0205, accuracy: 0.9778 },
  { assay: "NR.AR.LBD", rocAuc: 0.7876, positiveRate: 0.0137, accuracy: 0.9811 },
  { assay: "NR.Aromatase", rocAuc: 0.8144, positiveRate: 0.0739, accuracy: 0.9299 },
  { assay: "NR.ER", rocAuc: 0.8002, positiveRate: 0.0988, accuracy: 0.9109 },
  { assay: "NR.ER.LBD", rocAuc: 0.7579, positiveRate: 0.0333, accuracy: 0.9683 },
  { assay: "NR.PPAR.gamma", rocAuc: 0.7688, positiveRate: 0.0512, accuracy: 0.9471 },
  { assay: "SR.ARE", rocAuc: 0.7798, positiveRate: 0.1676, accuracy: 0.8396 },
  { assay: "SR.ATAD5", rocAuc: 0.808, positiveRate: 0.0611, accuracy: 0.9421 },
  { assay: "SR.HSE", rocAuc: 0.8179, positiveRate: 0.0361, accuracy: 0.959 },
  { assay: "SR.MMP", rocAuc: 0.9291, positiveRate: 0.1105, accuracy: 0.9098 },
  { assay: "SR.p53", rocAuc: 0.8338, positiveRate: 0.0666, accuracy: 0.9253 },
]

const topRocAuc = [...assayMetrics]
  .sort((left, right) => right.rocAuc - left.rocAuc)
  .slice(0, 6)

const stats = {
  assayCount: 12,
  processedFeatures: 1644,
  testCompounds: 647,
  meanRocAuc: 0.8153,
}

export default function ResultsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-12">
          <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
                <BarChart3 className="h-8 w-8 text-primary" />
                Evaluation Dashboard
              </h1>
              <p className="mt-2 text-muted-foreground">
                Verified summary metrics from the current Tox21 preprocessing and training run.
              </p>
            </div>
          </div>

          <div className="mb-8 grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Assays Modeled</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  <span className="text-3xl font-bold">{stats.assayCount}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Processed Features</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  <span className="text-3xl font-bold">{stats.processedFeatures}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Held-out Test Compounds</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  <span className="text-3xl font-bold">{stats.testCompounds}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Mean ROC AUC</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <span className="text-3xl font-bold">{(stats.meanRocAuc * 100).toFixed(1)}%</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mb-8 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Best ROC AUC Endpoints</CardTitle>
                <CardDescription>Top held-out assay results from the trained model bundle</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topRocAuc}>
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
                      <Bar dataKey="rocAuc" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Observed Positive Rates</CardTitle>
                <CardDescription>Held-out activity prevalence by assay in the test split</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={assayMetrics}>
                      <defs>
                        <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="assay" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 0.2]} tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(value: number) => [`${(value * 100).toFixed(2)}%`, "Positive rate"]}
                        contentStyle={{
                          backgroundColor: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius)",
                        }}
                      />
                      <Area type="monotone" dataKey="positiveRate" stroke="var(--chart-2)" fill="url(#activityGradient)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Per-Assay Metrics</CardTitle>
              <CardDescription>
                Snapshot of held-out accuracy, positive rate, and ROC AUC from `models/training_metrics.csv`
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assay</TableHead>
                    <TableHead>ROC AUC</TableHead>
                    <TableHead>Positive Rate</TableHead>
                    <TableHead className="text-right">Accuracy</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assayMetrics.map((item) => (
                    <TableRow key={item.assay}>
                      <TableCell className="font-mono text-sm">{item.assay}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{(item.rocAuc * 100).toFixed(1)}%</Badge>
                      </TableCell>
                      <TableCell>{(item.positiveRate * 100).toFixed(1)}%</TableCell>
                      <TableCell className="text-right font-mono">
                        {(item.accuracy * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}
