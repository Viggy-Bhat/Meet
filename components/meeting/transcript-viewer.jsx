"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";

export default function TranscriptViewer({ transcript }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!transcript) return null;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="font-serif text-sm flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          Full Transcript
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={`text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap ${
            !isExpanded ? "max-h-32 overflow-hidden" : ""
          }`}
        >
          {transcript}
        </div>
        {transcript.length > 300 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 text-accent h-auto py-1"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5 mr-1" /> Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5 mr-1" /> Show Full Transcript
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
