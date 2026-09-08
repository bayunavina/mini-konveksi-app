import assert from "node:assert/strict"
import test from "node:test"
import { formatActivityTimestamp } from "./activity-log"

test("formats the activity timestamp with seconds", () => {
  const eventDate = "2026-09-08T14:05:09.000Z"

  assert.match(formatActivityTimestamp(eventDate), /08\/09\/2026, 21:05:09/)
})
