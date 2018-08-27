// @flow

export type TransitionType = 'Success' | 'Error' | 'Complete'

export interface CanvasPoint {
    x: number;
    y: number
}

export interface TaskInterface {
    name: string;
    action: string;

    coord: CanvasPoint;
}

export interface TaskRefInterface {
    workflow?: string;
    name: string;
}

export interface TransitionInterface {
    from: TaskRefInterface;
    to: TaskRefInterface;
    type?: TransitionType;
    condition?: string;
}

export interface TransitionRefInterface {
    from: TaskRefInterface;
    to: TaskRefInterface;
}

export interface ModelInterface {
    +version: number;
    +description: string;
    +tasks: Array<TaskInterface>;
    +transitions: Array<TransitionInterface>;

    constructor(yaml: string): void;
    toYAML(): string;

    addTask(opts: TaskInterface): void;
    updateTask(ref: TaskRefInterface, opts: TaskInterface): void;
    deleteTask(ref: TaskRefInterface): void;

    addTransition(opts: TransitionInterface): void;
    updateTransition(ref: TransitionRefInterface, opts: TransitionInterface): void;
    deleteTransition(ref: TransitionRefInterface): void;
}