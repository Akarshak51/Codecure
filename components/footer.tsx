import Link from "next/link"
import { FlaskConical, Github, ExternalLink } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t bg-card">
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <FlaskConical className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold">CodeCure</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Open-source drug toxicity prediction using machine learning. 
              Built for CodeCure Track A Hackathon.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/predict" className="text-muted-foreground hover:text-foreground transition-colors">
                  Make Prediction
                </Link>
              </li>
              <li>
                <Link href="/insights" className="text-muted-foreground hover:text-foreground transition-colors">
                  Model Insights
                </Link>
              </li>
              <li>
                <Link href="/methodology" className="text-muted-foreground hover:text-foreground transition-colors">
                  Dataset & Methodology
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a 
                  href="https://github.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Github className="h-4 w-4" />
                  GitHub Repository
                </a>
              </li>
              <li>
                <a 
                  href="https://scikit-learn.org" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  scikit-learn Docs
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground">
          <p>Built with Next.js, FastAPI, and scikit-learn. 100% free and open-source.</p>
        </div>
      </div>
    </footer>
  )
}
