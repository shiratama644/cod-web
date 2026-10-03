export const meta = {
  name: "implement-task",
  description: "タスクを実装する標準ワークフロー。探索→計画→実装→検証の4フェーズで進める。",
  whenToUse: "新しい機能追加やバグ修正タスクを実装する時に使用。",
  phases: [
    { title: "Explore", detail: "コードベースの探索と現状把握" },
    { title: "Plan", detail: "実装計画の立案と設計判断" },
    { title: "Implement", detail: "実装とテスト作成" },
    { title: "Verify", detail: "検証とレビュー" }
  ]
};

const A = typeof args === "string" ? JSON.parse(args) : (args || {});
const task = A.task || A.taskId || "";

if (!task) {
  return {
    status: "error",
    message: "タスクIDまたはタスク内容を指定してください。例: { \"task\": \"AUTH-1: ログイン機能を追加\" }"
  };
}

const EXPLORE_SCHEMA = {
  type: "object",
  required: ["files", "summary"],
  properties: {
    files: {
      type: "array",
      items: { type: "string" },
      description: "関連ファイルのリスト"
    },
    summary: { type: "string", description: "現状の要約" }
  }
};

const PLAN_SCHEMA = {
  type: "object",
  required: ["scope", "prohibitions", "completionCriteria", "approach"],
  properties: {
    scope: {
      type: "array",
      items: { type: "string" },
      description: "変更範囲"
    },
    prohibitions: {
      type: "array",
      items: { type: "string" },
      description: "禁止事項"
    },
    completionCriteria: {
      type: "array",
      items: { type: "string" },
      description: "完了条件"
    },
    approach: { type: "string", description: "実装アプローチ" }
  }
};

const VERIFY_SCHEMA = {
  type: "object",
  required: ["checks", "passed"],
  properties: {
    checks: {
      type: "array",
      items: {
        type: "object",
        required: ["name", "status"],
        properties: {
          name: { type: "string" },
          status: { enum: ["pass", "fail", "skip"] },
          detail: { type: "string" }
        }
      }
    },
    passed: { type: "boolean" }
  }
};

// Phase 1: Explore
phase("Explore");

const exploration = await agent(
  `タスク「${task}」に関連するコードベースを探索してください。
- 関連ファイルのリストアップ
- 現状の実装の把握
- 依存関係の特定
- 既存の類似実装の発見

タスクの背景: ${task}
`,
  {
    label: "explore",
    phase: "Explore",
    schema: EXPLORE_SCHEMA,
    agentType: "Explore"
  }
);

if (!exploration || !exploration.files) {
  return {
    status: "blocked",
    message: "コードベースの探索に失敗しました。",
    exploration
  };
}

log(`探索完了: ${exploration.files.length} ファイルを発見`);

// Phase 2: Plan
phase("Plan");

const planning = await agent(
  `タスク「${task}」の実装計画を立案してください。

探索結果:
${JSON.stringify(exploration, null, 2)}

以下を含めて計画を作成:
- 変更範囲（触ってよいファイル・触ってはいけないファイル）
- 禁止事項（推測で埋めてはいけない仕様・破壊的変更）
- 完了条件（第三者がYes/No判定できる条件）
- 実装アプローチ（選択肢と推奨案）

AGENTS.md §6 のプロジェクト固有ルールと、docs/planning/_TEMPLATE.md の形式に従ってください。
`,
  {
    label: "plan",
    phase: "Plan",
    schema: PLAN_SCHEMA
  }
);

if (!planning || !planning.scope) {
  return {
    status: "blocked",
    message: "実装計画の立案に失敗しました。",
    exploration,
    planning
  };
}

log(`計画完了: ${planning.scope.length} ファイルを変更予定`);

// Phase 3: Implement
phase("Implement");

// 実装はメインエージェントが行うため、ここでは並列でテスト観点の洗い出しをサブエージェントに依頼
const testPerspectives = await parallel(
  ["unit", "integration", "e2e"].map((type) => () =>
    agent(
      `タスク「${task}」の ${type} テスト観点を洗い出してください。

計画:
${JSON.stringify(planning, null, 2)}

- どのようなテストが必要か
- 境界値・エッジケース
- モックが必要な外部依存
`,
      {
        label: `test-perspective:${type}`,
        phase: "Implement"
      }
    )
  )
);

log(`テスト観点の洗い出し完了: ${testPerspectives.filter(Boolean).length} タイプ`);

// Phase 4: Verify
phase("Verify");

const verification = await agent(
  `タスク「${task}」の実装が完了した想定で、検証チェックリストを作成してください。

計画:
${JSON.stringify(planning, null, 2)}

以下の観点でチェック:
- typecheck, lint, test:unit, build がPASSするか
- 意図しない差分が含まれていないか
- 機密情報が混入していないか
- ドキュメントが更新されているか（必要な場合）

AGENTS.md §3 と rules/04_verification.md に従ってください。
`,
  {
    label: "verify",
    phase: "Verify",
    schema: VERIFY_SCHEMA
  }
);

return {
  status: "ok",
  task,
  exploration,
  planning,
  testPerspectives: testPerspectives.filter(Boolean),
  verification,
  nextSteps: [
    "計画書を docs/planning/{TOPIC}_PLAN.md に作成",
    "docs/task-list.md にタスクを登録",
    "実装 → 検証 → コミット → ログ記録のサイクルで進める",
    "完了後に .agent/logs/ にログを作成"
  ]
};
