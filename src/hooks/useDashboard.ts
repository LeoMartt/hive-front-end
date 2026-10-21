import { useEffect, useState } from "react";
import { dashboardApi, type ProjectDashboard } from "../api/resources/dashboard";
import { normalizeError, type ApiError } from "../api/apiError";
import { useMocks } from "../config/env";
import { useActivities } from "./useActivities";
import { useIssues } from "./useIssues";
import { useActivityLog } from "./useActivityLog";
import { useCurvaSData } from "./useCurvaSData";
import { computeIndicators, computeSpi } from "../utils/dashboardMetrics";
import { toLocalIsoString } from "../utils/activityIndicators";

export function useDashboard(projectId: string) {
  const mockActivities = useActivities(useMocks ? projectId : "");
  const mockIssues = useIssues(useMocks ? projectId : "");
  const recent = useActivityLog(mockActivities.activities, mockIssues.issues);
  const curve = useCurvaSData(mockActivities.activities);
  const [result, setResult] = useState<{ projectId: string; data: ProjectDashboard } | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const today = toLocalIsoString(new Date()).slice(0, 10);
  useEffect(() => {
    if (useMocks || !projectId) return;
    let cancelled = false;
    dashboardApi.get(projectId, today).then(data => {
      if (!cancelled) { setResult({ projectId, data }); setError(null); }
    }).catch(err => { if (!cancelled) setError(normalizeError(err)); });
    return () => { cancelled = true; };
  }, [projectId, today]);
  const mockData: ProjectDashboard = { activities: mockActivities.stats, issues: mockIssues.stats,
    spi: computeSpi(mockActivities.activities), indicators: computeIndicators(mockActivities.activities), curve, recent };
  return { data: useMocks ? mockData : result?.projectId === projectId ? result.data : null,
    loading: !useMocks && !error && result?.projectId !== projectId, error,
    mockActivities: mockActivities.activities, mockIssues: mockIssues.issues };
}
