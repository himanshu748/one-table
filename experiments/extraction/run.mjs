// Day-one feasibility gate for one-table.
//
// The question is not "does the model return JSON". It is:
//   1. does it read the right number out of a messy sales email
//   2. does it leave a field blank when the vendor never stated it
//   3. do those extractions produce a correct comparable total
//
// (2) is the one that decides whether this product is honest. A model that
// invents an 18% GST because Indian venues usually charge 18% produces a table
// that looks complete and is wrong, which is worse than an empty cell.
//
// Normalisation is deliberately NOT the model's job. The model extracts fields,
// this file computes totals in plain arithmetic.

import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  fixtures as baseFixtures,
  SCORED_FIELDS,
  HEADCOUNT,
} from "./fixtures.mjs";
import { hardFixtures } from "./fixtures-hard.mjs";

// node run.mjs           both sets
// node run.mjs base      the cooperative replies only
// node run.mjs hard      the adversarial set only
const SET = process.argv[2] ?? "all";
const fixtures = [
  ...(SET === "hard" ? [] : baseFixtures.map((f) => ({ ...f, set: "base" }))),
  ...(SET === "base" ? [] : hardFixtures.map((f) => ({ ...f, set: "hard" }))),
];

import ts from "typescript";
async function loadTs(relative) {
  const source = await readFile(new URL(relative, import.meta.url), "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  return import(
    "data:text/javascript;base64," + Buffer.from(js).toString("base64")
  );
}
const { EXTRACT_SCHEMA: SCHEMA, EXTRACT_SYSTEM: SYSTEM } = await loadTs(
  "../../convex/lib/extractionContract.ts",
);
const { normalise } = await loadTs("../../convex/lib/normalise.ts");

function userPrompt(f) {
  return `Buyer asked for a quote for ${HEADCOUNT} guests.

Subject: ${f.subject}

${f.body}`;
}

async function callOpenAI(f, model, key) {
  const r = await fetch(
    process.env.AI_GATEWAY_API_KEY
      ? "https://ai-gateway.vercel.sh/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions",
    {
      signal: AbortSignal.timeout(60000),
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        ...(process.env.AI_GATEWAY_API_KEY
          ? { providerOptions: { gateway: { only: ["openai"] } } }
          : {}),
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt(f) },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "quote", strict: true, schema: SCHEMA },
        },
      }),
    },
  );
  if (!r.ok)
    throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const j = await r.json();
  return JSON.parse(j.choices[0].message.content);
}

