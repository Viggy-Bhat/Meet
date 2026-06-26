"use client";

import { CheckCircle2, Lightbulb, ArrowRight, FileDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AiSummaryCard({ summary, bookingId }) {
  if (!summary) return null;

  return (
    <Card className="border-accent/20">
      <CardHeader className="pb-3">
        <CardTitle className="font-serif text-base flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-accent/10 flex items-center justify-center">
            <svg
              className="h-4 w-4 text-accent"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 2a4 4 0 0 1 4 4v2h3a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h3V6a4 4 0 0 1 4-4z" />
            </svg>
          </div>
          AI-Generated Summary
          {bookingId && (
            <a
              href={`/api/meetings/${bookingId}/pdf`}
              download
              className="ml-auto text-muted-foreground hover:text-accent transition-colors"
              title="Download PDF"
            >
              <FileDown className="h-4 w-4" />
            </a>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-foreground/80 leading-relaxed">
          {summary.summary}
        </p>

        {summary.keyPoints?.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5 text-accent" />
              Key Points
            </h4>
            <ul className="space-y-1.5">
              {summary.keyPoints.map((point, i) => (
                <li
                  key={i}
                  className="text-sm text-foreground/70 flex items-start gap-2"
                >
                  <span className="text-accent mt-0.5">&#8226;</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}

        {summary.actionItems?.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              Action Items
            </h4>
            <ul className="space-y-1.5">
              {summary.actionItems.map((item, i) => (
                <li
                  key={i}
                  className="text-sm text-foreground/70 flex items-start gap-2"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-green-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {summary.followUps?.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ArrowRight className="h-3.5 w-3.5 text-accent" />
              Follow-ups
            </h4>
            <ul className="space-y-1.5">
              {summary.followUps.map((item, i) => (
                <li
                  key={i}
                  className="text-sm text-foreground/70 flex items-start gap-2"
                >
                  <span className="text-accent mt-0.5">&#8226;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
