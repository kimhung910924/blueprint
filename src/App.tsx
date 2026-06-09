import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  LayoutDashboard,
  List,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
} from 'lucide-react';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import type {
  AppStatus,
  BlueprintApp,
  Memo,
  MemoTag,
  PlanningItem,
  PlanningStatus,
  TabKey,
  Todo,
} from './types';

const appStatuses: AppStatus[] = ['개발중', '검토중', '아이디어', '보류'];
const planningStatuses: PlanningStatus[] = ['확정', '고민중', '아이디어', '보류'];
const visibleKanbanStatuses: PlanningStatus[] = ['확정', '고민중', '아이디어'];
const memoTags: MemoTag[] = ['메모', '결정전아이디어', '나중에검토'];

const statusDot: Record<AppStatus, string> = {
  개발중: 'bg-violet-500',
  검토중: 'bg-emerald-500',
  보류: 'bg-amber-400',
  아이디어: 'bg-slate-400',
};

const planningBadge: Record<PlanningStatus, string> = {
  확정: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  고민중: 'bg-sky-50 text-sky-700 ring-sky-200',
  아이디어: 'bg-slate-100 text-slate-700 ring-slate-200',
  보류: 'bg-amber-50 text-amber-700 ring-amber-200',
};

const tagBadge: Record<MemoTag, string> = {
  메모: 'bg-slate-100 text-slate-700',
  결정전아이디어: 'bg-violet-50 text-violet-700',
  나중에검토: 'bg-amber-50 text-amber-700',
};

const tabs: { key: TabKey; label: string }[] = [
  { key: 'overview', label: '개요' },
  { key: 'planning', label: '기획' },
  { key: 'memos', label: '메모' },
  { key: 'todos', label: '할 일' },
];

function nowIso() {
  return new Date().toISOString();
}

function sortNewest<T extends { created_at: string }>(items: T[]) {
  return [...items].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function buildExport(app: BlueprintApp, planning: PlanningItem[], memos: Memo[], todos: Todo[]) {
  const planningByStatus = planningStatuses.reduce<Record<PlanningStatus, PlanningItem[]>>(
    (acc, status) => ({ ...acc, [status]: planning.filter((item) => item.status === status) }),
    { 확정: [], 고민중: [], 아이디어: [], 보류: [] },
  );

  return `# ${app.name}

## 개요
- 설명: ${app.description || '-'}
- 타겟: ${app.target || '-'}
- 상태: ${app.status}
- 수익화: ${app.monetization || '-'}

## 프로젝트 지침
${app.guidelines || '-'}

## 기획
### 확정
${planningByStatus.확정.map((item) => `- ${item.title}${item.body ? `\n  ${item.body}` : ''}`).join('\n') || '-'}

### 고민중
${planningByStatus.고민중.map((item) => `- ${item.title}${item.body ? `\n  ${item.body}` : ''}`).join('\n') || '-'}

### 아이디어
${planningByStatus.아이디어.map((item) => `- ${item.title}${item.body ? `\n  ${item.body}` : ''}`).join('\n') || '-'}

## 메모
${memos.map((memo) => `- [${memo.tag}] ${memo.text}`).join('\n') || '-'}

## 할 일
${todos.map((todo) => `- [${todo.done ? 'x' : ' '}] ${todo.text}`).join('\n') || '-'}
`;
}

function EnvMissing() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f7fb] px-5">
      <section className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-950">Blueprint</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Supabase 환경변수가 아직 설정되지 않았습니다. `.env` 파일에 `VITE_SUPABASE_URL`과
          `VITE_SUPABASE_ANON_KEY`를 넣으면 Google 로그인과 데이터 저장을 사용할 수 있습니다.
        </p>
        <pre className="mt-5 overflow-auto rounded-md bg-slate-950 p-4 text-xs text-slate-100">
          VITE_SUPABASE_URL=&#10;VITE_SUPABASE_ANON_KEY=
        </pre>
      </section>
    </main>
  );
}

function Login() {
  const [busy, setBusy] = useState(false);

  async function signIn() {
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      alert(error.message);
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f7fb] px-5">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-violet-700">Blueprint</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">앱 기획을 한곳에 정리하세요</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          앱 아이디어, 기획 항목, 메모, 할 일을 관리하고 AI에 붙여넣기 좋은 포맷으로 내보냅니다.
        </p>
        <button
          onClick={signIn}
          disabled={busy}
          className="mt-6 flex h-11 w-full items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Google로 로그인
        </button>
      </section>
    </main>
  );
}

