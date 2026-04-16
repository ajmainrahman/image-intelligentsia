import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import type { ActivityItem, CreateGoalBody, CreateJobBody, CreateProgressBody, CreateReminderBody, CreateRoadmapItemBody, DashboardSummary, DbHealthStatus, Goal, HealthStatus, Job, ProgressEntry, Reminder, RoadmapItem, SkillFrequency } from "./api.schemas";
import { customFetch } from "../custom-fetch";
import type { ErrorType, BodyType } from "../custom-fetch";
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
/**
 * @summary Health check
 */
export declare const getHealthCheckUrl: () => string;
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Database connectivity check
 */
export declare const getDbHealthCheckUrl: () => string;
export declare const dbHealthCheck: (options?: RequestInit) => Promise<DbHealthStatus>;
export declare const getDbHealthCheckQueryKey: () => readonly ["/api/healthz/db"];
export declare const getDbHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof dbHealthCheck>>, TError = ErrorType<DbHealthStatus>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof dbHealthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof dbHealthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type DbHealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof dbHealthCheck>>>;
export type DbHealthCheckQueryError = ErrorType<DbHealthStatus>;
/**
 * @summary Database connectivity check
 */
export declare function useDbHealthCheck<TData = Awaited<ReturnType<typeof dbHealthCheck>>, TError = ErrorType<DbHealthStatus>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof dbHealthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary List all career goals
 */
export declare const getListGoalsUrl: () => string;
export declare const listGoals: (options?: RequestInit) => Promise<Goal[]>;
export declare const getListGoalsQueryKey: () => readonly ["/api/goals"];
export declare const getListGoalsQueryOptions: <TData = Awaited<ReturnType<typeof listGoals>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listGoals>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listGoals>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListGoalsQueryResult = NonNullable<Awaited<ReturnType<typeof listGoals>>>;
export type ListGoalsQueryError = ErrorType<unknown>;
/**
 * @summary List all career goals
 */
export declare function useListGoals<TData = Awaited<ReturnType<typeof listGoals>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listGoals>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a career goal
 */
