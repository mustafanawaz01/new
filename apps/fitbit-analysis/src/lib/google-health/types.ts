export interface UserIdentity {
  name?: string;
  legacyUserId?: string;
  healthUserId?: string;
}

export interface DataSourceInfo {
  platform?: string;
  device?: { displayName?: string; manufacturer?: string };
  recordingMethod?: string;
}

export interface DataPoint {
  name?: string;
  dataSource?: DataSourceInfo;
  oxygenSaturation?: unknown;
  dailyOxygenSaturation?: unknown;
  heartRate?: unknown;
  sleep?: unknown;
  respiratoryRate?: unknown;
}

export interface ListDataPointsResponse {
  dataPoints?: DataPoint[];
  nextPageToken?: string;
}
