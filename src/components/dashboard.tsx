"use client";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArchiveRestore,
  ArrowDownUp,
  Barcode,
  Camera,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  Download,
  Edit3,
  Filter,
  Gem,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  PackageCheck,
  Printer,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShoppingBag,
  SlidersHorizontal,
  Trash2,
  Weight,
  X,
} from "lucide-react";
import {
  CATEGORIES,
  KARATS,
  type Breakdowns,
  type InventoryHistory,
  type InventoryItem,
  type Stats,
} from "@/lib/types";
import { Scanner } from "./scanner";
import { BarcodeLabel } from "./barcode-label";

type Filters = {
  q: string;
  status: string;
  category: string;
  karat: string;
  minGrams: string;
  maxGrams: string;
  from: string;
  to: string;
  sort: string;
  dir: string;
  page: number;
  pageSize: number;
};
const initial: Filters = {
  q: "",
  status: "",
  category: "",
  karat: "",
  minGrams: "",
  maxGrams: "",
  from: "",
  to: "",
  sort: "created_at",
  dir: "desc",
  page: 1,
  pageSize: 20,
};
const emptyStats: Stats = {
  total_items: 0,
  available_items: 0,
  sold_items: 0,
  available_grams: 0,
  sold_grams: 0,
  total_grams: 0,
};
const fmt = (n: number) =>
  Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  });
const date = (value: string) =>
  new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