export declare const getCreateGoalUrl: () => string;
export declare const createGoal: (createGoalBody: CreateGoalBody, options?: RequestInit) => Promise<Goal>;
export declare const getCreateGoalMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createGoal>>, TError, {
        data: BodyType<CreateGoalBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createGoal>>, TError, {
    data: BodyType<CreateGoalBody>;
}, TContext>;
export type CreateGoalMutationResult = NonNullable<Awaited<ReturnType<typeof createGoal>>>;
export type CreateGoalMutationBody = BodyType<CreateGoalBody>;
export type CreateGoalMutationError = ErrorType<unknown>;
/**
 * @summary Create a career goal
 */
export declare const useCreateGoal: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createGoal>>, TError, {
        data: BodyType<CreateGoalBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createGoal>>, TError, {
    data: BodyType<CreateGoalBody>;
}, TContext>;
/**
 * @summary Get a goal by ID
 */
export declare const getGetGoalUrl: (id: number) => string;
export declare const getGoal: (id: number, options?: RequestInit) => Promise<Goal>;
export declare const getGetGoalQueryKey: (id: number) => readonly [`/api/goals/${number}`];
export declare const getGetGoalQueryOptions: <TData = Awaited<ReturnType<typeof getGoal>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getGoal>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getGoal>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetGoalQueryResult = NonNullable<Awaited<ReturnType<typeof getGoal>>>;
export type GetGoalQueryError = ErrorType<unknown>;
/**
 * @summary Get a goal by ID
 */
export declare function useGetGoal<TData = Awaited<ReturnType<typeof getGoal>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getGoal>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update a goal
 */
export declare const getUpdateGoalUrl: (id: number) => string;
export declare const updateGoal: (id: number, createGoalBody: CreateGoalBody, options?: RequestInit) => Promise<Goal>;
export declare const getUpdateGoalMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateGoal>>, TError, {
        id: number;
        data: BodyType<CreateGoalBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateGoal>>, TError, {
    id: number;
    data: BodyType<CreateGoalBody>;
}, TContext>;
export type UpdateGoalMutationResult = NonNullable<Awaited<ReturnType<typeof updateGoal>>>;
export type UpdateGoalMutationBody = BodyType<CreateGoalBody>;
export type UpdateGoalMutationError = ErrorType<unknown>;
/**
 * @summary Update a goal
 */
export declare const useUpdateGoal: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateGoal>>, TError, {
        id: number;
        data: BodyType<CreateGoalBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateGoal>>, TError, {
    id: number;
    data: BodyType<CreateGoalBody>;
}, TContext>;
/**
 * @summary Delete a goal
 */
export declare const getDeleteGoalUrl: (id: number) => string;
export declare const deleteGoal: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteGoalMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteGoal>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteGoal>>, TError, {
    id: number;
}, TContext>;
export type DeleteGoalMutationResult = NonNullable<Awaited<ReturnType<typeof deleteGoal>>>;
export type DeleteGoalMutationError = ErrorType<unknown>;
/**
 * @summary Delete a goal
 */
export declare const useDeleteGoal: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteGoal>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteGoal>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary List progress entries
 */
export declare const getListProgressUrl: () => string;
export declare const listProgress: (options?: RequestInit) => Promise<ProgressEntry[]>;
export declare const getListProgressQueryKey: () => readonly ["/api/progress"];
export declare const getListProgressQueryOptions: <TData = Awaited<ReturnType<typeof listProgress>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listProgress>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listProgress>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListProgressQueryResult = NonNullable<Awaited<ReturnType<typeof listProgress>>>;
export type ListProgressQueryError = ErrorType<unknown>;
/**
 * @summary List progress entries
 */
export declare function useListProgress<TData = Awaited<ReturnType<typeof listProgress>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listProgress>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Log a progress entry
 */
export declare const getCreateProgressUrl: () => string;
export declare const createProgress: (createProgressBody: CreateProgressBody, options?: RequestInit) => Promise<ProgressEntry>;
export declare const getCreateProgressMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createProgress>>, TError, {
        data: BodyType<CreateProgressBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createProgress>>, TError, {
    data: BodyType<CreateProgressBody>;
}, TContext>;
export type CreateProgressMutationResult = NonNullable<Awaited<ReturnType<typeof createProgress>>>;
export type CreateProgressMutationBody = BodyType<CreateProgressBody>;
export type CreateProgressMutationError = ErrorType<unknown>;
/**
 * @summary Log a progress entry
 */
export declare const useCreateProgress: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createProgress>>, TError, {
        data: BodyType<CreateProgressBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createProgress>>, TError, {
    data: BodyType<CreateProgressBody>;
}, TContext>;
/**
 * @summary Update a progress entry
 */
export declare const getUpdateProgressUrl: (id: number) => string;
export declare const updateProgress: (id: number, createProgressBody: CreateProgressBody, options?: RequestInit) => Promise<ProgressEntry>;
export declare const getUpdateProgressMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateProgress>>, TError, {
        id: number;
        data: BodyType<CreateProgressBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateProgress>>, TError, {
    id: number;
    data: BodyType<CreateProgressBody>;
}, TContext>;
export type UpdateProgressMutationResult = NonNullable<Awaited<ReturnType<typeof updateProgress>>>;
export type UpdateProgressMutationBody = BodyType<CreateProgressBody>;
export type UpdateProgressMutationError = ErrorType<unknown>;
/**
 * @summary Update a progress entry
 */
export declare const useUpdateProgress: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateProgress>>, TError, {
        id: number;
        data: BodyType<CreateProgressBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateProgress>>, TError, {
    id: number;
    data: BodyType<CreateProgressBody>;
}, TContext>;
/**
 * @summary Delete a progress entry
 */
export declare const getDeleteProgressUrl: (id: number) => string;
export declare const deleteProgress: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteProgressMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteProgress>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteProgress>>, TError, {
    id: number;
}, TContext>;
export type DeleteProgressMutationResult = NonNullable<Awaited<ReturnType<typeof deleteProgress>>>;
export type DeleteProgressMutationError = ErrorType<unknown>;
/**
 * @summary Delete a progress entry
 */
export declare const useDeleteProgress: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteProgress>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteProgress>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary List roadmap milestones
 */
export declare const getListRoadmapItemsUrl: () => string;
export declare const listRoadmapItems: (options?: RequestInit) => Promise<RoadmapItem[]>;
export declare const getListRoadmapItemsQueryKey: () => readonly ["/api/roadmap"];
export declare const getListRoadmapItemsQueryOptions: <TData = Awaited<ReturnType<typeof listRoadmapItems>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listRoadmapItems>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listRoadmapItems>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListRoadmapItemsQueryResult = NonNullable<Awaited<ReturnType<typeof listRoadmapItems>>>;
export type ListRoadmapItemsQueryError = ErrorType<unknown>;
/**
 * @summary List roadmap milestones
 */
export declare function useListRoadmapItems<TData = Awaited<ReturnType<typeof listRoadmapItems>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listRoadmapItems>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a roadmap milestone
 */
export declare const getCreateRoadmapItemUrl: () => string;
export declare const createRoadmapItem: (createRoadmapItemBody: CreateRoadmapItemBody, options?: RequestInit) => Promise<RoadmapItem>;
export declare const getCreateRoadmapItemMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createRoadmapItem>>, TError, {
        data: BodyType<CreateRoadmapItemBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createRoadmapItem>>, TError, {
    data: BodyType<CreateRoadmapItemBody>;
}, TContext>;
export type CreateRoadmapItemMutationResult = NonNullable<Awaited<ReturnType<typeof createRoadmapItem>>>;
export type CreateRoadmapItemMutationBody = BodyType<CreateRoadmapItemBody>;
export type CreateRoadmapItemMutationError = ErrorType<unknown>;
/**
 * @summary Create a roadmap milestone
 */
export declare const useCreateRoadmapItem: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createRoadmapItem>>, TError, {
        data: BodyType<CreateRoadmapItemBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createRoadmapItem>>, TError, {
    data: BodyType<CreateRoadmapItemBody>;
}, TContext>;
/**
 * @summary Update a roadmap milestone
 */
export declare const getUpdateRoadmapItemUrl: (id: number) => string;
export declare const updateRoadmapItem: (id: number, createRoadmapItemBody: CreateRoadmapItemBody, options?: RequestInit) => Promise<RoadmapItem>;
export declare const getUpdateRoadmapItemMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateRoadmapItem>>, TError, {
        id: number;
        data: BodyType<CreateRoadmapItemBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateRoadmapItem>>, TError, {
    id: number;
    data: BodyType<CreateRoadmapItemBody>;
}, TContext>;
export type UpdateRoadmapItemMutationResult = NonNullable<Awaited<ReturnType<typeof updateRoadmapItem>>>;
export type UpdateRoadmapItemMutationBody = BodyType<CreateRoadmapItemBody>;
export type UpdateRoadmapItemMutationError = ErrorType<unknown>;
/**
 * @summary Update a roadmap milestone
 */
export declare const useUpdateRoadmapItem: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateRoadmapItem>>, TError, {
        id: number;
        data: BodyType<CreateRoadmapItemBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateRoadmapItem>>, TError, {
    id: number;
    data: BodyType<CreateRoadmapItemBody>;
}, TContext>;
/**
 * @summary Delete a roadmap milestone
 */
export declare const getDeleteRoadmapItemUrl: (id: number) => string;
export declare const deleteRoadmapItem: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteRoadmapItemMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteRoadmapItem>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteRoadmapItem>>, TError, {
    id: number;
}, TContext>;
export type DeleteRoadmapItemMutationResult = NonNullable<Awaited<ReturnType<typeof deleteRoadmapItem>>>;
export type DeleteRoadmapItemMutationError = ErrorType<unknown>;
/**
 * @summary Delete a roadmap milestone
 */
export declare const useDeleteRoadmapItem: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteRoadmapItem>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteRoadmapItem>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary List saved job descriptions
 */
export declare const getListJobsUrl: () => string;
export declare const listJobs: (options?: RequestInit) => Promise<Job[]>;
export declare const getListJobsQueryKey: () => readonly ["/api/jobs"];
export declare const getListJobsQueryOptions: <TData = Awaited<ReturnType<typeof listJobs>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listJobs>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listJobs>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListJobsQueryResult = NonNullable<Awaited<ReturnType<typeof listJobs>>>;
export type ListJobsQueryError = ErrorType<unknown>;
/**
 * @summary List saved job descriptions
 */
export declare function useListJobs<TData = Awaited<ReturnType<typeof listJobs>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listJobs>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Save a job description
 */
export declare const getCreateJobUrl: () => string;
export declare const createJob: (createJobBody: CreateJobBody, options?: RequestInit) => Promise<Job>;
export declare const getCreateJobMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createJob>>, TError, {
        data: BodyType<CreateJobBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createJob>>, TError, {
    data: BodyType<CreateJobBody>;
}, TContext>;
export type CreateJobMutationResult = NonNullable<Awaited<ReturnType<typeof createJob>>>;
export type CreateJobMutationBody = BodyType<CreateJobBody>;
export type CreateJobMutationError = ErrorType<unknown>;
/**
 * @summary Save a job description
 */
export declare const useCreateJob: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createJob>>, TError, {
        data: BodyType<CreateJobBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createJob>>, TError, {
    data: BodyType<CreateJobBody>;
}, TContext>;
/**
 * @summary Get job details
 */
export declare const getGetJobUrl: (id: number) => string;
export declare const getJob: (id: number, options?: RequestInit) => Promise<Job>;
export declare const getGetJobQueryKey: (id: number) => readonly [`/api/jobs/${number}`];
export declare const getGetJobQueryOptions: <TData = Awaited<ReturnType<typeof getJob>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getJob>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getJob>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetJobQueryResult = NonNullable<Awaited<ReturnType<typeof getJob>>>;
export type GetJobQueryError = ErrorType<unknown>;
/**
 * @summary Get job details
 */
export declare function useGetJob<TData = Awaited<ReturnType<typeof getJob>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getJob>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update a job
 */
export declare const getUpdateJobUrl: (id: number) => string;
export declare const updateJob: (id: number, createJobBody: CreateJobBody, options?: RequestInit) => Promise<Job>;
export declare const getUpdateJobMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateJob>>, TError, {
        id: number;
        data: BodyType<CreateJobBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateJob>>, TError, {
    id: number;
    data: BodyType<CreateJobBody>;
}, TContext>;
export type UpdateJobMutationResult = NonNullable<Awaited<ReturnType<typeof updateJob>>>;
export type UpdateJobMutationBody = BodyType<CreateJobBody>;
export type UpdateJobMutationError = ErrorType<unknown>;
/**
 * @summary Update a job
 */
export declare const useUpdateJob: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateJob>>, TError, {
        id: number;
        data: BodyType<CreateJobBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateJob>>, TError, {
    id: number;
    data: BodyType<CreateJobBody>;
}, TContext>;
/**
 * @summary Delete a job
 */
export declare const getDeleteJobUrl: (id: number) => string;
export declare const deleteJob: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteJobMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteJob>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteJob>>, TError, {
    id: number;
}, TContext>;
export type DeleteJobMutationResult = NonNullable<Awaited<ReturnType<typeof deleteJob>>>;
export type DeleteJobMutationError = ErrorType<unknown>;
/**
 * @summary Delete a job
 */
export declare const useDeleteJob: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteJob>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteJob>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary List all reminders
 */
export declare const getListRemindersUrl: () => string;
export declare const listReminders: (options?: RequestInit) => Promise<Reminder[]>;
export declare const getListRemindersQueryKey: () => readonly ["/api/reminders"];
export declare const getListRemindersQueryOptions: <TData = Awaited<ReturnType<typeof listReminders>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listReminders>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listReminders>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListRemindersQueryResult = NonNullable<Awaited<ReturnType<typeof listReminders>>>;
export type ListRemindersQueryError = ErrorType<unknown>;
/**
 * @summary List all reminders
 */
export declare function useListReminders<TData = Awaited<ReturnType<typeof listReminders>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listReminders>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a reminder
 */
export declare const getCreateReminderUrl: () => string;
export declare const createReminder: (createReminderBody: CreateReminderBody, options?: RequestInit) => Promise<Reminder>;
export declare const getCreateReminderMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createReminder>>, TError, {
        data: BodyType<CreateReminderBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createReminder>>, TError, {
    data: BodyType<CreateReminderBody>;
}, TContext>;
export type CreateReminderMutationResult = NonNullable<Awaited<ReturnType<typeof createReminder>>>;
export type CreateReminderMutationBody = BodyType<CreateReminderBody>;
export type CreateReminderMutationError = ErrorType<unknown>;
/**
 * @summary Create a reminder
 */
export declare const useCreateReminder: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createReminder>>, TError, {
        data: BodyType<CreateReminderBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createReminder>>, TError, {
    data: BodyType<CreateReminderBody>;
}, TContext>;
/**
 * @summary Update a reminder
 */
export declare const getUpdateReminderUrl: (id: number) => string;
export declare const updateReminder: (id: number, createReminderBody: CreateReminderBody, options?: RequestInit) => Promise<Reminder>;
export declare const getUpdateReminderMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateReminder>>, TError, {
        id: number;
        data: BodyType<CreateReminderBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateReminder>>, TError, {
    id: number;
    data: BodyType<CreateReminderBody>;
}, TContext>;
export type UpdateReminderMutationResult = NonNullable<Awaited<ReturnType<typeof updateReminder>>>;
export type UpdateReminderMutationBody = BodyType<CreateReminderBody>;
export type UpdateReminderMutationError = ErrorType<unknown>;
/**
 * @summary Update a reminder
 */
export declare const useUpdateReminder: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateReminder>>, TError, {
        id: number;
        data: BodyType<CreateReminderBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateReminder>>, TError, {
    id: number;
    data: BodyType<CreateReminderBody>;
}, TContext>;
/**
 * @summary Delete a reminder
 */
export declare const getDeleteReminderUrl: (id: number) => string;
export declare const deleteReminder: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteReminderMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteReminder>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteReminder>>, TError, {
    id: number;
}, TContext>;
export type DeleteReminderMutationResult = NonNullable<Awaited<ReturnType<typeof deleteReminder>>>;
export type DeleteReminderMutationError = ErrorType<unknown>;
/**
 * @summary Delete a reminder
 */
export declare const useDeleteReminder: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteReminder>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteReminder>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Get dashboard summary stats
 */
export declare const getGetDashboardSummaryUrl: () => string;
export declare const getDashboardSummary: (options?: RequestInit) => Promise<DashboardSummary>;
export declare const getGetDashboardSummaryQueryKey: () => readonly ["/api/dashboard/summary"];
export declare const getGetDashboardSummaryQueryOptions: <TData = Awaited<ReturnType<typeof getDashboardSummary>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardSummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getDashboardSummary>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetDashboardSummaryQueryResult = NonNullable<Awaited<ReturnType<typeof getDashboardSummary>>>;
export type GetDashboardSummaryQueryError = ErrorType<unknown>;
/**
 * @summary Get dashboard summary stats
 */
export declare function useGetDashboardSummary<TData = Awaited<ReturnType<typeof getDashboardSummary>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardSummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get most common skills from job descriptions
 */
export declare const getGetTopSkillsUrl: () => string;
export declare const getTopSkills: (options?: RequestInit) => Promise<SkillFrequency[]>;
export declare const getGetTopSkillsQueryKey: () => readonly ["/api/dashboard/top-skills"];
export declare const getGetTopSkillsQueryOptions: <TData = Awaited<ReturnType<typeof getTopSkills>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTopSkills>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getTopSkills>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetTopSkillsQueryResult = NonNullable<Awaited<ReturnType<typeof getTopSkills>>>;
export type GetTopSkillsQueryError = ErrorType<unknown>;
/**
 * @summary Get most common skills from job descriptions
 */
export declare function useGetTopSkills<TData = Awaited<ReturnType<typeof getTopSkills>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTopSkills>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Recent activity across all sections
 */
export declare const getGetRecentActivityUrl: () => string;
export declare const getRecentActivity: (options?: RequestInit) => Promise<ActivityItem[]>;
export declare const getGetRecentActivityQueryKey: () => readonly ["/api/dashboard/recent-activity"];
export declare const getGetRecentActivityQueryOptions: <TData = Awaited<ReturnType<typeof getRecentActivity>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRecentActivity>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getRecentActivity>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetRecentActivityQueryResult = NonNullable<Awaited<ReturnType<typeof getRecentActivity>>>;
export type GetRecentActivityQueryError = ErrorType<unknown>;
/**
 * @summary Recent activity across all sections
 */
export declare function useGetRecentActivity<TData = Awaited<ReturnType<typeof getRecentActivity>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRecentActivity>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export {};
//# sourceMappingURL=api.d.ts.map