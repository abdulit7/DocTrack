import { MasterDocConfig, CustomStatusConfig } from '../components/documents/DocConfigPage';

export interface DocConfigsData {
  masterDocs: MasterDocConfig[];
  statuses: CustomStatusConfig[];
}

export class DocConfigService {
  static async get(): Promise<DocConfigsData> {
    const res = await fetch('/api/doc-configs');
    if (!res.ok) {
      throw new Error(`Failed to fetch doc configurations: ${res.statusText}`);
    }
    const json = await res.json();
    if (!json.success) {
      throw new Error(json.error || 'Failed to fetch doc configs');
    }
    return json.data;
  }

  static async save(data: Partial<DocConfigsData>): Promise<DocConfigsData> {
    const res = await fetch('/api/doc-configs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw new Error(`Failed to save doc configurations: ${res.statusText}`);
    }
    const json = await res.json();
    if (!json.success) {
      throw new Error(json.error || 'Failed to save doc configs');
    }
    return json.data;
  }

  static async addMasterDoc(doc: { name: string; linkedStatuses?: string[] }): Promise<DocConfigsData> {
    const res = await fetch('/api/doc-configs/master-docs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc),
    });
    if (!res.ok) {
      throw new Error(`Failed to add master document: ${res.statusText}`);
    }
    const json = await res.json();
    if (!json.success) {
      throw new Error(json.error || 'Failed to add master doc');
    }
    return json.data;
  }

  static async updateMasterDoc(id: string, doc: { name?: string; linkedStatuses?: string[] }): Promise<DocConfigsData> {
    const res = await fetch(`/api/doc-configs/master-docs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc),
    });
    if (!res.ok) {
      throw new Error(`Failed to update master document: ${res.statusText}`);
    }
    const json = await res.json();
    if (!json.success) {
      throw new Error(json.error || 'Failed to update master doc');
    }
    return json.data;
  }

  static async deleteMasterDoc(id: string): Promise<DocConfigsData> {
    const res = await fetch(`/api/doc-configs/master-docs/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      throw new Error(`Failed to delete master document: ${res.statusText}`);
    }
    const json = await res.json();
    if (!json.success) {
      throw new Error(json.error || 'Failed to delete master doc');
    }
    return json.data;
  }
}