async function callAnthropic(f, model, key) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      system: SYSTEM,
      tools: [
        {
          name: "quote",
          description: "Structured quote",
          input_schema: SCHEMA,
        },
      ],
      tool_choice: { type: "tool", name: "quote" },
      messages: [{ role: "user", content: userPrompt(f) }],
    }),
  });
  if (!r.ok)
    throw new Error(`Anthropic ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const j = await r.json();
  const block = j.content.find((c) => c.type === "tool_use");
  if (!block) throw new Error("no tool_use block returned");
  return block.input;
}

function eq(a, b) {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  if (typeof a === "string" && typeof b === "string") {
    return a.trim().toLowerCase() === b.trim().toLowerCase();
  }
  return a === b;
}

async function main() {
  const openaiKey =
    process.env.OPENAI_API_KEY ?? process.env.AI_GATEWAY_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  let call, model, provider;
  if (openaiKey) {
    provider = process.env.AI_GATEWAY_API_KEY
      ? "openai-via-vercel-gateway"
      : "openai";
    model =
      process.env.EXTRACT_MODEL ||
      (process.env.AI_GATEWAY_API_KEY ? "openai/gpt-4.1" : "gpt-4.1");
    call = (f) => callOpenAI(f, model, openaiKey);
  } else if (anthropicKey && process.env.EXTRACT_PROVIDER === "anthropic") {
    provider = "anthropic";
    model = process.env.EXTRACT_MODEL || "claude-sonnet-5";
    call = (f) => callAnthropic(f, model, anthropicKey);
    console.log(
      "!! OPENAI_API_KEY is not set. Falling back to Anthropic to answer the\n" +
        "!! feasibility question today. The OpenAI path in this file is UNTESTED\n" +
        "!! until that key exists. Set OPENAI_API_KEY to test the shipping path.\n",
    );
  } else {
    console.error(
      "No model key. Set OPENAI_API_KEY (the shipping path) or ANTHROPIC_API_KEY.",
    );
    process.exit(1);
  }

  console.log(`provider=${provider} model=${model} headcount=${HEADCOUNT}\n`);

  const results = [];
  for (const f of fixtures) {
    let got, error;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        got = await call(f);
        error = undefined;
        break;
      } catch (e) {
        error = e.message;
        if (!error.includes("429")) break;
        console.log(`${f.id}: rate limited; retry ${attempt + 1}/3`);
        await new Promise((resolve) => setTimeout(resolve, 25000));
      }
    }
    results.push({ f, got, error });
    console.log(`${f.id}: ${got ? "extracted" : "failed"}`);
    if (got) await new Promise((resolve) => setTimeout(resolve, 15000));
    if (error?.includes("429")) {
      console.log(
        "Provider rate limit persists. Stopping the gate; remaining fixtures are untested.",
      );
      break;
    }
  }

  const tally = {
    base: {
      fieldsRight: 0,
      fieldsTotal: 0,
      nullsRight: 0,
      nullsTotal: 0,
      totalsRight: 0,
      totalsTotal: 0,
    },
    hard: {
      fieldsRight: 0,
      fieldsTotal: 0,
      nullsRight: 0,
      nullsTotal: 0,
      totalsRight: 0,
      totalsTotal: 0,
    },
  };
  const hallucinated = [];

  for (const { f, got, error } of results) {
    if (error) {
      console.log(`## ${f.id}\n   ERROR ${error}\n`);
      continue;
    }
    const T = tally[f.set];
    const wrong = [];
    for (const k of SCORED_FIELDS) {
      T.fieldsTotal++;
      const ok = eq(got[k], f.truth[k]);
      if (ok) T.fieldsRight++;
      else
        wrong.push(
          `${k}: got ${JSON.stringify(got[k])}, want ${JSON.stringify(f.truth[k])}`,
        );

      if (f.truth[k] === null) {
        T.nullsTotal++;
        if (got[k] === null) T.nullsRight++;
        else
          hallucinated.push(
            `[${f.set}] ${f.id}.${k} = ${JSON.stringify(got[k])}`,
          );
      }
    }

    for (const need of f.requireUnstated ?? []) {
      if (!(got.unstated ?? []).includes(need)) {
        wrong.push(`unstated: missing "${need}"`);
      }
    }

    const n = normalise(got, HEADCOUNT);
    const t = normalise(
      { ...f.truth, unstated: f.requireUnstated ?? [] },
      HEADCOUNT,
    );
    const totalOk = n.total === t.total && n.blocker === t.blocker;
    T.totalsTotal++;
    if (totalOk) T.totalsRight++;

    console.log(`## [${f.set}] ${f.id}`);
    console.log(
      `   fields  ${SCORED_FIELDS.length - wrong.length}/${SCORED_FIELDS.length}`,
    );
    console.log(
      `   total   ${n.total === null ? "none" : "Rs " + n.total.toLocaleString("en-IN")}` +
        `${n.isPreTax ? " pre-tax" : ""}` +
        `${n.blocker ? ` [${n.blocker}]` : ""}` +
        `  ${totalOk ? "OK" : `WRONG, want ${t.total} [${t.blocker}]`}`,
    );
    if (n.notes.length) console.log(`   notes   ${n.notes.join("; ")}`);
    for (const w of wrong) console.log(`   MISS    ${w}`);
    console.log();
  }

  // Real model output, kept so the UI can be built against measured data
  // instead of numbers someone typed in by hand.
  const dump = results
    .filter((r) => r.got)
    .map(({ f, got }) => ({ id: f.id, subject: f.subject, extracted: got }));
  await writeFile(
    new URL("./results-openai.json", import.meta.url),
    JSON.stringify(
      {
        provider,
        model,
        headcount: HEADCOUNT,
        fixtureCount: fixtures.length,
        completedCount: dump.length,
        promptSha256: createHash("sha256").update(SYSTEM).digest("hex"),
        sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
          encoding: "utf8",
        }).trim(),
        sourceDirty: Boolean(
          execFileSync("git", ["status", "--porcelain"], {
            encoding: "utf8",
          }).trim(),
        ),
        scores: tally,
        errors: results
          .filter((r) => r.error)
          .map((r) => ({ id: r.f.id, error: r.error })),
        at: new Date().toISOString(),
        results: dump,
      },
      null,
      2,
    ),
  );
  console.log(`wrote results-openai.json (${dump.length} quotes)\n`);

  console.log("=".repeat(64));
  const pct = (a, b) => (b === 0 ? "  n/a" : `${((a / b) * 100).toFixed(1)}%`);
  let any = false;
  for (const [name, T] of Object.entries(tally)) {
    if (T.fieldsTotal === 0) continue;
    any = true;
    console.log(
      `${name.padEnd(5)} fields ${String(T.fieldsRight).padStart(3)}/${T.fieldsTotal} ${pct(T.fieldsRight, T.fieldsTotal).padStart(6)}` +
        `   blank-when-unstated ${T.nullsRight}/${T.nullsTotal} ${pct(T.nullsRight, T.nullsTotal).padStart(6)}` +
        `   totals ${T.totalsRight}/${T.totalsTotal}`,
    );
  }
  if (!any) {
    console.log("Every fixture errored. No result.");
    process.exit(1);
  }
  if (
    results.some((r) => r.error) ||
    Object.values(tally).some(
      (t) => t.fieldsRight !== t.fieldsTotal || t.totalsRight !== t.totalsTotal,
    )
  )
    process.exitCode = 1;
  if (hallucinated.length) {
    console.log(
      `\nINVENTED VALUES (${hallucinated.length}) - each one is a wrong number shown as fact:`,
    );
    for (const h of hallucinated) console.log(`  ${h}`);
  } else {
    console.log("\nNo invented values. Every unstated field came back blank.");
  }
}

main();
