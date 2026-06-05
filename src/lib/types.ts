export type ArrKind = 'sonarr' | 'radarr';

export interface ArrService {
	id: number;
	name: string;
	kind: ArrKind;
	baseUrl: string;
	apiKey: string;
	webhookUrl: string;
	enabled: boolean;
	createdAt: string;
	updatedAt: string;
}

export type ScheduleMode = 'cron' | 'interval';
export type RunStatus = 'success' | 'skipped_empty' | 'error' | 'partial';

export interface Schedule {
	id: number;
	name: string;
	serviceIds: number[];
	mode: ScheduleMode;
	cronExpression: string | null;
	intervalDays: number | null;
	intervalTime: string | null;
	shortcut: string | null;
	windowDays: number;
	timezone: string;
	enabled: boolean;
	skipEmpty: boolean;
	lastRunAt: string | null;
	lastRunStatus: RunStatus | null;
	createdAt: string;
	updatedAt: string;
}

export type ReleaseType = 'cinema' | 'digital' | 'physical';

export interface CalendarItem {
	kind: ArrKind;
	/** UTC ISO timestamp when this item is "due" (airs / releases). */
	whenUtc: string;
	/** Series title (Sonarr) or movie title (Radarr). */
	title: string;
	/** "S02E05" for TV; undefined for movies. */
	episodeCode?: string;
	/** Episode title for TV. */
	episodeTitle?: string;
	/** Which Radarr release date was chosen, if applicable. */
	releaseType?: ReleaseType;
	/** True if the *arr instance already has the file. */
	hasFile: boolean;
}

export type PostTrigger = 'schedule' | 'manual';
export type PostStatus = 'success' | 'skipped_empty' | 'error';

export interface PostHistoryRow {
	id: number;
	ranAt: string;
	trigger: PostTrigger;
	scheduleId: number | null;
	scheduleName?: string | null;
	serviceId: number;
	serviceName?: string;
	windowDays: number;
	itemCount: number;
	status: PostStatus;
	httpStatus: number | null;
	errorMessage: string | null;
	previewJson: string | null;
}

export interface DiscordEmbedField {
	name: string;
	value: string;
	inline?: boolean;
}

export interface DiscordEmbed {
	title?: string;
	description?: string;
	color?: number;
	footer?: { text: string };
	timestamp?: string;
	fields?: DiscordEmbedField[];
}

export interface DiscordWebhookPayload {
	username?: string;
	avatar_url?: string;
	content?: string;
	embeds?: DiscordEmbed[];
}
