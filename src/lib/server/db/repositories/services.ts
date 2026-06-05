import { getDb } from '$lib/server/db';
import type { ArrKind, ArrService } from '$lib/types';

interface Row {
	id: number;
	name: string;
	kind: ArrKind;
	base_url: string;
	api_key: string;
	webhook_url: string;
	enabled: number;
	created_at: string;
	updated_at: string;
}

function fromRow(r: Row): ArrService {
	return {
		id: r.id,
		name: r.name,
		kind: r.kind,
		baseUrl: r.base_url,
		apiKey: r.api_key,
		webhookUrl: r.webhook_url,
		enabled: r.enabled === 1,
		createdAt: r.created_at,
		updatedAt: r.updated_at
	};
}

export interface ServiceInput {
	name: string;
	kind: ArrKind;
	baseUrl: string;
	apiKey: string;
	webhookUrl: string;
	enabled?: boolean;
}

export const servicesRepo = {
	list(): ArrService[] {
		return getDb()
			.prepare<[], Row>('SELECT * FROM services ORDER BY id')
			.all()
			.map(fromRow);
	},

	get(id: number): ArrService | null {
		const r = getDb().prepare<[number], Row>('SELECT * FROM services WHERE id = ?').get(id);
		return r ? fromRow(r) : null;
	},

	create(input: ServiceInput): ArrService {
		const info = getDb()
			.prepare(
				`INSERT INTO services (name, kind, base_url, api_key, webhook_url, enabled)
				 VALUES (?, ?, ?, ?, ?, ?)`
			)
			.run(
				input.name,
				input.kind,
				input.baseUrl,
				input.apiKey,
				input.webhookUrl,
				input.enabled === false ? 0 : 1
			);
		return this.get(Number(info.lastInsertRowid))!;
	},

	update(id: number, patch: Partial<ServiceInput>): ArrService | null {
		const existing = this.get(id);
		if (!existing) return null;
		getDb()
			.prepare(
				`UPDATE services SET
					name        = COALESCE(@name, name),
					kind        = COALESCE(@kind, kind),
					base_url    = COALESCE(@baseUrl, base_url),
					api_key     = COALESCE(@apiKey, api_key),
					webhook_url = COALESCE(@webhookUrl, webhook_url),
					enabled     = COALESCE(@enabled, enabled),
					updated_at  = datetime('now')
				WHERE id = @id`
			)
			.run({
				id,
				name: patch.name ?? null,
				kind: patch.kind ?? null,
				baseUrl: patch.baseUrl ?? null,
				apiKey: patch.apiKey ?? null,
				webhookUrl: patch.webhookUrl ?? null,
				enabled: patch.enabled === undefined ? null : patch.enabled ? 1 : 0
			});
		return this.get(id);
	},

	remove(id: number): boolean {
		const r = getDb().prepare('DELETE FROM services WHERE id = ?').run(id);
		return r.changes > 0;
	}
};
