"use client";

import { ChevronRightIcon } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/ui/collapsible";

import type { RunDetails } from "../model/run-details";

const number = new Intl.NumberFormat("en-US");

/** "Under the hood": what the model did to produce one answer. */
export function RunDetailsPanel({ run }: { readonly run: RunDetails }) {
  const facts = [
    run.durationMs === undefined ? undefined : seconds(run.durationMs),
    run.tokens === undefined
      ? undefined
      : `${number.format(run.tokens.total)} tokens`,
    run.tools.length === 0
      ? "no tools"
      : `${String(run.tools.length)} ${run.tools.length === 1 ? "tool" : "tools"}`,
  ].filter((fact) => fact !== undefined);

  return (
    <Collapsible className="text-xs text-muted-foreground">
      <CollapsibleTrigger className="group flex items-center gap-1 rounded-sm hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
        <ChevronRightIcon
          aria-hidden
          className="size-3.5 transition-transform group-data-[panel-open]:rotate-90 motion-reduce:transition-none"
        />
        Under the hood
        <span className="ml-1 flex gap-2 tabular-nums">
          {facts.map((fact) => (
            <span key={fact}>{fact}</span>
          ))}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-lg border bg-background p-3">
          {run.model !== undefined && <Fact term="Model" value={run.model} />}
          {run.durationMs !== undefined && (
            <Fact term="Time" value={seconds(run.durationMs)} />
          )}
          {run.tokens !== undefined && (
            <Fact
              term="Tokens"
              value={`${number.format(run.tokens.input)} in, ${number.format(run.tokens.output)} out`}
            />
          )}
          <Fact term="Steps" value={String(run.steps)} />
          {run.tools.map((tool, index) => (
            <Fact
              // Tool runs have no id; their order in the answer never changes.
              key={index}
              term={index === 0 ? "Tools" : ""}
              value={
                <div className="min-w-0">
                  <span className="font-medium text-foreground">
                    {tool.name}
                  </span>
                  {!tool.ok && <span className="ml-1">(failed)</span>}
                  <pre className="mt-0.5 overflow-x-auto font-mono text-[11px] whitespace-pre-wrap">
                    {JSON.stringify(tool.input)}
                  </pre>
                </div>
              }
            />
          ))}
        </dl>
      </CollapsibleContent>
    </Collapsible>
  );
}

function Fact({
  term,
  value,
}: {
  readonly term: string;
  readonly value: React.ReactNode;
}) {
  return (
    <>
      <dt>{term}</dt>
      <dd className="min-w-0 text-foreground">{value}</dd>
    </>
  );
}

function seconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)} s`;
}