function PlanningStatusSelect({
  value,
  onChange,
}: {
  value: PlanningStatus;
  onChange: (value: PlanningStatus) => void;
}) {
  return (
    <select
      value={value}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => onChange(event.target.value as PlanningStatus)}
      className={`h-7 rounded-full px-2 text-xs font-semibold ring-1 ${planningBadge[value]}`}
    >
      {planningStatuses.map((status) => (
        <option key={status} value={status}>
          {status}
        </option>
      ))}
    </select>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [apps, setApps] = useState<BlueprintApp[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [planningItems, setPlanningItems] = useState<PlanningItem[]>([]);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [query, setQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [planningView, setPlanningView] = useState<'kanban' | 'list'>('kanban');
  const [selectedPlanningId, setSelectedPlanningId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<PlanningStatus, boolean>>({
    확정: false,
    고민중: false,
    아이디어: false,
    보류: true,
  });
  const [memoFilter, setMemoFilter] = useState<'전체' | MemoTag>('전체');
  const [newMemoOpen, setNewMemoOpen] = useState(false);
  const [newMemoTag, setNewMemoTag] = useState<MemoTag>('메모');
  const [newMemoText, setNewMemoText] = useState('');
  const [newTodoText, setNewTodoText] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  const selectedApp = apps.find((app) => app.id === selectedAppId) ?? null;
  const selectedPlanning = planningItems.find((item) => item.id === selectedPlanningId) ?? null;

  const filteredApps = useMemo(
    () => apps.filter((app) => app.name.toLowerCase().includes(query.toLowerCase())),
    [apps, query],
  );

  const filteredMemos = useMemo(() => {
    const scoped = memoFilter === '전체' ? memos : memos.filter((memo) => memo.tag === memoFilter);
    return sortNewest(scoped);
  }, [memoFilter, memos]);

  const loadApps = useCallback(
    async (activeUser: User) => {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('bp_apps')
        .select('*')
        .eq('user_id', activeUser.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const nextApps = (data ?? []) as BlueprintApp[];
      setApps(nextApps);
      setSelectedAppId((current) => current ?? nextApps[0]?.id ?? null);
    },
    [],
  );

  const loadAppData = useCallback(async (appId: string) => {
    if (!supabase) return;
    setDataLoading(true);
    const [planningResult, memosResult, todosResult] = await Promise.all([
      supabase.from('bp_planning_items').select('*').eq('app_id', appId).order('created_at', { ascending: false }),
      supabase.from('bp_memos').select('*').eq('app_id', appId).order('created_at', { ascending: false }),
      supabase.from('bp_todos').select('*').eq('app_id', appId).order('created_at', { ascending: false }),
    ]);

    if (planningResult.error) throw planningResult.error;
    if (memosResult.error) throw memosResult.error;
    if (todosResult.error) throw todosResult.error;

    setPlanningItems((planningResult.data ?? []) as PlanningItem[]);
    setMemos((memosResult.data ?? []) as Memo[]);
    setTodos((todosResult.data ?? []) as Todo[]);
    setSelectedPlanningId(null);
    setDataLoading(false);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setAuthLoading(false);
      if (data.user) void loadApps(data.user).catch((error) => alert(error.message));
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
      if (session?.user) void loadApps(session.user).catch((error) => alert(error.message));
      if (!session?.user) {
        setApps([]);
        setSelectedAppId(null);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, [loadApps]);

  useEffect(() => {
    if (selectedAppId) void loadAppData(selectedAppId).catch((error) => alert(error.message));
  }, [loadAppData, selectedAppId]);

  async function addApp() {
    if (!supabase || !user) return;
    const draft = {
      user_id: user.id,
      name: '새 앱',
      description: '',
      target: '',
      status: '아이디어' as AppStatus,
      monetization: '',
      guidelines: '',
    };
    const { data, error } = await supabase.from('bp_apps').insert(draft).select('*').single();
    if (error) return alert(error.message);
    setApps((current) => [data as BlueprintApp, ...current]);
    setSelectedAppId((data as BlueprintApp).id);
    setActiveTab('overview');
    setMobileSidebar(false);
  }

  async function updateAppField<K extends keyof BlueprintApp>(key: K, value: BlueprintApp[K]) {
    if (!supabase || !selectedApp) return;
    setApps((current) => current.map((app) => (app.id === selectedApp.id ? { ...app, [key]: value } : app)));
    const { error } = await supabase.from('bp_apps').update({ [key]: value }).eq('id', selectedApp.id);
    if (error) alert(error.message);
  }

  async function addPlanningItem(status: PlanningStatus) {
    if (!supabase || !selectedApp) return;
    const draft = { app_id: selectedApp.id, title: '새 기획 항목', body: '', status };
    const { data, error } = await supabase.from('bp_planning_items').insert(draft).select('*').single();
    if (error) return alert(error.message);
    setPlanningItems((current) => [data as PlanningItem, ...current]);
    setSelectedPlanningId((data as PlanningItem).id);
  }

  async function updatePlanningItem(id: string, patch: Partial<PlanningItem>) {
    if (!supabase) return;
    setPlanningItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    const { error } = await supabase.from('bp_planning_items').update(patch).eq('id', id);
    if (error) alert(error.message);
  }

  async function addMemo() {
    if (!supabase || !selectedApp || !newMemoText.trim()) return;
    const { data, error } = await supabase
      .from('bp_memos')
      .insert({ app_id: selectedApp.id, tag: newMemoTag, text: newMemoText.trim() })
      .select('*')
      .single();
    if (error) return alert(error.message);
    setMemos((current) => [data as Memo, ...current]);
    setNewMemoText('');
    setNewMemoOpen(false);
  }

  async function addTodo() {
    if (!supabase || !selectedApp || !newTodoText.trim()) return;
    const { data, error } = await supabase
      .from('bp_todos')
      .insert({ app_id: selectedApp.id, text: newTodoText.trim(), done: false })
      .select('*')
      .single();
    if (error) return alert(error.message);
    setTodos((current) => [data as Todo, ...current]);
    setNewTodoText('');
  }

  async function toggleTodo(todo: Todo) {
    if (!supabase) return;
    setTodos((current) => current.map((item) => (item.id === todo.id ? { ...item, done: !item.done } : item)));
    const { error } = await supabase.from('bp_todos').update({ done: !todo.done }).eq('id', todo.id);
    if (error) alert(error.message);
  }

  function exportCurrent(format: 'md' | 'txt') {
    if (!selectedApp) return;
    const content = buildExport(selectedApp, planningItems, memos, todos);
    const safeName = selectedApp.name.replace(/[^\w가-힣-]+/g, '_') || 'blueprint';
    downloadFile(`${safeName}.${format}`, content, format === 'md' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8');
    setExportOpen(false);
  }

  if (!isSupabaseConfigured) return <EnvMissing />;
  if (authLoading) return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">불러오는 중...</div>;
  if (!user) return <Login />;

  const sidebar = (
    <aside className="flex h-full w-80 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
        <button onClick={() => setSidebarOpen(false)} className="hidden rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:block" title="사이드바 접기">
          <PanelLeftClose size={18} />
        </button>
        <div className="min-w-0 flex-1 px-2">
          <p className="truncate text-lg font-semibold text-slate-950">Blueprint</p>
        </div>
        <button onClick={() => void supabase?.auth.signOut()} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" title="로그아웃">
          <LogOut size={18} />
        </button>
      </div>
      <div className="space-y-3 border-b border-slate-200 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="앱 검색"
            className="h-10 w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-violet-400 focus:bg-white"
          />
        </div>
        <button onClick={addApp} className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white hover:bg-slate-800">
          <Plus size={16} /> 새 앱 추가
        </button>
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto p-3">
        {filteredApps.map((app) => (
          <button
            key={app.id}
            onClick={() => {
              setSelectedAppId(app.id);
              setMobileSidebar(false);
            }}
            className={`mb-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition ${
              app.id === selectedAppId ? 'bg-violet-50 text-violet-800' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${statusDot[app.status]}`} />
            <span className="truncate font-medium">{app.name}</span>
          </button>
        ))}
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#f6f7fb]">
      {sidebarOpen && <div className="hidden lg:block">{sidebar}</div>}
      {mobileSidebar && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <button className="absolute inset-0 bg-slate-950/30" onClick={() => setMobileSidebar(false)} />
          <div className="absolute inset-y-0 left-0">{sidebar}</div>
        </div>
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setMobileSidebar(true)} className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden" title="메뉴">
              <Menu size={19} />
            </button>
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="hidden rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:block" title="사이드바 펼치기">
                <PanelLeftOpen size={19} />
              </button>
            )}
            <div>
              <h1 className="truncate text-base font-semibold text-slate-950 sm:text-lg">{selectedApp?.name ?? '앱을 추가하세요'}</h1>
              {selectedApp && <p className="hidden text-xs text-slate-500 sm:block">{selectedApp.description || '한 줄 설명 없음'}</p>}
            </div>
          </div>
          {selectedApp && (
            <div className="relative">
              <button
                onClick={() => setExportOpen((value) => !value)}
                className="flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Download size={16} /> 내보내기
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-11 z-20 w-48 rounded-md border border-slate-200 bg-white p-1 shadow-lg">
                  <button onClick={() => exportCurrent('md')} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-100">
                    Markdown (.md)
                  </button>
                  <button onClick={() => exportCurrent('txt')} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-100">
                    TXT (.txt)
                  </button>
                </div>
              )}
            </div>
          )}
        </header>

        {!selectedApp ? (
          <section className="flex flex-1 items-center justify-center p-6 text-center">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">첫 앱을 추가하세요</h2>
              <p className="mt-2 text-sm text-slate-500">사이드바의 새 앱 추가 버튼으로 시작할 수 있습니다.</p>
            </div>
          </section>
        ) : (
          <section className="flex min-h-0 flex-1 flex-col">
            <nav className="flex shrink-0 gap-1 border-b border-slate-200 bg-white px-4">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key);
                    setSelectedPlanningId(null);
                  }}
                  className={`border-b-2 px-4 py-3 text-sm font-semibold ${
                    activeTab === tab.key ? 'border-violet-600 text-violet-700' : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
            <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">
              {dataLoading ? <p className="text-sm text-slate-500">불러오는 중...</p> : null}
              {activeTab === 'overview' && (
                <div className="mx-auto grid max-w-4xl gap-4">
                  <Field label="앱 이름">
                    <input value={selectedApp.name} onChange={(e) => void updateAppField('name', e.target.value)} className="input" />
                  </Field>
                  <Field label="한 줄 설명">
                    <input value={selectedApp.description} onChange={(e) => void updateAppField('description', e.target.value)} className="input" />
                  </Field>
                  <Field label="타겟 사용자">
                    <input value={selectedApp.target} onChange={(e) => void updateAppField('target', e.target.value)} className="input" />
                  </Field>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="상태">
                      <select value={selectedApp.status} onChange={(e) => void updateAppField('status', e.target.value as AppStatus)} className="input">
                        {appStatuses.map((status) => (
                          <option key={status}>{status}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="수익화 방향">
                      <input value={selectedApp.monetization} onChange={(e) => void updateAppField('monetization', e.target.value)} className="input" />
                    </Field>
                  </div>
                  <Field label="프로젝트 지침">
                    <textarea value={selectedApp.guidelines} onChange={(e) => void updateAppField('guidelines', e.target.value)} className="textarea min-h-52" />
                  </Field>
                </div>
              )}

              {activeTab === 'planning' && (
                selectedPlanning ? (
                  <PlanningDetail item={selectedPlanning} onBack={() => setSelectedPlanningId(null)} onChange={updatePlanningItem} />
                ) : (
                  <div className="mx-auto max-w-7xl">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-slate-950">기획</h2>
                      <div className="flex rounded-md border border-slate-200 bg-white p-1">
                        <button onClick={() => setPlanningView('kanban')} className={`rounded px-3 py-1.5 ${planningView === 'kanban' ? 'bg-slate-950 text-white' : 'text-slate-500'}`} title="칸반뷰">
                          <LayoutDashboard size={16} />
                        </button>
                        <button onClick={() => setPlanningView('list')} className={`rounded px-3 py-1.5 ${planningView === 'list' ? 'bg-slate-950 text-white' : 'text-slate-500'}`} title="리스트뷰">
                          <List size={16} />
                        </button>
                      </div>
                    </div>
                    {planningView === 'kanban' ? (
                      <div className="grid gap-4 lg:grid-cols-3">
                        {visibleKanbanStatuses.map((status) => (
                          <section key={status} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <h3 className="mb-3 flex items-center justify-between text-sm font-semibold text-slate-700">
                              {status}
                              <span>{planningItems.filter((item) => item.status === status).length}</span>
                            </h3>
                            <div className="space-y-2">
                              {planningItems.filter((item) => item.status === status).map((item) => (
                                <PlanningCard key={item.id} item={item} onOpen={() => setSelectedPlanningId(item.id)} onStatus={(next) => updatePlanningItem(item.id, { status: next })} />
                              ))}
                            </div>
                            <button onClick={() => addPlanningItem(status)} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-white text-sm font-medium text-slate-500 hover:text-slate-900">
                              <Plus size={15} /> 추가
                            </button>
                          </section>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {planningStatuses.map((status) => {
                          const items = planningItems.filter((item) => item.status === status);
                          const collapsed = collapsedGroups[status];
                          return (
                            <section key={status} className="rounded-lg border border-slate-200 bg-white">
                              <button onClick={() => setCollapsedGroups((current) => ({ ...current, [status]: !collapsed }))} className="flex w-full items-center justify-between px-4 py-3 text-left">
                                <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                                  {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />} {status} ({items.length})
                                </span>
                              </button>
                              {!collapsed && (
                                <div className="divide-y divide-slate-100 border-t border-slate-100">
                                  {items.map((item) => (
                                    <button key={item.id} onClick={() => setSelectedPlanningId(item.id)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50">
                                      <span className="truncate text-sm font-medium text-slate-800">{item.title}</span>
                                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${planningBadge[item.status]}`}>{item.status}</span>
                                    </button>
                                  ))}
                                  <button onClick={() => addPlanningItem(status)} className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-slate-500 hover:text-slate-900">
                                    <Plus size={15} /> 추가
                                  </button>
                                </div>
                              )}
                            </section>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )
              )}

              {activeTab === 'memos' && (
                <div className="mx-auto max-w-4xl">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      {(['전체', ...memoTags] as const).map((tag) => (
                        <button key={tag} onClick={() => setMemoFilter(tag)} className={`rounded-full px-3 py-1.5 text-sm font-medium ${memoFilter === tag ? 'bg-slate-950 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>
                          {tag}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setNewMemoOpen(true)} className="flex h-9 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white">
                      <Plus size={16} /> 새 메모
                    </button>
                  </div>
                  {newMemoOpen && (
                    <section className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
                      <select value={newMemoTag} onChange={(e) => setNewMemoTag(e.target.value as MemoTag)} className="input mb-3">
                        {memoTags.map((tag) => (
                          <option key={tag}>{tag}</option>
                        ))}
                      </select>
                      <textarea value={newMemoText} onChange={(e) => setNewMemoText(e.target.value)} className="textarea min-h-28" />
                      <div className="mt-3 flex justify-end gap-2">
                        <button onClick={() => setNewMemoOpen(false)} className="btn-muted">취소</button>
                        <button onClick={addMemo} className="btn-primary">저장</button>
                      </div>
                    </section>
                  )}
                  <div className="space-y-2">
                    {filteredMemos.map((memo) => (
                      <article key={memo.id} className="rounded-lg border border-slate-200 bg-white p-4">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${tagBadge[memo.tag]}`}>{memo.tag}</span>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{memo.text}</p>
                      </article>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'todos' && (
                <div className="mx-auto max-w-3xl space-y-5">
                  <div className="flex gap-2">
                    <input value={newTodoText} onChange={(e) => setNewTodoText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTodo()} placeholder="할 일 추가" className="input" />
                    <button onClick={addTodo} className="btn-primary shrink-0">
                      <Plus size={16} /> 추가
                    </button>
                  </div>
                  <TodoSection title="진행중" todos={todos.filter((todo) => !todo.done)} onToggle={toggleTodo} />
                  <TodoSection title="완료" todos={todos.filter((todo) => todo.done)} onToggle={toggleTodo} />
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function PlanningCard({
  item,
  onOpen,
  onStatus,
}: {
  item: PlanningItem;
  onOpen: () => void;
  onStatus: (status: PlanningStatus) => void;
}) {
  return (
    <button onClick={onOpen} className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-slate-300">
      <p className="truncate text-sm font-semibold text-slate-900">{item.title}</p>
      <div className="mt-4">
        <PlanningStatusSelect value={item.status} onChange={onStatus} />
      </div>
    </button>
  );
}

function PlanningDetail({
  item,
  onBack,
  onChange,
}: {
  item: PlanningItem;
  onBack: () => void;
  onChange: (id: string, patch: Partial<PlanningItem>) => void;
}) {
  return (
    <div className="mx-auto max-w-4xl">
      <button onClick={onBack} className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950">
        <ArrowLeft size={16} /> 뒤로가기
      </button>
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <input value={item.title} onChange={(e) => onChange(item.id, { title: e.target.value })} className="w-full border-0 bg-transparent text-2xl font-semibold text-slate-950 outline-none" />
        <div className="mt-4">
          <PlanningStatusSelect value={item.status} onChange={(status) => onChange(item.id, { status })} />
        </div>
        <textarea value={item.body} onChange={(e) => onChange(item.id, { body: e.target.value })} className="textarea mt-5 min-h-96" />
      </section>
    </div>
  );
}

function TodoSection({ title, todos, onToggle }: { title: string; todos: Todo[]; onToggle: (todo: Todo) => void }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">
        {title} ({todos.length})
      </h2>
      <div className="divide-y divide-slate-100">
        {todos.map((todo) => (
          <button key={todo.id} onClick={() => onToggle(todo)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50">
            <span className={`flex h-5 w-5 items-center justify-center rounded border ${todo.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300'}`}>
              {todo.done && <Check size={14} />}
            </span>
            <span className={`text-sm ${todo.done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{todo.text}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
