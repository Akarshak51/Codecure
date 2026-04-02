import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import {
  FlaskConical,
  BarChart3,
  Database,
  Lightbulb,
  ArrowRight,
  Shield,
  Zap,
  GitBranch,
  CheckCircle2,
} from "lucide-react"

const features = [
  {
    icon: FlaskConical,
    title: "Compound Lookup",
    description: "Query the trained model with Tox21 compound IDs and review assay-wise activity probabilities.",
  },
  {
    icon: Lightbulb,
    title: "Assay Insights",
    description: "Inspect the highest-risk endpoints across 12 Tox21 nuclear receptor and stress response assays.",
  },
  {
    icon: BarChart3,
    title: "Batch Screening",
    description: "Upload CSV files of compound IDs to score multiple Tox21 records in one request.",
  },
  {
    icon: Database,
    title: "Real Dataset",
    description: "Powered by the provided official Tox21 train/test bundle rather than a synthetic demo dataset.",
  },
]

const techStack = [
  { name: "Next.js", category: "Frontend" },
  { name: "Tailwind CSS", category: "Styling" },
  { name: "FastAPI", category: "Backend" },
  { name: "scikit-learn", category: "ML" },
  { name: "SciPy", category: "Sparse Data" },
  { name: "pandas", category: "Data" },
]

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />

      <main className="flex-1">
        <section className="relative overflow-hidden border-b bg-gradient-to-b from-accent/30 to-background">
          <div className="container mx-auto px-4 py-20 md:py-28">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm">
                <Shield className="h-4 w-4 text-primary" />
                <span>CodeCure Track A - Tox21 Multi-Assay Prediction</span>
              </div>

              <h1 className="text-4xl font-bold tracking-tight text-balance md:text-5xl lg:text-6xl">
                Explore Tox21 Toxicity Signals with{" "}
                <span className="text-primary">Machine Learning</span>
              </h1>

              <p className="mt-6 text-lg leading-relaxed text-balance text-muted-foreground">
                An open-source workflow for screening compounds across 12 Tox21 assays using the full
                dataset bundle you provided, including dense descriptors and sparse fingerprints.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button asChild size="lg" className="gap-2">
                  <Link href="/predict">
                    <FlaskConical className="h-5 w-5" />
                    Open Prediction Workspace
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="gap-2">
                  <Link href="/methodology">
                    <Database className="h-5 w-5" />
                    View Methodology
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="absolute inset-0 -z-10 opacity-30">
            <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-3xl" />
          </div>
        </section>

        <section className="container mx-auto px-4 py-20">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">What Changed</h2>
            <p className="mt-4 text-muted-foreground">
              The app now uses the real Tox21 files under `data/raw/tox21` throughout preprocessing, training, and inference.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <Card key={feature.title} className="relative overflow-hidden">
                  <CardHeader>
                    <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>

        <section className="border-y bg-muted/30">
          <div className="container mx-auto px-4 py-16">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight">100% Free Stack</h2>
              <p className="mt-3 text-muted-foreground">
                No paid APIs or proprietary model services required.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4">
              {techStack.map((tech) => (
                <div key={tech.name} className="flex items-center gap-2 rounded-full border bg-card px-4 py-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{tech.name}</span>
                  <span className="text-xs text-muted-foreground">({tech.category})</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-20">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">How It Works</h2>
            <p className="mt-4 text-muted-foreground">Simple workflow for the updated Tox21 pipeline</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                1
              </div>
              <h3 className="mb-2 text-lg font-semibold">Preprocess Official Files</h3>
              <p className="text-sm text-muted-foreground">
                Dense descriptors, sparse fingerprints, labels, and metadata are aligned from the provided Tox21 bundle.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                2
              </div>
              <h3 className="mb-2 text-lg font-semibold">Train Per-Assay Models</h3>
              <p className="text-sm text-muted-foreground">
                Twelve Random Forest classifiers learn endpoint-specific toxicity signals over 1,644 processed features.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                3
              </div>
              <h3 className="mb-2 text-lg font-semibold">Inspect Assay Risk</h3>
              <p className="text-sm text-muted-foreground">
                Query the API or UI with compound IDs and review the highest-risk assays plus confidence scores.
              </p>
            </div>
          </div>
        </section>

        <section className="border-t bg-gradient-to-b from-background to-accent/20">
          <div className="container mx-auto px-4 py-20">
            <Card className="mx-auto max-w-2xl p-8 text-center">
              <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Zap className="h-7 w-7 text-primary" />
              </div>
              <h2 className="mb-3 text-2xl font-bold">Ready to Run the Updated Pipeline?</h2>
              <p className="mb-6 text-muted-foreground">
                Open the prediction workspace to try sample compounds or review the dataset methodology behind the migration.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button asChild size="lg" className="gap-2">
                  <Link href="/predict">
                    Start Predicting
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="gap-2">
                  <Link href="/methodology">
                    <GitBranch className="h-4 w-4" />
                    Review Methodology
                  </Link>
                </Button>
              </div>
            </Card>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
