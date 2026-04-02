"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  FlaskConical,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  RotateCcw,
  Download,
  Database,
} from "lucide-react"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"
const sampleCompoundIds = [
  "NCGC00261900-01",
  "NCGC00260869-01",
  "NCGC00261776-01",
]

type ApiAssayPrediction = {
  assay: string
  predicted_active: boolean
  probability_active: number
  probability_inactive: number
  known_label: number | null
}

type ApiPredictionResponse = {
  compound_id: string | null
  split: string | null
  summary: {
    predicted_active_count: number
    predicted_inactive_count: number
    highest_risk_assay: string | null
    mean_active_probability: number
  }
  predictions: ApiAssayPrediction[]
  metadata: Record<string, string | number | null | undefined>
}

type ApiBatchResponse = {
  predictions: ApiPredictionResponse[]
  total_compounds: number
  resolved_compounds: number
  unresolved_compounds: string[]
}

function parseCompoundCsv(content: string): { compoundIds: string[]; split: "auto" | "train" | "test" } {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) {
    throw new Error("The CSV file must contain a header row and at least one compound ID.")
  }

  const headers = lines[0].split(",").map((header) => header.trim().toLowerCase())
  const compoundIndex = headers.indexOf("compound_id")
  const splitIndex = headers.indexOf("split")

  if (compoundIndex === -1) {
    throw new Error("The CSV file must include a 'compound_id' column.")
  }

  const compoundIds: string[] = []
  let inferredSplit: "auto" | "train" | "test" = "auto"

  for (const line of lines.slice(1)) {
    const values = line.split(",").map((value) => value.trim())
    const compoundId = values[compoundIndex]
    if (!compoundId) {
      continue
    }
    compoundIds.push(compoundId)

    if (splitIndex !== -1) {
      const rowSplit = values[splitIndex]?.toLowerCase()
      if (rowSplit === "train" || rowSplit === "test") {
        inferredSplit = rowSplit
      }
    }
  }

  if (compoundIds.length === 0) {
    throw new Error("No compound IDs were found in the uploaded CSV.")
  }

  return { compoundIds, split: inferredSplit }
}

