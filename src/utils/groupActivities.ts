import type { Activity, FlatActivityGroup, ModuleGroup } from "../types/activity";
import { ACTIVITY_STATUS_LABELS } from "./activityIndicators";

export function groupByModuleProcess(activities: Activity[]): ModuleGroup[] {
  const moduleOrder: string[] = [];
  const moduleMap = new Map<string, Map<string, Activity[]>>();

  for (const activity of activities) {
    if (!moduleMap.has(activity.module)) {
      moduleMap.set(activity.module, new Map());
      moduleOrder.push(activity.module);
    }
    const processMap = moduleMap.get(activity.module)!;
    if (!processMap.has(activity.process)) {
      processMap.set(activity.process, []);
    }
    processMap.get(activity.process)!.push(activity);
  }

  return moduleOrder.map((moduleName) => {
    const processMap = moduleMap.get(moduleName)!;
    return {
      module: moduleName,
      processes: Array.from(processMap.entries()).map(([processName, processActivities]) => ({
        process: processName,
        activities: processActivities,
      })),
    };
  });
}

export function groupByTester(activities: Activity[]): FlatActivityGroup[] {
  return groupByKey(activities, (activity) => activity.tester);
}

export function groupByStatus(activities: Activity[]): FlatActivityGroup[] {
  return groupByKey(activities, (activity) => ACTIVITY_STATUS_LABELS[activity.status]);
}

function groupByKey(activities: Activity[], getKey: (activity: Activity) => string): FlatActivityGroup[] {
  const order: string[] = [];
  const map = new Map<string, Activity[]>();

  for (const activity of activities) {
    const key = getKey(activity);
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key)!.push(activity);
  }

  return order.map((key) => ({ key, label: key, activities: map.get(key)! }));
}
