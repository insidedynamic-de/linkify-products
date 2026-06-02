/**
 * @file updates — Version status and deployment APIs
 */
import api from './client';

export interface VersionStatus {
  instance_id: number;
  current_version: string;
  latest_version: string;
  update_available: boolean;
  changelog: string;
  deployment_status: 'ok' | 'updating' | 'error' | 'unknown' | null;
  deployment_id: number | null;
  licserver_reachable: boolean;
}

export interface DeploymentEvent {
  ts: string;
  level: 'info' | 'warn' | 'error';
  msg: string;
}

export interface DeploymentPoll {
  deployment_id: number;
  instance_id: number;
  status: 'updating' | 'ok' | 'error' | 'unknown';
  from_version: string;
  target_version: string;
  triggered_by: string;
  reason: string;
  started_at: string;
  finished_at: string | null;
  events: DeploymentEvent[];
}

export const updatesApi = {
  getVersionStatus: (instanceId: number) =>
    api.get<VersionStatus>(`/admin/infra/instances/${instanceId}/version-status`),

  triggerUpdate: (instanceId: number, reason: string, targetVersion: string) =>
    api.post<{ success: boolean; deployment_id: number; message: string }>(
      `/admin/infra/instances/${instanceId}/update-v2`,
      { reason, target_version: targetVersion },
    ),

  pollDeployment: (instanceId: number, deploymentId: number) =>
    api.get<DeploymentPoll>(
      `/admin/infra/instances/${instanceId}/deployments/${deploymentId}`,
    ),
};
