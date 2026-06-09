export type AppStatus = '개발중' | '검토중' | '보류' | '아이디어';
export type PlanningStatus = '확정' | '고민중' | '아이디어' | '보류';
export type MemoTag = '메모' | '결정전아이디어' | '나중에검토';
export type TabKey = 'overview' | 'planning' | 'memos' | 'todos';

export type BlueprintApp = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  target: string;
  status: AppStatus;
  monetization: string;
  guidelines: string;
  created_at: string;
};

export type PlanningItem = {
  id: string;
  app_id: string;
  title: string;
  body: string;
  status: PlanningStatus;
  created_at: string;
};

export type Memo = {
  id: string;
  app_id: string;
  tag: MemoTag;
  text: string;
  created_at: string;
};

export type Todo = {
  id: string;
  app_id: string;
  text: string;
  done: boolean;
  created_at: string;
};
