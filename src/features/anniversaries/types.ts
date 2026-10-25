import type { Database } from '../../lib/database.types';

export type Anniversary = Database['public']['Tables']['anniversaries']['Row'];
export type AnniversaryKind = Anniversary['kind'];

export type AnniversaryDraft = {
  title: string;
  happenedOn: string;
  kind: AnniversaryKind;
  recurring: boolean;
  note: string;
};
