export type BlockType = "work" | "health" | "social" | "anchor" | "break";
export type BlockStatus = "pending" | "active" | "completed" | "skipped";
export type ChatRole = "user" | "assistant";

export type ThreePs = {
  play: string;
  power: string;
  people: string;
};

export type DayRow = {
  id: string;
  user_id: string;
  date: string;
  daily_adventure: string | null;
  side_quests: string[] | null;
  coaching_message: string | null;
  coaching_priority_flag: string | null;
  receipt_generated: boolean | null;
  receipt_data: Record<string, unknown> | null;
  created_at: string;
};

export type BlockRow = {
  id: string;
  day_id: string;
  user_id: string;
  task_name: string;
  start_time: string;
  end_time: string;
  type: BlockType;
  status: BlockStatus;
  accountability_buddy: string | null;
  three_ps: ThreePs | null;
  micro_actions: string[] | null;
  stuck_flag: boolean | null;
  created_at: string;
};

export type ChatMessageRow = {
  id: string;
  user_id: string;
  day_id: string | null;
  role: ChatRole;
  content: string;
  created_at: string;
};

export type GeminiBlockPayload = {
  taskName: string;
  startTime: string;
  endTime: string;
  type?: BlockType;
};

export type GeminiChatResult = {
  assistantMessage: string;
  scheduleComplete?: boolean;
  /** True if the JSON had scheduleComplete before we normalize missing adventure/side quests */
  modelDeclaredScheduleComplete?: boolean;
  coachingPriorityFlag?: string | null;
  dailyAdventure?: string | null;
  sideQuests?: string[] | null;
  coachingMessage?: string | null;
  blocks?: GeminiBlockPayload[] | null;
};