export default function PredictPage() {
  const [compoundId, setCompoundId] = useState("")
  const [split, setSplit] = useState<"auto" | "train" | "test">("test")
  const [isLoading, setIsLoading] = useState(false)
  const [isBatchLoading, setIsBatchLoading] = useState(false)
  const [result, setResult] = useState<ApiPredictionResponse | null>(null)
  const [batchResult, setBatchResult] = useState<ApiBatchResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [batchError, setBatchError] = useState<string | null>(null)
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    setError(null)
    setResult(null)
    setBatchResult(null)

    if (!compoundId.trim()) {
      setError("Enter a Tox21 compound ID before running a prediction.")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          compound_id: compoundId.trim(),
          split,
          top_assays: 6,
        }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { detail?: string } | null
        throw new Error(payload?.detail ?? "Prediction request failed.")
      }

      const payload = (await response.json()) as ApiPredictionResponse
      setResult(payload)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to connect to the prediction API."
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setSelectedFileName(file.name)
    setIsBatchLoading(true)
    setBatchError(null)
    setBatchResult(null)
    setResult(null)

    try {
      const text = await file.text()
      const { compoundIds, split: fileSplit } = parseCompoundCsv(text)
      const response = await fetch(`${API_BASE_URL}/predict/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          compound_ids: compoundIds,
          split: fileSplit === "auto" ? split : fileSplit,
          top_assays: 4,
        }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { detail?: string } | null
        throw new Error(payload?.detail ?? "Batch prediction request failed.")
      }

      const payload = (await response.json()) as ApiBatchResponse
      setBatchResult(payload)
    } catch (uploadError) {
      setBatchError(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to process the uploaded CSV file."
      )
    } finally {
      setIsBatchLoading(false)
      event.target.value = ""
    }
  }

  const handleReset = () => {
    setCompoundId("")
    setResult(null)
    setBatchResult(null)
    setError(null)
    setBatchError(null)
    setSelectedFileName(null)
    setSplit("test")
  }

  const loadSample = (value: string) => {
    setCompoundId(value)
    setSplit("test")
    setError(null)
    setBatchError(null)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-12">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8 text-center">
              <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <FlaskConical className="h-7 w-7 text-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Tox21 Prediction Workspace</h1>
              <p className="mt-2 text-muted-foreground">
                Query the trained model with Tox21 compound IDs or batch-upload a CSV of IDs.
              </p>
            </div>

            <Tabs defaultValue="lookup" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="lookup">Compound Lookup</TabsTrigger>
                <TabsTrigger value="upload">Upload CSV</TabsTrigger>
              </TabsList>

              <TabsContent value="lookup" className="mt-6">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <CardTitle>Tox21 Compound ID</CardTitle>
                        <CardDescription>
                          Use a compound already present in the provided Tox21 train or test split.
                        </CardDescription>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {sampleCompoundIds.map((sampleId) => (
                          <Button
                            key={sampleId}
                            variant="outline"
                            size="sm"
                            onClick={() => loadSample(sampleId)}
                          >
                            {sampleId}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                        <div className="space-y-2">
                          <Label htmlFor="compound-id">Compound ID</Label>
                          <Input
                            id="compound-id"
                            placeholder="e.g., NCGC00261776-01"
                            value={compoundId}
                            onChange={(event) => setCompoundId(event.target.value)}
                            className="font-mono"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="dataset-split">Dataset Split</Label>
                          <Select value={split} onValueChange={(value) => setSplit(value as "auto" | "train" | "test") }>
                            <SelectTrigger id="dataset-split">
                              <SelectValue placeholder="Choose split" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="auto">Auto-detect</SelectItem>
                              <SelectItem value="test">Test split</SelectItem>
                              <SelectItem value="train">Train split</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <Alert>
                        <Database className="h-4 w-4" />
                        <AlertTitle>Dataset-backed predictions</AlertTitle>
                        <AlertDescription>
                          The model uses the new Tox21 bundle you added: 12 assays, 801 dense descriptors,
                          and 843 retained sparse fingerprint features.
                        </AlertDescription>
                      </Alert>

                      {error && (
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Error</AlertTitle>
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      )}

                      <div className="flex gap-4">
                        <Button type="submit" disabled={isLoading} className="flex-1">
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Predicting...
                            </>
                          ) : (
                            <>
                              <FlaskConical className="mr-2 h-4 w-4" />
                              Predict Assays
                            </>
                          )}
                        </Button>
                        <Button type="button" variant="outline" onClick={handleReset}>
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Reset
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="upload" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Batch CSV Upload</CardTitle>
                    <CardDescription>
                      Upload a CSV containing a `compound_id` column and an optional `split` column.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg border-2 border-dashed bg-muted/30 p-8 text-center">
                      <Upload className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
                      <p className="mb-2 text-sm text-muted-foreground">
                        Select a CSV file containing one or more Tox21 compound IDs.
                      </p>
                      <p className="mb-4 text-xs text-muted-foreground">
                        Required column: `compound_id`. Optional column: `split` (`train` or `test`).
                      </p>
                      <Label
                        htmlFor="csv-upload"
                        className="inline-flex cursor-pointer items-center rounded-md border px-4 py-2 text-sm font-medium"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Choose CSV
                      </Label>
                      <Input
                        id="csv-upload"
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                      {selectedFileName && (
                        <p className="mt-3 text-sm text-muted-foreground">
                          Selected file: <span className="font-mono">{selectedFileName}</span>
                        </p>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <Button asChild variant="link" className="h-auto p-0 text-sm">
                        <a href="/tox21_sample_template.csv" download>
                          <Download className="mr-2 h-4 w-4" />
                          Download sample CSV template
                        </a>
                      </Button>
                      {isBatchLoading && (
                        <span className="inline-flex items-center text-sm text-muted-foreground">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Running batch predictions...
                        </span>
                      )}
                    </div>

                    {batchError && (
                      <Alert variant="destructive" className="mt-6">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Upload Error</AlertTitle>
                        <AlertDescription>{batchError}</AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {result && (
              <Card className="mt-8">
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-2">
                    Prediction Summary
                    <Badge variant={result.summary.predicted_active_count > 0 ? "destructive" : "secondary"}>
                      {result.summary.predicted_active_count} active assay
                      {result.summary.predicted_active_count === 1 ? "" : "s"}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {result.compound_id} • highest predicted risk: {result.summary.highest_risk_assay ?? "N/A"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-lg border p-4">
                      <p className="text-sm text-muted-foreground">Predicted active assays</p>
                      <p className="mt-2 text-2xl font-bold">{result.summary.predicted_active_count}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <p className="text-sm text-muted-foreground">Predicted inactive assays</p>
                      <p className="mt-2 text-2xl font-bold">{result.summary.predicted_inactive_count}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <p className="text-sm text-muted-foreground">Mean active probability</p>
                      <p className="mt-2 text-2xl font-bold">
                        {(result.summary.mean_active_probability * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold">Assay probabilities</h4>
                    <div className="space-y-3">
                      {result.predictions.map((prediction) => (
                        <div key={prediction.assay} className="rounded-lg border p-4">
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-sm">{prediction.assay}</span>
                                {prediction.predicted_active ? (
                                  <Badge variant="destructive">Predicted Active</Badge>
                                ) : (
                                  <Badge variant="secondary">Predicted Inactive</Badge>
                                )}
                                {prediction.known_label !== null && (
                                  <Badge variant="outline">Known label: {prediction.known_label}</Badge>
                                )}
                              </div>
                              <p className="mt-2 text-sm text-muted-foreground">
                                Active probability {(prediction.probability_active * 100).toFixed(1)}%
                              </p>
                            </div>
                            <div className="w-full md:w-56">
                              <div className="h-3 overflow-hidden rounded-full bg-muted">
                                <div
                                  className={`h-full rounded-full ${
                                    prediction.predicted_active ? "bg-destructive" : "bg-primary"
                                  }`}
                                  style={{ width: `${prediction.probability_active * 100}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Interpretation note</AlertTitle>
                    <AlertDescription>
                      These outputs are assay-specific activity predictions from the provided Tox21 dataset and should be used for research support, not clinical decision-making.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}

            {batchResult && (
              <Card className="mt-8">
                <CardHeader>
                  <CardTitle>Batch Prediction Summary</CardTitle>
                  <CardDescription>
                    {batchResult.resolved_compounds} of {batchResult.total_compounds} compounds were resolved.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {batchResult.unresolved_compounds.length > 0 && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Unresolved IDs</AlertTitle>
                      <AlertDescription>
                        {batchResult.unresolved_compounds.join(", ")}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-3">
                    {batchResult.predictions.map((prediction) => (
                      <div key={`${prediction.compound_id}-${prediction.split}`} className="rounded-lg border p-4">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-mono text-sm">{prediction.compound_id}</p>
                            <p className="text-sm text-muted-foreground">
                              Highest risk assay: {prediction.summary.highest_risk_assay ?? "N/A"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={prediction.summary.predicted_active_count > 0 ? "destructive" : "secondary"}>
                              {prediction.summary.predicted_active_count} active assay
                              {prediction.summary.predicted_active_count === 1 ? "" : "s"}
                            </Badge>
                            <Badge variant="outline">
                              {(prediction.summary.mean_active_probability * 100).toFixed(1)}% mean
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
