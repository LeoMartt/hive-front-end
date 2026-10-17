import type { Activity } from "../types/activity";

export function releaseReadyActivities(activities: Activity[]): Activity[] {
  const byId = new Map(activities.map((activity) => [activity.id, activity]));
  return activities.map((activity) => {
    if (activity.status !== "aguardando") return activity;
    const resolved = activity.predecessors.every((id) => {
      const predecessor = byId.get(id);
      return predecessor?.status === "concluido" || predecessor?.status === "cancelado";
    });
    return resolved ? { ...activity, status: "liberado" } : activity;
  });
}
