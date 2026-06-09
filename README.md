# Blueprint

개인 앱 개발자가 앱 아이디어와 기획을 관리하고 Markdown/TXT로 내보낼 수 있는 웹앱입니다.

## 실행

```bash
npm install
npm run dev
```

`.env`에 Supabase 값을 추가하세요.

```bash
VITE_SUPABASE_URL=https://xekwhewkdugighfxdxvh.supabase.co
VITE_SUPABASE_ANON_KEY=
```

## Supabase 테이블

앱은 이미 생성된 아래 테이블명을 사용합니다.

- `bp_apps`
- `bp_planning_items`
- `bp_memos`
- `bp_todos`