async function jsonFetch<T>(url: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, options);
  } catch {
    throw new Error("Unable to connect to inventory database.");
  }
  const data = await res.json();
  if (res.status === 401) {
    window.location.reload();
    throw new Error("Session expired");
  }
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export function Dashboard({
  initialBarcode = null,
}: {
  initialBarcode?: string | null;
}) {
  const [filters, setFilters] = useState(initial),
    [debounced, setDebounced] = useState(initial),
    [items, setItems] = useState<InventoryItem[]>([]),
    [stats, setStats] = useState(emptyStats),
    [breakdowns, setBreakdowns] = useState<Breakdowns>({
      categories: [],
      karats: [],
    }),
    [count, setCount] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [scanner, setScanner] = useState(false),
    [add, setAdd] = useState<string | null>(null),
    [selected, setSelected] = useState<string | null>(initialBarcode),
    [menu, setMenu] = useState(false),
    [storeName, setStoreName] = useState("Narciso Geronimo Jewelry"),
    [view, setView] = useState<"inventory" | "activity" | "trash" | "settings">(
      "inventory",
    );
  useEffect(() => {
    const timer = setTimeout(
      () => setDebounced(filters),
      filters.q === debounced.q ? 0 : 300,
    );
    return () => clearTimeout(timer);
  }, [filters, debounced.q]);
  const query = useMemo(() => {
    const p = new URLSearchParams();
    Object.entries(debounced).forEach(([k, v]) => {
      if (v !== "") p.set(k, String(v));
    });
    return p.toString();
  }, [debounced]);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await jsonFetch<{
        items: InventoryItem[];
        count: number;
        stats: Stats;
        breakdowns: Breakdowns;
      }>(`/api/inventory?${query}`);
      setItems(data.items);
      setCount(data.count);
      setStats(data.stats || emptyStats);
      setBreakdowns(data.breakdowns || { categories: [], karats: [] });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to connect to inventory database.",
      );
    } finally {
      setLoading(false);
    }
  }, [query]);
  useEffect(() => {
    if (view !== "inventory") return;
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load, view]);
  useEffect(() => {
    jsonFetch<{ settings: { store_name: string } }>("/api/settings")
      .then((d) => setStoreName(d.settings.store_name))
      .catch(() => {});
  }, []);
  useEffect(() => {
    const syncFromUrl = () => {
      const match = window.location.pathname.match(/^\/inventory\/([^/]+)$/);
      setSelected(match ? decodeURIComponent(match[1]).toUpperCase() : null);
    };
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);
  const openItem = useCallback((value: string) => {
    setSelected(value);
    window.history.pushState(
      null,
      "",
      `/inventory/${encodeURIComponent(value)}`,
    );
  }, []);
  const closeItem = useCallback(() => {
    setSelected(null);
    window.history.pushState(null, "", "/");
  }, []);
  const scanned = useCallback(
    async (value: string) => {
      setScanner(false);
      try {
        await jsonFetch(`/api/inventory/${encodeURIComponent(value)}`);
        openItem(value);
      } catch (e) {
        if (e instanceof Error && e.message.startsWith("No inventory")) {
          if (confirm(`${e.message}\n\nAdd this item?`)) setAdd(value);
        } else
          setError(e instanceof Error ? e.message : "Barcode lookup failed.");
      }
    },
    [openItem],
  );
  function update<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((f) => ({
      ...f,
      [key]: value,
      page: key === "page" ? Number(value) : 1,
    }));
  }
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.reload();
  }
  const cards = [
    { label: "Total Gold Items", value: stats.total_items, icon: ShoppingBag },
    {
      label: "Available Items",
      value: stats.available_items,
      icon: PackageCheck,
    },
    { label: "Sold Items", value: stats.sold_items, icon: Barcode },
    {
      label: "Available Grams",
      value: `${fmt(stats.available_grams)} g`,
      icon: Weight,
    },
    { label: "Sold Grams", value: `${fmt(stats.sold_grams)} g`, icon: Weight },
    {
      label: "Inventory Grams",
      value: `${fmt(stats.total_grams)} g`,
      icon: Gem,
    },
  ];
  return (
    <div className="app-shell">
      <aside className={menu ? "sidebar open" : "sidebar"}>
        <div className="side-brand">
          <div className="brand-mark small">
            <Gem />
          </div>
          <div>
            <strong>{storeName}</strong>
            <span>Jewelry Inventory</span>
          </div>
          <button className="mobile-close" onClick={() => setMenu(false)}>
            <X />
          </button>
        </div>
        <nav>
          <Nav
            active={view === "inventory"}
            icon={<LayoutDashboard />}
            label="Dashboard"
            onClick={() => setView("inventory")}
          />
          <Nav
            icon={<CirclePlus />}
            label="Add Gold"
            onClick={() => setAdd("")}
          />
          <Nav
            icon={<Camera />}
            label="Scan Barcode"
            onClick={() => setScanner(true)}
          />
          <Nav
            active={filters.status === "available"}
            icon={<PackageCheck />}
            label="Available"
            onClick={() => {
              setView("inventory");
              update("status", "available");
            }}
          />
          <Nav
            active={filters.status === "sold"}
            icon={<ShoppingBag />}
            label="Sold"
            onClick={() => {
              setView("inventory");
              update("status", "sold");
            }}
          />
          <Nav
            active={view === "activity"}
            icon={<Activity />}
            label="Activity Log"
            onClick={() => setView("activity")}
          />
          <Nav
            active={view === "trash"}
            icon={<Trash2 />}
            label="Recently Deleted"
            onClick={() => setView("trash")}
          />
          <Nav
            active={view === "settings"}
            icon={<Settings />}
            label="Settings"
            onClick={() => setView("settings")}
          />
        </nav>
        <button className="logout" onClick={logout}>
          <LogOut /> Logout
        </button>
      </aside>
      {menu && <div className="menu-shade" onClick={() => setMenu(false)} />}
      <main className="main">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setMenu(true)}>
            <Menu />
          </button>
          <div className="global-search">
            <Search />
            <input
              aria-label="Search inventory"
              placeholder="Search ID, barcode, item, category..."
              value={filters.q}
              onChange={(e) => {
                setView("inventory");
                update("q", e.target.value);
              }}
            />
          </div>
          <button className="scan-top" onClick={() => setScanner(true)}>
            <Camera /> <span>Scan Barcode</span>
          </button>
        </header>
        {view === "inventory" && (
          <>
            <section className="page-head">
              <div>
                <p className="eyebrow">Inventory Overview</p>
                <h1>Gold Inventory</h1>
                <p>Track every piece, every gram, every movement.</p>
              </div>
              <button className="primary add-button" onClick={() => setAdd("")}>
                <CirclePlus /> Add Gold
              </button>
            </section>
            <section className="quick-actions-row" aria-label="Quick actions">
              <button className="secondary" onClick={() => setScanner(true)}>
                <Camera /> Scan Barcode
              </button>
              <button
                className="secondary"
                onClick={() =>
                  document
                    .querySelector<HTMLInputElement>(
                      "[aria-label='Search inventory']",
                    )
                    ?.focus()
                }
              >
                <Search /> Search Inventory
              </button>
              <button
                className="secondary"
                onClick={() => update("status", "sold")}
              >
                <ShoppingBag /> View Sold
              </button>
              <button className="secondary" onClick={() => setFilters(initial)}>
                <RefreshCw /> Reset Filters
              </button>
            </section>
            <section className="stat-grid">
              {cards.map(({ label, value, icon: Icon }) => (
                <article className="stat-card" key={label}>
                  <div className="stat-icon">
                    <Icon />
                  </div>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </article>
              ))}
            </section>
            {!loading && <BreakdownCharts breakdowns={breakdowns} />}
            <section className="workspace-card">
              <div className="workspace-title">
                <div>
                  <h2>Inventory Records</h2>
                  <span>{count.toLocaleString()} active records</span>
                </div>
                <div className="row-actions">
                  <a className="secondary" href={`/api/export?${query}`}>
                    <Download /> Export CSV
                  </a>
                  <button
                    className="secondary"
                    onClick={() => setFilters(initial)}
                  >
                    <RefreshCw /> Reset
                  </button>
                </div>
              </div>
              <Filters filters={filters} update={update} />
              {error && (
                <div className="connection-error">
                  {error}
                  <button onClick={load}>Try Again</button>
                </div>
              )}
              {loading ? (
                <div className="loading">
                  <LoaderCircle className="spin" /> Loading inventory…
                </div>
              ) : (
                <InventoryList
                  items={items}
                  sort={filters.sort}
                  dir={filters.dir}
                  onSort={(s) => {
                    update("sort", s);
                    update(
                      "dir",
                      filters.sort === s && filters.dir === "asc"
                        ? "desc"
                        : "asc",
                    );
                  }}
                  onSelect={openItem}
                />
              )}
              <div className="pagination">
                <span>
                  Rows{" "}
                  <select
                    value={filters.pageSize}
                    onChange={(e) => update("pageSize", Number(e.target.value))}
                  >
                    <option>10</option>
                    <option>20</option>
                    <option>50</option>
                    <option>100</option>
                  </select>
                </span>
                <span>
                  Page {filters.page} of{" "}
                  {Math.max(1, Math.ceil(count / filters.pageSize))}
                </span>
                <button
                  disabled={filters.page <= 1}
                  onClick={() => update("page", filters.page - 1)}
                >
                  <ChevronLeft />
                </button>
                <button
                  disabled={filters.page >= Math.ceil(count / filters.pageSize)}
                  onClick={() => update("page", filters.page + 1)}
                >
                  <ChevronRight />
                </button>
              </div>
            </section>
          </>
        )}
        {view === "activity" && <ActivityView />}
        {view === "trash" && <TrashView onRestored={load} />}
        {view === "settings" && <SettingsView />}
      </main>
      <button className="mobile-scan" onClick={() => setScanner(true)}>
        <Camera /> SCAN BARCODE
      </button>
      {scanner && (
        <Scanner onScan={scanned} onClose={() => setScanner(false)} />
      )}{" "}
      {add !== null && (
        <ItemForm
          barcode={add}
          onClose={() => setAdd(null)}
          onSaved={(b) => {
            setAdd(null);
            void load();
            openItem(b);
          }}
          onExisting={(b) => {
            setAdd(null);
            openItem(b);
          }}
          onScan={() => {
            setAdd(null);
            setScanner(true);
          }}
        />
      )}{" "}
      {selected && (
        <ItemDetail
          barcode={selected}
          onClose={closeItem}
          onChanged={() => {
            void load();
          }}
        />
      )}
    </div>
  );
}

