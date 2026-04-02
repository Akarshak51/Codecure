import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Database,
  FileText,
  GitBranch,
  Layers,
  CheckCircle2,
  Code,
  Beaker,
  BookOpen,
} from "lucide-react"

const datasetInfo = {
  name: "Tox21 Challenge Dataset",
  trainSamples: 12060,
  testSamples: 647,
  totalSamples: 12707,
  assays: 12,
  denseFeatures: 801,
  sparseFeatures: 843,
  totalFeatures: 1644,
  source: "Official Tox21 bundle provided in data/raw/tox21",
}

const preprocessingSteps = [
  "Load the official Tox21 train and test splits instead of generating synthetic data.",
  "Median-impute the 801 dense molecular descriptors using only the training split.",
  "Filter sparse fingerprint columns to bits present in more than 5% of training compounds.",
  "Concatenate dense descriptors with 843 retained sparse fingerprint features.",
  "Preserve assay-wise missing labels as NaN so each endpoint model trains on valid rows only.",
]

const modelDetails = [
  { param: "Training strategy", value: "12 independent Random Forest classifiers" },
  { param: "Trees per assay", value: "100" },
  { param: "Max depth", value: "18" },
  { param: "Class weighting", value: "balanced_subsample" },
  { param: "Cross-validation", value: "Up to 3 stratified folds per assay" },
  { param: "Mean ROC AUC", value: "0.8153" },
]

const dependencies = [
  { name: "scikit-learn", version: "1.8.x", purpose: "Per-assay Random Forest models" },
  { name: "pandas", version: "2.3.x", purpose: "Dataset loading and tabular joins" },
  { name: "numpy", version: "1.26.x", purpose: "Array processing" },
  { name: "scipy", version: "1.16.x", purpose: "Sparse matrix loading" },
  { name: "matplotlib", version: "3.10.x", purpose: "Training and importance plots" },
  { name: "FastAPI", version: "0.116.x", purpose: "Prediction API" },
]

const dataComponents = [
  {
    name: "Dense descriptors",
    value: "801 columns",
    description: "Physicochemical and cheminformatics descriptors from tox21_dense_train/test.csv.gz.",
  },
  {
    name: "Sparse fingerprints",
    value: "843 retained bits",
    description: "Sparse ECFP-style fingerprints filtered by training-set prevalence greater than 5%.",
  },
  {
    name: "Assay labels",
    value: "12 endpoints",
    description: "Nuclear receptor and stress response assays with missing labels preserved where unavailable.",
  },
  {
    name: "Compound metadata",
    value: "compoundData.csv",
    description: "Compound IDs, split membership, fold metadata, and known assay annotations for lookup and display.",
  },
]

export default function MethodologyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-12">
          <div className="mb-10 text-center">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Database className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Dataset & Methodology</h1>
            <p className="mx-auto mt-2 max-w-2xl text-muted-foreground">
              Technical documentation for the Tox21 data bundle, preprocessing pipeline, and assay-wise model training workflow.
            </p>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Dataset Overview
              </CardTitle>
              <CardDescription>What changed after replacing the old toy dataset with the full Tox21 bundle</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <h4 className="mb-1 font-semibold">Dataset Name</h4>
                    <p className="text-muted-foreground">{datasetInfo.name}</p>
                  </div>
                  <div>
                    <h4 className="mb-1 font-semibold">Data Source</h4>
                    <p className="text-muted-foreground">{datasetInfo.source}</p>
                  </div>
                  <div>
                    <h4 className="mb-1 font-semibold">Representation</h4>
                    <p className="text-muted-foreground">
                      {datasetInfo.denseFeatures} dense descriptors + {datasetInfo.sparseFeatures} retained sparse fingerprint bits.
                    </p>
                  </div>
                  <div>
                    <h4 className="mb-1 font-semibold">License</h4>
                    <Badge variant="outline">Research / Open Data Workflow</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border p-4 text-center">
                    <div className="text-3xl font-bold text-primary">{datasetInfo.totalSamples}</div>
                    <div className="text-sm text-muted-foreground">Total Compounds</div>
                  </div>
                  <div className="rounded-lg border p-4 text-center">
                    <div className="text-3xl font-bold text-primary">{datasetInfo.assays}</div>
                    <div className="text-sm text-muted-foreground">Assays</div>
                  </div>
                  <div className="rounded-lg border p-4 text-center">
                    <div className="text-3xl font-bold text-primary">{datasetInfo.trainSamples}</div>
                    <div className="text-sm text-muted-foreground">Train Split</div>
                  </div>
                  <div className="rounded-lg border p-4 text-center">
                    <div className="text-3xl font-bold text-primary">{datasetInfo.totalFeatures}</div>
                    <div className="text-sm text-muted-foreground">Model Features</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="mb-8 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Preprocessing Pipeline
                </CardTitle>
                <CardDescription>The new data preparation flow driven directly by the provided files</CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {preprocessingSteps.map((step, index) => (
                    <li key={step} className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {index + 1}
                      </span>
                      <span className="pt-0.5 text-sm leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Beaker className="h-5 w-5" />
                  Model Configuration
                </CardTitle>
                <CardDescription>How the updated training script fits the Tox21 endpoints</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {modelDetails.map((detail) => (
                    <div key={detail.param} className="flex items-center justify-between gap-4">
                      <span className="text-sm text-muted-foreground">{detail.param}</span>
                      <Badge variant="secondary" className="text-right font-mono whitespace-normal">
                        {detail.value}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Data Components
              </CardTitle>
              <CardDescription>What each file family contributes to the pipeline</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {dataComponents.map((component) => (
                  <div key={component.name} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="font-semibold">{component.name}</h4>
                      <Badge variant="outline">{component.value}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{component.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Technical Stack
              </CardTitle>
              <CardDescription>All required tooling remains free and open-source</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {dependencies.map((dependency) => (
                  <div key={dependency.name} className="flex items-center gap-3 rounded-lg border p-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{dependency.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {dependency.version}
                        </Badge>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{dependency.purpose}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Repository Structure
              </CardTitle>
              <CardDescription>The key files after the Tox21 migration</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm font-mono">{`codecure-toxicity-prediction/
|-- app/
|   |-- predict/page.tsx
|   |-- methodology/page.tsx
|-- backend/
|   |-- api_app.py
|   |-- main.py
|   |-- model.py
|-- data/
|   |-- raw/tox21/
|   |-- processed/tox21/
|   |-- sample_template.csv
|-- models/
|   |-- random_forest.pkl
|   |-- training_metrics.csv
|-- reports/
|-- scripts/
|   |-- preprocess.py
|   |-- train.py
|   |-- predict.py
|   |-- feature_importance.py
|-- README.md`}</pre>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  )
}
