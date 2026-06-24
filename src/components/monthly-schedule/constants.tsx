import { AlertTriangle, Filter, Wrench } from "lucide-react";
import { type ReactNode } from "react";

// Hebrew weekday letters, Sunday→Saturday, for the calendar grid header.
export const DAY_HEADERS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

// Hebrew month names, index 0 = January.
export const MONTH_NAMES = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר",
];

// Icon + color treatment per job type, keyed by JobType.
export const typeIcons: Record<string, ReactNode> = {
  filter_replacement: <Filter className='w-3 h-3' />,
  malfunction: <AlertTriangle className='w-3 h-3' />,
  installation: <Wrench className='w-3 h-3' />,
};

export const typeColors: Record<string, string> = {
  filter_replacement: "bg-info/15 text-info border-info/30",
  malfunction: "bg-destructive/15 text-destructive border-destructive/30",
  installation: "bg-secondary/15 text-secondary border-secondary/30",
};
