import assert from "node:assert/strict"
import test from "node:test"
import { MIND_MAP_TABS, PROCESS_FLOW } from "./mindmap-erp"

test("defines the four ERP mind map views", () => {
  assert.deepEqual(MIND_MAP_TABS.map((tab) => tab.id), [
    "main-flow",
    "module-map",
    "restock",
    "payroll",
  ])
})

test("main flow includes stock and QC decision gates", () => {
  const flowText = PROCESS_FLOW.map((node) => `${node.id} ${node.label}`).join(" ")

  assert.match(flowText, /stok/i)
  assert.match(flowText, /qc/i)
  assert.ok(PROCESS_FLOW.some((node) => node.kind === "decision"))
})

test("linked process nodes expose application routes", () => {
  const linkedNodes = PROCESS_FLOW.filter((node) => node.href)

  assert.ok(linkedNodes.length >= 6)
  assert.ok(linkedNodes.every((node) => node.href?.startsWith("/")))
})
