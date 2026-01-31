export type UserId = string
export type TaskId = string

export type Deadline = {
    dateISO: string | null
}

export type Task = {
    id: TaskId
    title: string
    assigneeId: UserId | null
    deadline: Deadline
    parentId: TaskId | null
    children: TaskId[]
    dependsOn: TaskId[]
    position: { x: number; y: number }
    // Used for conflict resolution across clients. Newer updates should win.
    updatedAt: number
    expanded?: boolean
    done?: boolean
    memo?: string
}

export type User = {
    id: UserId
    name: string
    color: string
    avatarUrl?: string
}

export type Graph = {
    tasks: Record<TaskId, Task>
    users: Record<UserId, User>
    rootTaskIds: TaskId[]
}

export type CreateTaskInput = Partial<Pick<Task, 'title' | 'assigneeId' | 'deadline'>> & {
    parentId?: TaskId | null
}


