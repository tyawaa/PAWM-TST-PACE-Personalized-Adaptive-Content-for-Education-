import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import type { NavigatorScreenParams } from '@react-navigation/native';
import type { ReactNode } from 'react';

export type User = { id: string; username: string; name: string };
export type Session = { access_token: string; token_type: string; expires_in: number; user: User };
export type Credentials = { username: string; password: string };
export type Registration = Credentials & { name: string };
export type FormErrors = { username: string | null; password: string | null; name: string | null };
export type Concept = {
  id: string;
  title: string;
  topic: string;
  skill: string;
  grade: number;
  prerequisite_id: string | null;
  position: number;
};
export type Material = {
  id: string;
  concept_id: string;
  title: string;
  content: string;
  version: number;
  source: string;
  license: string;
  reviewed: boolean;
};
export type Progress = {
  concept_id: string;
  title: string;
  status: 'not_assessed' | 'needs_practice' | 'mastered';
  score: number | null;
  assessment_id: string | null;
  updated_at: string | null;
  missing_prerequisites: string[];
};
export type Recommendation = {
  concept_id: string;
  title: string;
  action: 'practice' | 'initial_assessment';
  reason: string;
  materials_path: string;
};
export type Recommendations = {
  rule_version: string;
  all_mastered: boolean;
  items: Recommendation[];
};
export type Question = { id: string; prompt: string; options: string[]; version: number };
export type Answer = { question_id: string; selected_index: number };
export type Feedback = { question_id: string; correct: boolean; explanation: string };
export type AssessmentResult = {
  assessment_id: string;
  concept_id: string;
  correct: number;
  total: number;
  score: number;
  status: 'needs_practice' | 'mastered';
  rule_version: string;
  submitted_at: string;
  feedback: Feedback[];
};
export type Assessment = {
  id: string;
  concept_id: string;
  created_at: string;
  status: 'in_progress' | 'submitted';
  rule_version: string;
  questions: Question[];
  result: AssessmentResult | null;
};
export type LearningData = {
  concepts: Concept[];
  progress: Progress[];
  recommendations: Recommendations;
};
export type LearningLoad = {
  data: LearningData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
};
export type MaterialsResponse = { items: Material[]; notice: string };
export type AuthState = {
  session: Session | null;
  notice: string | null;
  signIn: (values: Credentials) => Promise<void>;
  register: (values: Registration) => Promise<void>;
  signOut: () => void;
};
export type ChildrenProps = { children: ReactNode };
export type TabParamList = {
  Beranda: undefined;
  Belajar: undefined;
  Progres: undefined;
  Profil: undefined;
};
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: NavigatorScreenParams<TabParamList> | undefined;
  Concept: { concept: Concept };
  Assessment: { assessment: Assessment };
  Result: { result: AssessmentResult; questions: Question[] };
};
export type AppNavigation = NativeStackNavigationProp<RootStackParamList>;
export type ConceptScreenProps = NativeStackScreenProps<RootStackParamList, 'Concept'>;
export type AssessmentScreenProps = NativeStackScreenProps<RootStackParamList, 'Assessment'>;
export type ResultScreenProps = NativeStackScreenProps<RootStackParamList, 'Result'>;
