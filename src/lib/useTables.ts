"use client";
import { useEffect } from "react";
import { useYaar } from "./store";
import { LIVE } from "./remote";
import { DEMO_TABLES } from "./seed";
import type { TableEvent } from "./types";

/** Tables to show: real ones from the database in the live app, sample ones in the offline demo. */
export function useTables() {
  const liveTables = useYaar((s) => s.liveTables);
  const loaded = useYaar((s) => s.tablesLoaded);
  const joined = useYaar((s) => s.joinedTables);
  const me = useYaar((s) => s.me?.id);
  useEffect(() => { if (LIVE && me) void import("./live").then((l) => l.loadTables()); }, [me]);
  const tables: TableEvent[] = LIVE ? liveTables.filter((t) => !t.cancelled || t.going || t.hosting) : DEMO_TABLES;
  const isGoing = (t: TableEvent) => (LIVE ? !!(t.going || t.hosting) : joined.includes(t.id));
  return { tables, isGoing, loaded: LIVE ? loaded : true, live: LIVE };
}
