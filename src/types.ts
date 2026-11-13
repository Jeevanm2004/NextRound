export type PipelineStage = 'Saved' | 'Applied' | 'Interview' | 'Offer';

export type WorkMode = 'Remote' | 'Hybrid' | 'On-site';

export type RoundOutcome = 'Scheduled' | 'Passed' | 'Waiting' | 'Completed';

export type AppScreen = 'pipeline' | 'schedule' | 'resumes' | 'analytics';

export type SortOption = 'updated' | 'payDesc' | 'nextRound' | 'followUp' | 'companyAsc';

export interface InterviewRound {
  id: string;
  title: string;
  scheduledAt: string; // ISO string YYYY-MM-DDTHH:mm
  interviewer: string;
  outcome: RoundOutcome;
  notes: string;
  prepChecklist?: string;
}

export interface JobDescriptionAnalysis {
  keySkills: string[];
  interviewQuestions: string[];
  followUpNote: string;
  analyzedAt: string;
  model: string;
}

export interface JobApplication {
  id: string;
  company: string;
  accentHex: string;
  role: string;
  stage: PipelineStage;
  payMin: number; // in $k USD
  payMax: number; // in $k USD
  equityNote?: string;
  workMode: WorkMode;
  location: string;
  resumeVersionId: string;
  totalRoundsPlanned: number;
  rounds: InterviewRound[];
  summaryNote: string;
  recruiterName?: string;
  jobUrl?: string;
  appliedAt?: string;
  followUpDate?: string; // YYYY-MM-DD
  jobDescription?: string;
  aiPrep?: JobDescriptionAnalysis;
  updatedAt: string;
  starred?: boolean;
}

export interface ResumeVersion {
  id: string;
  label: string;
  targetFocus: string;
  fileName: string;
  notes: string;
  updatedAt: string;
  isDefault?: boolean;
}

export interface NextRoundStore {
  applications: JobApplication[];
  resumes: ResumeVersion[];
}
