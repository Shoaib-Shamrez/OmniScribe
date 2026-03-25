export type AppState = "idle" | "uploading" | "processing" | "done" | "error";

export interface Segment {
  start: number;
  end: number;
  text: string;
}

export interface StatusResponse {
  status: "queued" | "processing" | "done" | "failed";
  transcription?: string;
  segments?: Segment[];
  error?: string;
}