function Nav({
  icon,
  label,
  onClick,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button className={active ? "active" : ""} onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  );
}
function BreakdownCharts({ breakdowns }: { breakdowns: Breakdowns }) {
  const render = (title: string, rows: Breakdowns["categories"]) => {
    const max = Math.max(...rows.map((row) => Number(row.grams)), 1);
    return (
      <article className="breakdown-card">
        <h3>{title}</h3>
        {rows.length ? (
          rows.slice(0, 8).map((row) => (
            <div className="bar-row" key={row.label}>
              <div>
                <span>{row.label}</span>
                <small>
                  {row.items} {row.items === 1 ? "item" : "items"} ·{" "}
                  {fmt(Number(row.grams))} g
                </small>
              </div>
              <i style={{ width: `${(Number(row.grams) / max) * 100}%` }} />
            </div>
          ))
        ) : (
          <p>No inventory data yet.</p>
        )}
      </article>
    );
  };
  return (
    <section className="breakdown-grid">
      {render("Gold weight by category", breakdowns.categories)}
      {render("Gold weight by karat", breakdowns.karats)}
    </section>
  );
}
function Filters({
  filters,
  update,
}: {
  filters: Filters;
  update: <K extends keyof Filters>(k: K, v: Filters[K]) => void;
}) {
  return (
    <div className="filters">
      <div className="filter-heading">
        <SlidersHorizontal />
        <strong>Advanced filters</strong>
        <div className="quick-dates">
          {(["today", "week", "month", "year"] as const).map((period) => (
            <button
              type="button"
              key={period}
              onClick={() => {
                const now = new Date();
                const start = new Date(now);
                if (period === "week") start.setDate(now.getDate() - 6);
                if (period === "month") start.setDate(1);
                if (period === "year") {
                  start.setMonth(0);
                  start.setDate(1);
                }
                const iso = (value: Date) => value.toISOString().slice(0, 10);
                update("from", iso(start));
                update("to", iso(now));
              }}
            >
              {period === "today" ? "Today" : `This ${period}`}
            </button>
          ))}
        </div>
      </div>
      <div className="filter-grid">
        <label>
          Status
          <select
            value={filters.status}
            onChange={(e) => update("status", e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="available">Available</option>
            <option value="sold">Sold</option>
          </select>
        </label>
        <label>
          Category
          <select
            value={filters.category}
            onChange={(e) => update("category", e.target.value)}
          >
            <option value="">All categories</option>
            {CATEGORIES.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          Karat
          <select
            value={filters.karat}
            onChange={(e) => update("karat", e.target.value)}
          >
            <option value="">All karats</option>
            {KARATS.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          Minimum grams
          <input
            type="number"
            min="0"
            step="0.001"
            placeholder="0.000"
            value={filters.minGrams}
            onChange={(e) => update("minGrams", e.target.value)}
          />
        </label>
        <label>
          Maximum grams
          <input
            type="number"
            min="0"
            step="0.001"
            placeholder="Any"
            value={filters.maxGrams}
            onChange={(e) => update("maxGrams", e.target.value)}
          />
        </label>
        <label>
          Date from
          <input
            type="date"
            value={filters.from}
            onChange={(e) => update("from", e.target.value)}
          />
        </label>
        <label>
          Date to
          <input
            type="date"
            value={filters.to}
            onChange={(e) => update("to", e.target.value)}
          />
        </label>
      </div>
    </div>
  );
}
function InventoryList({
  items,
  onSelect,
  onSort,
  sort,
  dir,
}: {
  items: InventoryItem[];
  onSelect: (b: string) => void;
  onSort: (s: string) => void;
  sort: string;
  dir: string;
}) {
  const heads: [[string, string], ...Array<[string, string]>] = [
    ["barcode", "Unique ID"],
    ["item_name", "Item Name"],
    ["category", "Category"],
    ["karat", "Karat"],
    ["grams", "Grams"],
    ["status", "Status"],
    ["created_at", "Date Added"],
  ];
  if (!items.length)
    return (
      <div className="empty">
        <Filter />
        <h3>No jewelry found</h3>
        <p>Adjust the filters or add a new inventory item.</p>
      </div>
    );
  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {heads.map(([key, label]) => (
                <th key={key}>
                  <button onClick={() => onSort(key)}>
                    {label}
                    <ArrowDownUp className={sort === key ? "sorted" : ""} />
                    {sort === key && <small>{dir}</small>}
                  </button>
                </th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} onClick={() => onSelect(i.barcode)}>
                <td>
                  <b>{i.barcode}</b>
                </td>
                <td>
                  <strong>{i.item_name}</strong>
                </td>
                <td>{i.category}</td>
                <td>{i.karat}</td>
                <td>{fmt(i.grams)} g</td>
                <td>
                  <Status value={i.status} />
                </td>
                <td>{date(i.created_at)}</td>
                <td>
                  <button className="text-btn">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mobile-cards">
        {items.map((i) => (
          <button key={i.id} onClick={() => onSelect(i.barcode)}>
            <div>
              <b>{i.barcode}</b>
              <Status value={i.status} />
            </div>
            <h3>{i.item_name}</h3>
            <p>
              {i.category} · {i.karat}
            </p>
            <strong>{fmt(i.grams)} g</strong>
          </button>
        ))}
      </div>
    </>
  );
}
function Status({ value }: { value: string }) {
  return (
    <span className={`status ${value}`}>
      {value === "sold" ? "Sold" : "Available"}
    </span>
  );
}

function ItemForm({
  barcode,
  onClose,
  onSaved,
  onExisting,
  onScan,
}: {
  barcode: string;
  onClose: () => void;
  onSaved: (b: string) => void;
  onExisting: (b: string) => void;
  onScan: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [code, setCode] = useState(barcode),
    [duplicate, setDuplicate] = useState(false);
  useEffect(() => {
    if (!code) return;
    const timer = setTimeout(async () => {
      try {
        const d = await jsonFetch<{ exists: boolean }>(
          `/api/barcode-check/${encodeURIComponent(code)}`,
        );
        setDuplicate(d.exists);
      } catch {}
    }, 350);
    return () => clearTimeout(timer);
  }, [code]);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const result = await jsonFetch<{ item: InventoryItem }>(
        "/api/inventory",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
      onSaved(result.item.barcode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save item.");
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop">
      <form className="form-modal" onSubmit={save}>
        <header>
          <div>
            <p className="eyebrow">New inventory</p>
            <h2>Add Gold / Jewelry</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose}>
            <X />
          </button>
        </header>
        <div className="form-grid">
          <label className="span-2">
            Barcode / Unique ID *
            <div className="input-action">
              <input
                name="barcode"
                required
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setDuplicate(false);
                }}
                placeholder="Scan or enter B0001"
              />
              <button type="button" onClick={onScan}>
                <Camera /> Scan
              </button>
            </div>
            {duplicate && (
              <div className="duplicate-warning">
                <em>
                  This barcode is already assigned to another inventory item.
                </em>
                <button type="button" onClick={() => onExisting(code)}>
                  View Existing Item
                </button>
              </div>
            )}
          </label>
          <label className="span-2">
            Item Name *
            <input name="item_name" required placeholder="18K Gold Necklace" />
          </label>
          <label>
            Category *
            <select name="category" required>
              {CATEGORIES.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Karat *
            <select name="karat" required>
              {KARATS.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Weight in grams *
            <input
              name="grams"
              type="number"
              min="0.001"
              step="0.001"
              required
              placeholder="0.000"
            />
          </label>
          <label>
            Status
            <select name="status" defaultValue="available">
              <option value="available">Available</option>
              <option value="sold">Sold</option>
            </select>
          </label>
          <label className="span-2">
            Description
            <textarea
              name="description"
              placeholder="Style, distinguishing features, condition…"
            />
          </label>
          <label>
            Supplier
            <input name="supplier" />
          </label>
          <label>
            Design Code
            <input name="design_code" />
          </label>
          <label className="span-2">
            Notes
            <textarea name="notes" />
          </label>
        </div>
        {error && <div className="form-error">{error}</div>}
        <footer>
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={busy || duplicate}>
            {busy ? <LoaderCircle className="spin" /> : <CirclePlus />}
            {busy ? "Adding…" : "Add to Inventory"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function ItemDetail({
  barcode,
  onClose,
  onChanged,
}: {
  barcode: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [item, setItem] = useState<InventoryItem | null>(null),
    [history, setHistory] = useState<InventoryHistory[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [editing, setEditing] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await jsonFetch<{
        item: InventoryItem;
        history: InventoryHistory[];
      }>(`/api/inventory/${encodeURIComponent(barcode)}`);
      setItem(d.item);
      setHistory(d.history);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load item.");
    } finally {
      setLoading(false);
    }
  }, [barcode]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);
  async function patch(payload: Record<string, unknown>, confirmText?: string) {
    if (confirmText && !confirm(confirmText)) return;
    try {
      await jsonFetch(`/api/inventory/${encodeURIComponent(barcode)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await load();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    }
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    await patch(data);
    setEditing(false);
  }
  async function remove() {
    const value = prompt(
      `Permanently remove ${barcode} from active inventory?\nType ${barcode} to confirm.`,
    );
    if (value !== barcode) return;
    try {
      await jsonFetch(`/api/inventory/${encodeURIComponent(barcode)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: value }),
      });
      onChanged();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    }
  }
  return (
    <div className="modal-backdrop">
      <section className="detail-modal">
        <header>
          <div>
            <p className="eyebrow">Inventory Detail</p>
            <h2>{barcode}</h2>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X />
          </button>
        </header>
        {loading ? (
          <div className="loading">
            <LoaderCircle className="spin" /> Loading item…
          </div>
        ) : error && !item ? (
          <div className="form-error">{error}</div>
        ) : (
          item && (
            <>
              {editing ? (
                <form className="edit-form" onSubmit={save}>
                  <label>
                    Item Name
                    <input
                      name="item_name"
                      defaultValue={item.item_name}
                      required
                    />
                  </label>
                  <label>
                    Category
                    <select name="category" defaultValue={item.category}>
                      {CATEGORIES.map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Karat
                    <select name="karat" defaultValue={item.karat}>
                      {KARATS.map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Grams
                    <input
                      name="grams"
                      type="number"
                      min="0.001"
                      step="0.001"
                      defaultValue={item.grams}
                      required
                    />
                  </label>
                  <label className="span-2">
                    Description
                    <textarea
                      name="description"
                      defaultValue={item.description || ""}
                    />
                  </label>
                  <label>
                    Supplier
                    <input name="supplier" defaultValue={item.supplier || ""} />
                  </label>
                  <label>
                    Design Code
                    <input
                      name="design_code"
                      defaultValue={item.design_code || ""}
                    />
                  </label>
                  <label className="span-2">
                    Notes
                    <textarea name="notes" defaultValue={item.notes || ""} />
                  </label>
                  <div className="span-2 row-actions">
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => setEditing(false)}
                    >
                      Cancel
                    </button>
                    <button className="primary">
                      <Save /> Save changes
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="detail-hero">
                    <div>
                      <Status value={item.status} />
                      <h3>{item.item_name}</h3>
                      <p>{item.description || "No description provided."}</p>
                    </div>
                    <strong>
                      {fmt(item.grams)}
                      <small> grams</small>
                    </strong>
                  </div>
                  <dl className="details">
                    <div>
                      <dt>Barcode</dt>
                      <dd>{item.barcode}</dd>
                    </div>
                    <div>
                      <dt>Category</dt>
                      <dd>{item.category}</dd>
                    </div>
                    <div>
                      <dt>Karat</dt>
                      <dd>{item.karat}</dd>
                    </div>
                    <div>
                      <dt>Date Added</dt>
                      <dd>{date(item.created_at)}</dd>
                    </div>
                    {item.sold_at && (
                      <div>
                        <dt>Sold On</dt>
                        <dd>{date(item.sold_at)}</dd>
                      </div>
                    )}
                    <div>
                      <dt>Supplier</dt>
                      <dd>{item.supplier || "—"}</dd>
                    </div>
                    <div>
                      <dt>Design Code</dt>
                      <dd>{item.design_code || "—"}</dd>
                    </div>
                    <div>
                      <dt>Notes</dt>
                      <dd>{item.notes || "—"}</dd>
                    </div>
                  </dl>
                  <div className="detail-actions">
                    <button
                      className="secondary"
                      onClick={() => setEditing(true)}
                    >
                      <Edit3 /> Edit
                    </button>
                    <button
                      className={
                        item.status === "sold" ? "secondary" : "primary"
                      }
                      onClick={() =>
                        patch(
                          {
                            status:
                              item.status === "sold" ? "available" : "sold",
                          },
                          `Mark ${barcode} as ${item.status === "sold" ? "available" : "sold"}?`,
                        )
                      }
                    >
                      {item.status === "sold" ? <RefreshCw /> : <ShoppingBag />}
                      {item.status === "sold"
                        ? "Mark Available"
                        : "Mark as Sold"}
                    </button>
                    <button
                      className="secondary"
                      onClick={() => window.print()}
                    >
                      <Printer /> Print Barcode
                    </button>
                    <button className="danger" onClick={remove}>
                      <Trash2 /> Delete
                    </button>
                  </div>
                </>
              )}
              <BarcodeLabel item={item} />
              <section className="history">
                <h3>Item History</h3>
                {history.map((h) => (
                  <article key={h.id}>
                    <span />
                    <div>
                      <strong>{h.action.replaceAll("_", " ")}</strong>
                      <time>{date(h.created_at)}</time>
                      {historySummary(h).map((summary) => (
                        <p key={summary}>{summary}</p>
                      ))}
                    </div>
                  </article>
                ))}
              </section>
              {error && <div className="form-error">{error}</div>}
            </>
          )
        )}
      </section>
    </div>
  );
}

function historySummary(entry: InventoryHistory) {
  if (entry.action !== "updated" || !entry.old_data || !entry.new_data)
    return [];
  const labels: Partial<Record<keyof InventoryItem, string>> = {
    item_name: "Item name",
    category: "Category",
    karat: "Karat",
    grams: "Weight",
    description: "Description",
    supplier: "Supplier",
    design_code: "Design code",
    notes: "Notes",
  };
  return Object.entries(labels).flatMap(([key, label]) => {
    const field = key as keyof InventoryItem;
    const oldValue = entry.old_data?.[field];
    const newValue = entry.new_data?.[field];
    if (oldValue === newValue) return [];
    if (field === "grams")
      return [
        `Weight changed from ${fmt(Number(oldValue))} g to ${fmt(Number(newValue))} g`,
      ];
    return [
      `${label} changed from “${String(oldValue || "—")}” to “${String(newValue || "—")}”`,
    ];
  });
}

function TrashView({ onRestored }: { onRestored: () => void }) {
  const [items, setItems] = useState<InventoryItem[]>([]),
    [query, setQuery] = useState(""),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await jsonFetch<{ items: InventoryItem[] }>(
        `/api/trash?q=${encodeURIComponent(query)}`,
      );
      setItems(data.items);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to load deleted items.",
      );
    } finally {
      setLoading(false);
    }
  }, [query]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [load]);
  async function restore(barcode: string) {
    if (!confirm(`Restore ${barcode} to active inventory?`)) return;
    try {
      await jsonFetch("/api/trash", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode }),
      });
      await load();
      onRestored();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to restore item.");
    }
  }
  return (
    <section className="simple-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Recovery</p>
          <h1>Recently Deleted</h1>
          <p>Restore inventory records removed by mistake.</p>
        </div>
      </div>
      <div className="workspace-card trash-card">
        <div className="workspace-title">
          <div>
            <h2>Deleted Records</h2>
            <span>Barcodes remain reserved while records are deleted.</span>
          </div>
          <div className="global-search trash-search">
            <Search />
            <input
              aria-label="Search deleted inventory"
              placeholder="Search deleted items…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
        {error && <div className="form-error">{error}</div>}
        {loading ? (
          <div className="loading">
            <LoaderCircle className="spin" /> Loading deleted items…
          </div>
        ) : items.length ? (
          <div className="trash-list">
            {items.map((item) => (
              <article key={item.id}>
                <div>
                  <b>{item.barcode}</b>
                  <h3>{item.item_name}</h3>
                  <p>
                    {item.category} · {item.karat} · {fmt(item.grams)} g
                  </p>
                  <small>
                    Deleted{" "}
                    {item.deleted_at ? date(item.deleted_at) : "recently"}
                  </small>
                </div>
                <button
                  className="secondary"
                  onClick={() => restore(item.barcode)}
                >
                  <ArchiveRestore /> Restore
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty">
            <Trash2 />
            <h3>No deleted items</h3>
            <p>Soft-deleted inventory will appear here for recovery.</p>
          </div>
        )}
      </div>
    </section>
  );
}

type ActivityRow = InventoryHistory & {
  inventory_items: { barcode: string; item_name: string } | null;
};
function ActivityView() {
  const [rows, setRows] = useState<ActivityRow[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    jsonFetch<{ activity: ActivityRow[] }>("/api/activity")
      .then((d) => setRows(d.activity))
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Unable to load activity."),
      )
      .finally(() => setLoading(false));
  }, []);
  return (
    <section className="simple-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Audit Trail</p>
          <h1>Activity Log</h1>
          <p>The latest 200 recorded inventory changes.</p>
        </div>
      </div>
      <div className="workspace-card">
        {loading ? (
          <div className="loading">
            <LoaderCircle className="spin" /> Loading activity…
          </div>
        ) : error ? (
          <div className="form-error">{error}</div>
        ) : (
          <div className="activity-list">
            {rows.map((r) => (
              <article key={r.id}>
                <div className="activity-dot">
                  <Activity />
                </div>
                <div>
                  <strong>{r.action.replaceAll("_", " ")}</strong>
                  <p>
                    {r.inventory_items?.barcode} ·{" "}
                    {r.inventory_items?.item_name}
                  </p>
                </div>
                <time>{date(r.created_at)}</time>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function SettingsView() {
  const [settings, setSettings] = useState({
      store_name: "Narciso Geronimo Jewelry",
      session_timeout_minutes: 480,
      label_show_karat: true,
      label_show_grams: true,
    }),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    jsonFetch<{ settings: typeof settings }>("/api/settings")
      .then((d) => setSettings(d.settings))
      .catch((e) =>
        setMessage(e instanceof Error ? e.message : "Unable to load settings."),
      );
  }, []);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const form = Object.fromEntries(new FormData(e.currentTarget));
    const payload = {
      ...form,
      session_timeout_minutes: Number(form.session_timeout_minutes),
      label_show_karat: form.label_show_karat === "on",
      label_show_grams: form.label_show_grams === "on",
    };
    try {
      await jsonFetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setMessage("Settings saved.");
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Unable to save settings.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="simple-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Configuration</p>
          <h1>Settings</h1>
          <p>Manage store preferences and secure access.</p>
        </div>
      </div>
      <form
        key={`${settings.store_name}-${settings.session_timeout_minutes}-${settings.label_show_karat}-${settings.label_show_grams}`}
        className="workspace-card settings-form"
        onSubmit={save}
      >
        <h2>Application Settings</h2>
        <label>
          Store Name
          <input name="store_name" defaultValue={settings.store_name} />
        </label>
        <label>
          Session Timeout (minutes)
          <input
            name="session_timeout_minutes"
            type="number"
            min="5"
            max="10080"
            defaultValue={settings.session_timeout_minutes}
          />
        </label>
        <label>
          Default Barcode Format
          <input value="CODE128" disabled />
        </label>
        <fieldset className="label-settings">
          <legend>Barcode Label Contents</legend>
          <label>
            <input
              type="checkbox"
              name="label_show_karat"
              defaultChecked={settings.label_show_karat}
            />
            Show karat
          </label>
          <label>
            <input
              type="checkbox"
              name="label_show_grams"
              defaultChecked={settings.label_show_grams}
            />
            Show weight in grams
          </label>
        </fieldset>
        <hr />
        <h2>Change Passcode</h2>
        <p>Leave these fields blank to keep the current passcode.</p>
        <label>
          Current Passcode
          <input
            name="current_passcode"
            type="password"
            autoComplete="current-password"
          />
        </label>
        <label>
          New Passcode
          <input
            name="new_passcode"
            type="password"
            minLength={4}
            autoComplete="new-password"
          />
        </label>
        {message && (
          <div
            className={message === "Settings saved." ? "success" : "form-error"}
          >
            {message}
          </div>
        )}
        <button className="primary" disabled={busy}>
          {busy ? <LoaderCircle className="spin" /> : <Save />} Save Settings
        </button>
      </form>
    </section>
  );
}
