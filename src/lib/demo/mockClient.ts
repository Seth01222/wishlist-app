// A stand-in for the Supabase browser client used while in demo mode. Every
// query resolves successfully so the existing client components keep working —
// inserts echo back the row (with a generated id) the components expect, and
// updates/deletes are no-ops. Nothing is persisted: changes live only in the
// component's React state until the page is reloaded.

import { clearDemoCookie, DEMO_EMAIL, DEMO_USER_ID } from './config'

type Result = { data: unknown; error: null }

function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

// Fill in the server-generated columns the UI reads back after an insert.
function stampRow(payload: Record<string, unknown>) {
  return {
    id: newId(),
    created_at: new Date().toISOString(),
    archived: false,
    purchased: false,
    purchased_at: null,
    star_rating: 0,
    quantity: 1,
    ...payload,
  }
}

// A chainable, awaitable query builder. Method calls (.select, .eq, .order…)
// return the same builder; awaiting it resolves a Supabase-shaped result.
function makeBuilder() {
  let op: 'select' | 'insert' | 'update' | 'delete' = 'select'
  let rows: Record<string, unknown>[] = []
  let single = false

  const resolve = (): Result => {
    if (op === 'insert') {
      const stamped = rows.map(stampRow)
      return { data: single ? (stamped[0] ?? null) : stamped, error: null }
    }
    return { data: single ? null : [], error: null }
  }

  const builder = {
    select() { return builder },
    insert(payload: Record<string, unknown> | Record<string, unknown>[]) {
      op = 'insert'
      rows = Array.isArray(payload) ? payload : [payload]
      return builder
    },
    update(_patch: Record<string, unknown>) { op = 'update'; return builder },
    delete() { op = 'delete'; return builder },
    upsert(payload: Record<string, unknown> | Record<string, unknown>[]) {
      op = 'insert'
      rows = Array.isArray(payload) ? payload : [payload]
      return builder
    },
    eq() { return builder },
    neq() { return builder },
    in() { return builder },
    order() { return builder },
    limit() { return builder },
    single() { single = true; return builder },
    maybeSingle() { single = true; return builder },
    // Makes the builder awaitable (thenable).
    then(onFulfilled: (r: Result) => unknown, onRejected?: (e: unknown) => unknown) {
      return Promise.resolve(resolve()).then(onFulfilled, onRejected)
    },
  }
  return builder
}

const auth = {
  async getUser() {
    return { data: { user: { id: DEMO_USER_ID, email: DEMO_EMAIL } }, error: null }
  },
  async getSession() {
    return { data: { session: { user: { id: DEMO_USER_ID, email: DEMO_EMAIL } } }, error: null }
  },
  async signInWithPassword() {
    return { data: { user: { id: DEMO_USER_ID, email: DEMO_EMAIL }, session: {} }, error: null }
  },
  async signUp() {
    return { data: { user: { id: DEMO_USER_ID, email: DEMO_EMAIL }, session: null }, error: null }
  },
  async signOut() {
    clearDemoCookie()
    return { error: null }
  },
  onAuthStateChange() {
    return { data: { subscription: { unsubscribe() {} } } }
  },
}

export function createDemoClient() {
  return {
    from() { return makeBuilder() },
    auth,
  }
}
